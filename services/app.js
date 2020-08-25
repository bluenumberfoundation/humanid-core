'use strict'

const
    APIError = require('../server/api_error'),
    nanoId = require('nanoid'),
    crypto = require('crypto'),
    {QueryTypes} = require("sequelize"),
    jwt = require('jsonwebtoken')

const
    BaseService = require('./base'),
    Constants = require('../constants')

const
    APP_UNVERIFIED = 1

const
    OWNER_ENTITY_ORGANIZATION = 1

const
    SERVER_CRED_TYPE = 1,
    MOBILE_SDK_CRED_TYPE = 2,
    CRED_TYPE_TEXT = {
        1: 'Server Credential',
        2: 'Mobile Credential'
    },
    CRED_TYPE_PREFIX = {
        1: 'SERVER_',
        2: 'MOBILE_'
    }

const
    ENV_PRODUCTION = 1,
    ENV_DEVELOPMENT = 2,
    ENV_TEXT = {
        1: 'Production',
        2: 'Development'
    }

const
    CREDENTIAL_ACTIVE = 1,
    CREDENTIAL_INACTIVE = 2

const
    PLATFORM_ANDROID_SLUG = "android",
    PLATFORM_IOS_SLUG = "ios"

const
    ORG_REGISTERED_DEV_USER_LIMIT = 2

// Create core query
const
    FIND_SANDBOX_OTP_CORE_QUERY = "FROM UserOTPSandbox as otp " +
        "INNER JOIN OrgDevUser as devUser ON otp.devUserId = devUser.id " +
        "WHERE devUser.ownerEntityTypeId = $ownerEntityTypeId AND devUser.ownerId = $ownerId AND otp.expiredAt > $timestamp",
    FIND_SANDBOX_OTP_QUERY = "SELECT devUser.phoneNoMasked, otp.otpCode, otp.expiredAt, otp.createdAt " +
        FIND_SANDBOX_OTP_CORE_QUERY + " ORDER BY otp.createdAt DESC LIMIT $limit OFFSET $offset;",
    COUNT_SANDBOX_OTP_QUERY = `SELECT COUNT(*) as count ${FIND_SANDBOX_OTP_CORE_QUERY};`

