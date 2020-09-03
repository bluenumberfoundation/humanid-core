'use strict'

const
    APIError = require('../server/api_error'),
    Constants = require('../constants'),
    crypto = require('crypto'),
    nanoId = require('nanoid'),
    {Op} = require("sequelize");

const
    BaseService = require('./base')

const
    SERVER_CRED_TYPE = 1,
    MOBILE_SDK_CRED_TYPE = 2,
    WEB_LOGIN_CRED_TYPE = 3


class AuthService extends BaseService {
    constructor(services, args) {
        super('Auth', services, args)

        this.generateExchangeId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+", 24)

        this._exchangeToken = {
            aesKey: this.config.EXCHANGE_TOKEN_AES_KEY,
            lifetime: this.config.EXCHANGE_TOKEN_LIFETIME
        }
    }

    async authClient(credential, scope) {
        // Get client id and client secret
        const {clientId, clientSecret} = credential

        // Find by client id
        const {AppCredential} = this.models
        const appCred = await AppCredential.findOne({
            where: {clientId}
        })

        // If credential not found, throw unauthorized
        if (!appCred) {
            throw new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED)
        }

        // if client secret does not match, throw unauthorized
        if (appCred.clientSecret !== clientSecret) {
            throw new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED)
        }

        // If scope is invalid, throw forbidden
        let valid = this.validateCredType(scope, appCred.credentialTypeId)
        if (!valid) {
            throw new APIError(Constants.RESPONSE_ERROR_FORBIDDEN)
        }

        return {
            appId: appCred.appId,
            appExtId: appCred.appExtId,
            appCredential: credential,
            environmentId: appCred.environmentId,
        }
    }

    validateCredType(scope, credentialTypeId) {
        if (scope === Constants.AUTH_SCOPE_SERVER && credentialTypeId === SERVER_CRED_TYPE) {
            return true
        } else if (scope === Constants.AUTH_SCOPE_MOBILE && credentialTypeId === MOBILE_SDK_CRED_TYPE) {
            return true
        } else if (scope === Constants.AUTH_SCOPE_WEB_LOGIN && credentialTypeId === WEB_LOGIN_CRED_TYPE) {
            return true
        }
        return false
    }

    async validateExchangeToken(exchangeToken) {
        // Get references
        const {UserExchangeSession, AppUser} = this.models
        const {dateUtil} = this.components

        // extract exchange id and encrypted payload
        const exchangeId = exchangeToken.slice(0, 24);
        const encryptedPayload = exchangeToken.slice(25, exchangeToken.length);

        // Get exchange session by external id
        const session = await UserExchangeSession.findOne({
            where: {extId: exchangeId},
            include: [{model: AppUser, as: 'appUser'}],
        })

        // Validate session existence
        if (!session) {
            this.logger.debug("Invalid session: session not found")
            throw new APIError("ERR_1")
        }

        // Validate expiry
        if (dateUtil.compare(new Date(), session.expiredAt) === dateUtil.GREATER_THAN) {
            throw new APIError("ERR_2")
        }

        // Decrypt token
        let payload
        try {
            payload = this.decryptAES(encryptedPayload, session.iv)
        } catch (e) {
            this.logger.error(`ERROR: unable to decrypt exchange token. Error=${e}`)
            throw new APIError("ERR_1")
        }

        // Get app user
        const appUser = session['appUser']

        // Validate payload
        if (payload.exchangeId !== exchangeId ||
            payload.appId !== appUser.appId ||
            payload.extId !== appUser.extId) {
            this.logger.debug(`Invalid payload with exchange session. Payload = ${JSON.stringify(payload)}`)
            throw new APIError("ERR_1")
        }

        // Get app access status
        if (!appUser) {
            this.logger.error("Invalid session: appUser not found")
            throw new APIError("ERR_1")
        }

        // Validate access status
        if (appUser.accessStatusId !== Constants.APP_ACCESS_GRANTED) {
            throw new APIError('ERR_7')
        }

        // Clear exchange token
        await this.clearExchangeToken(session.id, new Date())

        return {
            appUserId: appUser.extId
        }
    }

    async clearExchangeToken(id, t) {
        const {UserExchangeSession} = this.models

        // Delete session
        let count = await UserExchangeSession.destroy({
            where: {id: id}
        })
        this.logger.debug(`Deleted exchange session: ${count}`)

        // Clear dangling expired exchange token
        count = await UserExchangeSession.destroy({
            where: {expiredAt: {[Op.lte]: t}}
        })
        this.logger.debug(`Deleted dangling exchange session: ${count}`)
    }

    async createExchangeToken(appUser) {
        // Get references
        const {dateUtil} = this.components
        const {UserExchangeSession} = this.models

        // Generate exchange id
        const exchangeId = this.generateExchangeId()

        // Create expired at
        const timestamp = new Date()
        const expiredAt = dateUtil.addSecond(timestamp, this._exchangeToken.lifetime)

        // Create AES IV
        const iv = crypto.randomBytes(16);

        // Persist exchange token
        await UserExchangeSession.create({
            extId: exchangeId,
            appUserId: appUser.id,
            iv: iv.toString('hex'),
            expiredAt: expiredAt,
            createdAt: timestamp
        })

        // Create payload
        const payload = {
            exchangeId: exchangeId,
            appId: appUser.appId,
            extId: appUser.extId,
            expiredAt: dateUtil.toEpoch(expiredAt)
        }

        // Encrypt
        let token = this.encryptAES(payload, iv)
        return `${exchangeId}/${token}`
    }

    encryptAES(payload, iv) {
        const key = Buffer.from(this._exchangeToken.aesKey, 'hex')
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
        const payloadStr = JSON.stringify(payload)
        let encrypted = cipher.update(payloadStr)
        encrypted = Buffer.concat([encrypted, cipher.final()])
        return encrypted.toString('base64')
    }

    decryptAES(encrypted, iv) {
        const key = Buffer.from(this._exchangeToken.aesKey, 'hex')
        iv = Buffer.from(iv, 'hex')
        let encryptedBuf = Buffer.from(encrypted, 'base64')
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        let decrypted = decipher.update(encryptedBuf)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        const jsonStr = decrypted.toString()
        return JSON.parse(jsonStr)
    }
}

module.exports = AuthService