class AppService extends BaseService {
    constructor(services, args) {
        super('App', services, args)

        this.generateExtId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 16)
        this.generateClientId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 22)
        this.generateClientSecret = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_.~", 64)
        this.generateDevUserExtId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 24)
        this.generateWebLoginSessionId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 64)
    }

    async validateWebLoginToken({token, purpose}) {
        // Verify jwt
        const {common} = this.components
        const jwtSecret = this.config['WEB_LOGIN_SESSION_SECRET']

        let payload
        try {
            payload = await common.verifyJWT(token, jwtSecret)
        } catch (e) {
            // TODO: Handle jwt error and Re-throw exception with APIError
            throw e
        }

        // Parse payload
        const clientId = payload.sub
        const sessionId = payload.jti

        // Find credentials by client id
        const {AppCredential, App} = this.models
        const appCred = await AppCredential.findOne({
            where: {clientId: clientId},
            include: [{model: App, as: 'app'}],
        })

        // If credential not found, throw error
        if (!appCred) {
            throw new APIError("ERR_26")
        }

        // Generate session signature
        const expectedSignature = this.signWebLoginPayload(sessionId, appCred.clientId, appCred.clientSecret, purpose)

        // Validate session signature
        if (expectedSignature !== payload.signature) {
            throw new APIError('ERR_27')
        }

        // Retrieve redirect url value
        const redirectUrl = this.getWebLoginRedirectUrl(appCred['app'])

        return {
            appId: appCred.appId,
            environmentId: appCred.environmentId,
            clientId: appCred.clientId,
            clientSecret: appCred.clientSecret,
            sessionId: sessionId,
            redirectUrl: redirectUrl
        }
    }

    getWebLoginRedirectUrl(app) {
        if (!app.config || !app.config['web']) {
            throw new APIError('ERR_28')
        }

        const redirectUrl = app.config['web'].redirectUrl

        if (!redirectUrl) {
            throw new APIError('ERR_28')
        }

        return redirectUrl
    }

    async requestWebLoginSession(args) {
        // Get client id and client secret
        const {partnerClientId: clientId, partnerClientSecret: clientSecret} = args

        // Find by client id
        const {AppCredential, App} = this.models
        const appCred = await AppCredential.findOne({
            where: {clientId},
            include: [{model: App, as: 'app'}],
        })

        // If credential not found, throw error
        if (!appCred) {
            throw new APIError("ERR_26")
        }

        // if client secret does not match, throw error
        if (appCred.clientSecret !== clientSecret) {
            throw new APIError("ERR_26")
        }

        // Generate session
        const session = this.createWebLoginSessionToken({
            clientId: clientId,
            clientSecret: clientSecret,
            purpose: Constants.WEB_LOGIN_SESSION_PURPOSE_REQUEST_LOGIN_OTP
        })

        // Resolve logo file url
        const app = appCred['app']

        let fileName
        if (!app.logoFile) {
            fileName = 'placeholder.png'
        } else {
            fileName = app.logoFile
        }

        const logoUrls = {
            thumbnail: this.config['ASSETS_URL'] + '/images/app-thumbnails/' + fileName
        }

        return {
            app: {
                name: app.name,
                logoUrls: logoUrls
            },
            session: session
        }
    }

    signWebLoginPayload(sessionId, clientId, clientSecret, purpose) {
        const salt = this.config['WEB_LOGIN_SESSION_SALT']
        const rawSignature = `${purpose}-${sessionId}-${clientId}-${salt}`
        return this.components.common.hmac(rawSignature, clientSecret)
    }

    createWebLoginSessionToken({clientId, clientSecret, purpose, sessionId, lifetime}) {
        // If session id is unset, then generate a new session id
        if (!sessionId) {
            sessionId = this.generateWebLoginSessionId()
        }

        // If lifetime is unset, then set default lifetime from config
        if (!lifetime) {
            lifetime = this.config['WEB_LOGIN_SESSION_LIFETIME']
        }

        // Sign credentials
        const signature = this.signWebLoginPayload(sessionId, clientId, clientSecret, purpose)

        // Create payload
        const payload = {
            purpose: purpose,
            signature: signature
        }

        // Calculate expiration
        const {dateUtil} = this.components
        const expiredAt = dateUtil.addSecond(new Date(), lifetime)

        // Create jwt
        const secret = this.config['WEB_LOGIN_SESSION_SECRET']
        const token = jwt.sign(payload, secret, {
            jwtid: sessionId,
            subject: clientId,
            expiresIn: `${lifetime}s`
        })

        return {
            purpose: purpose,
            token: token,
            expiredAt: dateUtil.toEpoch(expiredAt)
        }
    }

    async listSandboxOTPs({ownerEntityTypeId, ownerId, skip, limit}) {
        // Get data source reference
        const {UserOTPSandbox} = this.models
        const db = UserOTPSandbox.sequelize

        // Retrieve data
        const rows = await db.query(FIND_SANDBOX_OTP_QUERY, {
            bind: {
                ownerEntityTypeId: ownerEntityTypeId,
                ownerId: ownerId,
                timestamp: new Date(),
                offset: skip,
                limit: limit
            },
            type: QueryTypes.SELECT,
        })

        // Count all available records
        const countResult = await db.query(COUNT_SANDBOX_OTP_QUERY, {
            bind: {
                ownerEntityTypeId: ownerEntityTypeId,
                ownerId: ownerId,
                timestamp: new Date(),
            },
            type: QueryTypes.SELECT,
        })

        // Response data
        const respData = rows.map(item => {
            return {
                phoneNoMasked: item.phoneNoMasked,
                otpCode: item.otpCode,
                createdAt: item.createdAt,
            }
        })

        return {
            otps: respData,
            _metadata: {
                limit: limit,
                skip: skip,
                count: countResult[0].count
            }
        }
    }

    async getSandboxDevUser(appId, phoneNo) {
        const {App, OrgDevUser} = this.models

        // Get owner info
        const app = await App.findByPk(appId)
        if (!app) {
            throw new APIError('ERR_17')
        }

        // Get hash id
        const hashId = this.getDevPhoneHash(app.ownerEntityTypeId, app.ownerId, phoneNo)

        // Get dev user
        return OrgDevUser.findOne({where: {hashId: hashId}})
    }

    async deleteSandboxDevUser(extId) {
        // Get models
        const {OrgDevUser, UserOTPSandbox} = this.models

        // Get OrgDevUser
        const devUser = await OrgDevUser.findOne({where: {extId: extId}})
        if (!devUser) {
            throw new APIError("ERR_25")
        }

        // delete all otp related to user
        let count = await UserOTPSandbox.destroy({where: {devUserId: devUser.id}})
        this.logger.debug(`OrgDevUser deleted count = ${count}. devUserId = ${devUser.id}`)

        // delete user
        count = await OrgDevUser.destroy({where: {id: devUser.id}})
        this.logger.debug(`OrgDevUser deleted count = ${count}. devUserId = ${devUser.id}`)
    }

    async listSandboxDevUsers({ownerEntityTypeId, ownerId, skip, limit}) {
        // Get rows
        const {OrgDevUser} = this.models
        const result = await OrgDevUser.findAndCountAll({
            where: {
                ownerEntityTypeId: ownerEntityTypeId,
                ownerId: ownerId
            }, limit: limit, offset: skip
        })

        // Response data
        const respData = result.rows.map(item => {
            return {
                extId: item.extId,
                phoneNoMasked: item.phoneNoMasked,
                createdAt: item.createdAt,
            }
        })

        return {
            devUsers: respData,
            _metadata: {
                limit: limit,
                skip: skip,
                count: result.count
            }
        }
    }

    getDevPhoneHash(ownerEntityTypeId, ownerId, phoneNo) {
        // Get config
        const salt1 = this.config.HASH_ID_SALT_1
        const salt2 = this.config.HASH_ID_SALT_2
        const secret = this.config.HASH_ID_SECRET

        // Create a hashed sha-512 phone number
        const raw = salt2 + ownerEntityTypeId + phoneNo + ownerId + salt1
        return crypto.createHmac('sha512', secret).update(raw).digest('hex')
    }

    async registerDevUser({ownerEntityTypeId, ownerId, inputCountryCode, inputPhoneNo}) {
        // Count registered dev user
        const {OrgDevUser} = this.models
        const devUserCount = await OrgDevUser.count({
            where: {
                ownerEntityTypeId: ownerEntityTypeId,
                ownerId: ownerId
            }
        })

        // If registered count reach limit, then return error
        if (devUserCount >= ORG_REGISTERED_DEV_USER_LIMIT) {
            throw new APIError("ERR_23")
        }

        // Parse phone number
        const phone = this.components.common.parsePhoneNo(inputCountryCode, inputPhoneNo)
        const phoneNo = phone.number

        // Generate dev user hash id
        const hashId = this.getDevPhoneHash(ownerEntityTypeId, ownerId, phoneNo)

        // Search if exist
        const foundCount = await OrgDevUser.count({
            where: {
                hashId: hashId
            }
        })

        if (foundCount > 0) {
            throw new APIError("ERR_24")
        }

        // Get Country Code
        const countryCode = phone.countryCallingCode
        const maskedLen = phoneNo.length - 3 - countryCode.length

        // Create masked phone number
        const phoneNoMasked = "+" + countryCode + "X".repeat(maskedLen) + phoneNo.substr(-3)

        // Insert
        await OrgDevUser.create({
            extId: this.generateDevUserExtId(),
            ownerEntityTypeId: ownerEntityTypeId,
            ownerId: ownerId,
            hashId: hashId,
            phoneNoMasked: phoneNoMasked,
            createdAt: new Date()
        })
    }

    async create({ownerEntityTypeId, ownerId, name}) {
        // Validate ownerEntityTypeId
        if (ownerEntityTypeId !== OWNER_ENTITY_ORGANIZATION) {
            throw new APIError("ERR_16")
        }

        // Get model reference
        const {App} = this.models

        // Init timestamp
        const timestamp = new Date()

        // Insert app
        const result = await App.create({
            ownerEntityTypeId: ownerEntityTypeId,
            ownerId: ownerId,
            extId: this.generateExtId(),
            name: name,
            appStatusId: APP_UNVERIFIED,
            createdAt: timestamp,
            updatedAt: timestamp
        })

        return {
            id: result.id,
            extId: result.extId
        }
    }

    validatePlatform(platformSlug) {
        switch (platformSlug) {
            case PLATFORM_ANDROID_SLUG:
            case PLATFORM_IOS_SLUG:
                return true
            default:
                throw new APIError("ERR_20")
        }
    }

    getPlatformOptions(platformSlug, options) {
        let rules = {}
        switch (platformSlug) {
            case PLATFORM_ANDROID_SLUG:
                rules = {packageId: 'required'}
                break
            case PLATFORM_IOS_SLUG:
                rules = {bundleId: 'required'}
                break
            default:
                throw new APIError("ERR_21")
        }

        try {
            this.components.common.validateReq(rules, options)
        } catch (e) {
            throw new APIError("ERR_22")
        }

        switch (platformSlug) {
            case PLATFORM_ANDROID_SLUG:
                return {
                    platform: platformSlug,
                    packageId: options.packageId
                }

            case PLATFORM_IOS_SLUG:
                return {
                    platform: platformSlug,
                    bundleId: options.bundleId
                }

            default:
                return {}
        }
    }

    parseCredentialPlatformOption(payload) {
        // Get platform slug name
        const platformSlug = payload.platform

        // If platform is not set, then set
        if (!platformSlug) {
            throw new APIError("ERR_20")
        }

        // Validate platform slug name
        this.validatePlatform(platformSlug)

        // Get platform options
        const platformOpts = payload[platformSlug]
        if (!platformOpts) {
            throw new APIError("ERR_21")
        }

        return this.getPlatformOptions(platformSlug, platformOpts)
    }

    async createCredential(appExtId, payload) {
        // Get parameters
        let {environmentId, credentialTypeId, name} = payload

        // Validate credentialTypeId
        if (![SERVER_CRED_TYPE, MOBILE_SDK_CRED_TYPE].includes(credentialTypeId)) {
            throw new APIError("ERR_18")
        }

        // Set development env if unset
        if (![ENV_PRODUCTION, ENV_DEVELOPMENT].includes(environmentId)) {
            environmentId = ENV_DEVELOPMENT
        }

        // Get model reference
        const {AppCredential} = this.models

        // Validate app existence
        const app = await this.getApp(appExtId)

        // Set default name if unset
        if (!name) {
            name = `${app.name} ${CRED_TYPE_TEXT[credentialTypeId]} for ${ENV_TEXT[environmentId]}`
        }

        // Get options from payload
        let options = {}
        if (credentialTypeId === MOBILE_SDK_CRED_TYPE) {
            options = this.parseCredentialPlatformOption(payload['options'])
        }

        // Init timestamp
        const timestamp = new Date()

        // Create client id and secret
        const clientId = CRED_TYPE_PREFIX[credentialTypeId] + this.generateClientId()
        const clientSecret = this.generateClientSecret()

        // Create app
        return await AppCredential.create({
            appId: app.id,
            environmentId: environmentId,
            credentialTypeId: credentialTypeId,
            name: name,
            clientId: clientId,
            clientSecret: clientSecret,
            options: options,
            credentialStatusId: CREDENTIAL_ACTIVE,
            createdAt: timestamp,
            updatedAt: timestamp
        })
    }

    async listCredential(appExtId, skip, limit) {
        // Get app
        const app = await this.getApp(appExtId)

        // Get rows
        const {AppCredential} = this.models
        const result = await AppCredential.findAndCountAll({where: {appId: app.id}, limit: limit, offset: skip})

        // Compose response
        const credentialList = result.rows.map(item => {
            return {
                environmentId: item.environmentId,
                credentialTypeId: item.credentialTypeId,
                name: item.name,
                clientId: item.clientId,
                clientSecret: item.clientSecret,
                options: item.options,
                credentialStatusId: item.credentialStatusId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }
        })

        return {
            credentials: credentialList,
            _metadata: {
                limit: limit,
                skip: skip,
                count: result.count
            }
        }
    }

    async list(skip, limit, filters) {
        // Prepare where
        const whereFilter = {}
        if (filters.ownerId) {
            whereFilter.ownerId = filters.ownerId
        }

        // Get rows
        const {App} = this.models
        const result = await App.findAndCountAll({where: whereFilter, limit: limit, offset: skip})

        // Compose response
        const appsResp = result.rows.map(item => {
            return {
                extId: item.extId,
                ownerEntityTypeId: item.ownerEntityTypeId,
                ownerId: item.ownerId,
                name: item.name,
                logoFile: item.logoFile,
                appStatusId: item.appStatusId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }
        })

        return {
            apps: appsResp,
            _metadata: {
                limit: limit,
                skip: skip,
                count: result.count
            }
        }
    }

    async delete(appExtId) {
        // Get app
        const app = await this.getApp(appExtId)

        // Get connection from models
        const db = this.models.App.sequelize

        // delete all exchange session that is related to app id
        let result = await db.query("DELETE aus FROM AppUserSession aus INNER JOIN AppUser au on aus.appUserId = au.id WHERE au.appId = $appId;", {
            bind: {appId: app.id},
            type: QueryTypes.UPDATE
        })
        this.logger.debug(`AppUserSession deleted count = ${result[1]}. appId = ${app.id}`)

        // delete all user app session
        result = await db.query("DELETE ues FROM UserExchangeSession ues INNER JOIN AppUser au on ues.appUserId = au.id WHERE au.appId = $appId;", {
            bind: {appId: app.id},
            type: QueryTypes.UPDATE
        })
        this.logger.debug(`UserExchangeSession deleted count = ${result[1]}. appId = ${app.id}`)

        // delete all user that is related to app
        let count = await this.models.AppUser.destroy({where: {appId: app.id}})
        this.logger.debug(`AppUser deleted count = ${count}. appId = ${app.id}`)

        // delete all credential
        count = await this.models.AppCredential.destroy({where: {appId: app.id}})
        this.logger.debug(`AppCredential deleted count = ${count}. appId = ${app.id}`)

        // delete app
        count = await this.models.App.destroy({where: {id: app.id}})
        this.logger.debug(`App deleted count = ${count}. id = ${app.id}`)
    }

    async deleteCredential(appExtId, clientId) {
        // Get app
        const app = await this.getApp(appExtId)

        // Delete credential
        const count = await this.models.AppCredential.destroy({where: {appId: app.id, clientId: clientId}})

        return {
            deletedCount: count
        }
    }

    async toggleCredentialStatus(appExtId, clientId) {
        // Get app
        const app = await this.getApp(appExtId)

        // Get credential
        const credential = await this.models.AppCredential.findOne({where: {appId: app.id, clientId: clientId}})
        if (!credential) {
            throw new APIError('ERR_19')
        }

        // Determine status
        let updatedStatus
        if (credential.credentialStatusId === CREDENTIAL_INACTIVE) {
            updatedStatus = CREDENTIAL_ACTIVE
        } else {
            updatedStatus = CREDENTIAL_INACTIVE
        }

        // Update credential
        credential.credentialStatusId = updatedStatus
        credential.updatedAt = new Date()
        await credential.save()

        return {
            credentialStatusId: updatedStatus
        }
    }

    async getApp(appExtId) {
        // Validate app existence
        const app = await this.models.App.findOne({
            where: {extId: appExtId}
        })
        if (!app) {
            throw new APIError("ERR_17")
        }

        return app
    }
}

module.exports = AppService