'use strict'

const
    _ = require('lodash'),
    crypto = require('crypto'),
    nanoId = require('nanoid'),
    argon2 = require('argon2')

const
    APIError = require('../server/api_error'),
    Constants = require("../constants")

const
    BaseService = require('./base')

const
    Localization = require('../server/localization')

const
    USER_STATUS_VERIFIED = 2,
    HASH_ID_FORMAT_VERSION = 1,
    OTP_RULE = {
        otpSessionLifetime: 300,
        otpCountLimit: 3,
        failAttemptLimit: 5,
        nextResendDelay: 60,
        otpCodeLength: 4
    },
    OWNER_UNKNOWN = 'UNKNOWN',
    AWS_SMS_PROVIDER = 1,
    SMS_TRX_SUCCESS = 1,
    SMS_TRX_FAILED = 2

class UserService extends BaseService {
    constructor(services, args) {
        super('User', services, args)

        // Init nano id generator for
        this.generateOTPCode = nanoId.customAlphabet("0123456789", OTP_RULE.otpCodeLength)
        this.generateOTPReqId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 24)
        this.generateAppUserExtId = nanoId.customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 20)
    }

    async logEvent(appId, {userFingerprint, eventName, metadata}) {
        // Get references
        const {App, UserEventLog} = this.models

        // Find app
        const app = await App.findByPk(appId)
        if (!app) {
            throw new Error('App not found')
        }

        // Normalize metadata
        if (!metadata) {
            metadata = {}
        } else if (!_.isObject(metadata)) {
            metadata = {
                'str': String(metadata)
            }
        }

        // Create user event log
        await UserEventLog.create({
            ownerId: app.ownerId,
            appId: app.id,
            appSnapshot: {
                id: app.id,
                ownerEntityTypeId: app.ownerEntityTypeId,
                ownerId: app.ownerId,
                extId: app.extId,
                logoFile: app.logoFile,
                appStatusId: app.appStatusId,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt
            },
            userFingerprint: userFingerprint,
            eventName: eventName,
            metadata: metadata,
            createdAt: new Date()
        })
    }

    // getHashId generate user hash id
    getHashId(phoneNo) {
        // Get config
        const salt1 = this.config.HASH_ID_SALT_1
        const salt2 = this.config.HASH_ID_SALT_2
        const secret = this.config.HASH_ID_SECRET
        const repeat = this.config.HASH_ID_REPEAT

        // Create a hashed sha-512 phone number
        const raw = salt1 + phoneNo + salt2
        let hash = crypto.createHmac('sha512', secret).update(raw).digest('hex')

        // Repeat hashing
        for (let i = 0; i < repeat; i++) {
            // If even, use salt2, otherwise use salt1
            let raw
            if (i % 2 === 0) {
                raw = hash + salt2
            } else {
                raw = salt1 + hash
            }

            // update hash
            hash = crypto.createHmac('sha512', secret).update(raw).digest('hex')
        }

        return hash
    }

    async getOTPSession(hashId, timestamp) {
        // Get model reference
        const {UserOTPSession, UserOTP} = this.models
        const {dateUtil} = this.components

        // Calculate expired at epoch
        const expiredAt = dateUtil.addSecond(timestamp, OTP_RULE.otpSessionLifetime)

        // Generate request id
        const requestId = this.generateOTPReqId()

        // Create default object
        const defaultSession = {
            userHashId: hashId,
            requestId: requestId,
            rule: OTP_RULE,
            otpCount: 0,
            failAttemptCount: 0,
            expiredAt: expiredAt,
            createdAt: timestamp,
            updatedAt: timestamp,
        }

        // Find or create session
        let session = await UserOTPSession.findOrCreate({
            where: {userHashId: hashId},
            defaults: defaultSession
        })

        session = session[0]

        // Check session if expired or not
        if (dateUtil.compare(timestamp, session.expiredAt) === dateUtil.GREATER_THAN) {
            // Delete existing session
            await this.clearOTPSession(session.id)
            // Create a new session
            session = await UserOTPSession.create(defaultSession)
        }

        return session
    }

    validateNewOTP(session) {
        // Get references
        const {dateUtil} = this.components

        // Get rule
        const rule = session.rule

        // If rule not set, session is invalid
        if (!rule) {
            throw new APIError('ERR_11')
        }

        // If otp count reach limit, throw error
        if (session.otpCount >= rule.otpCountLimit) {
            throw new APIError('ERR_12')
        }

        // If fail attempt count reach limit, throw error
        if (session.failAttemptCount >= rule.failAttemptLimit) {
            throw new APIError('ERR_13')
        }

        // If not reach resend delay, throw error
        if (session.otpCount > 0 &&
            dateUtil.compare(new Date(), session.nextResendAt) === dateUtil.LESS_THAN) {
            throw new APIError('ERR_14')
        }
    }

    async createOTP(session, timestamp) {
        // Get references
        const {dateUtil} = this.components
        const {UserOTPSession, UserOTP} = this.models

        // Generate OTP Code
        const code = this.generateOTPCode()

        // Create signature
        const signature = await argon2.hash(code)

        // Set otp count
        const otpCount = session.otpCount + 1

        // Update session
        const nextResendAt = dateUtil.addSecond(timestamp, OTP_RULE.nextResendDelay)

        // Persist
        const tx = await UserOTP.sequelize.transaction()
        try {
            // Insert otp
            await UserOTP.create({
                sessionId: session.id,
                otpNo: otpCount,
                signature: signature,
                metadata: {},
                createdAt: timestamp
            }, {
                transaction: tx
            })

            // Update otp session
            const count = await UserOTPSession.update({
                otpCount: otpCount,
                nextResendAt: nextResendAt,
                updatedAt: timestamp,
                version: session.version + 1
            }, {
                where: {id: session.id},
                transaction: tx
            })

            if (count === 0) {
                throw new Error("failed to update otp session")
            }
            await tx.commit()
        } catch (error) {
            await tx.rollback()
            throw error
        }

        return {
            otpCount: otpCount,
            failAttemptCount: session.failAttemptCount,
            code: code,
            requestId: session.requestId,
            nextResendAt: dateUtil.toEpoch(nextResendAt)
        }
    }

    async logSmsTrx(metadata) {
        // Extract metadata
        const {appId, providerSnapshot, targetCountry, statusId, trxSnapshot, timestamp} = metadata

        // Get references
        const {App, SMSTransaction, SMSTransactionLog} = this.models

        // Get app snapshot
        const appSnapshot = {}
        try {
            const app = await App.findByPk(appId)

            if (!app) {
                throw new Error("App not found")
            }

            appSnapshot.app = app
        } catch (e) {
            this.logger.error(`Error while getting app snapshot. Metadata = ${JSON.stringify(metadata)}, Error = ${e.message}`)
            // Set fallback app snapshot
            appSnapshot.app = {
                id: 0,
                ownerId: OWNER_UNKNOWN
            }
        }

        // Create transaction history
        const trx = {
            ownerId: appSnapshot.app.ownerId,
            appId: appSnapshot.app.id,
            appSnapshot: appSnapshot,
            providerId: providerSnapshot.sms.id,
            providerSnapshot: providerSnapshot,
            targetCountry: targetCountry,
            statusId: statusId,
            trxSnapshot: trxSnapshot,
            createdAt: timestamp,
            updatedAt: timestamp,
            version: 1
        }

        // Create log
        const trxLog = {
            changelog: {
                created: true
            },
            statusId: trx.statusId,
            trxSnapshot: trx.trxSnapshot,
            updatedAt: trx.updatedAt,
            version: trx.version
        }

        // Persist log
        const tx = await SMSTransaction.sequelize.transaction()
        try {
            // Insert sms transaction
            const newTrx = await SMSTransaction.create(trx, {transaction: tx})

            // Set transaction id in log
            trxLog.id = newTrx.id

            // Insert log
            await SMSTransactionLog.create(trxLog, {transaction: tx})

            // Commit
            await tx.commit()
        } catch (err) {
            this.logger.error(`Failed to persist SMS Transaction Log. Metadata = ${JSON.stringify(metadata)}, Error = ${err.message}`)
            await tx.rollback()
            throw err
        }
    }

    switchProviderByCountry(country) {
        let provider, options
        switch (country) {
            case 'IN':
                provider = this.components.smsAWS
                options = {
                    region: 'ap-south-1'
                }
                break
            default:
                provider = this.components.smsVonage
                options = {
                    countryCode: country
                }
        }

        return {
            provider: provider,
            options: options
        }
    }

    async sendSms(phone, message, metadata) {
        // Switch provider by country code
        const {provider, options} = this.switchProviderByCountry(metadata.country)

        // Call sms request
        let providerTrxSnapshot = {}
        try {
            providerTrxSnapshot = await provider.sendSms({
                phoneNo: phone,
                message: message
            }, options)
        } catch (err) {
            this.logger.error(`Failed to send SMS. ${err.message}`)
            providerTrxSnapshot.status = SMS_TRX_FAILED
            providerTrxSnapshot.error = err
        }


        // TODO: Store transaction log async
        // Store transaction log
        await this.logSmsTrx({
            appId: metadata.appId,
            providerSnapshot: {sms: provider.getProviderSnapshot()},
            targetCountry: metadata.country || "-",
            statusId: providerTrxSnapshot.status,
            trxSnapshot: {provider: providerTrxSnapshot},
            timestamp: new Date()
        })
    }

    getRequestOTPMessage(language, otpCode) {
        // Get message by language
        let msg = Localization.OTP_REQUEST_MESSAGE[language]

        // If localization not found, or not properly formatted, then reset to default
        if (!msg || (msg.indexOf('{OTP_CODE}') === -1)) {
            // Get default language in english
            msg = Localization.OTP_REQUEST_MESSAGE['en']
        }

        return msg.replace('{OTP_CODE}', otpCode)
    }

    async requestLoginOTP(inputCountryCode, inputPhoneNo, option) {
        // Parse phone number input
        const phone = this.components.common.parsePhoneNo(inputCountryCode, inputPhoneNo)

        // Get hash id
        const hashId = this.getHashId(phone.number)

        // Get session
        const session = await this.getOTPSession(hashId, new Date())

        // Validate session against rules
        this.validateNewOTP(session)

        // Create otp
        const otp = await this.createOTP(session, new Date())

        // Determine sandbox
        let devUser
        if (option && option['environmentId'] === Constants.ENV_DEVELOPMENT) {
            // Check if phone number is registered or not
            const {App} = this.services
            devUser = await App.getSandboxDevUser(option.appId, phone.number)
        }

        if (devUser) {
            // Persist OTP
            const {UserOTPSandbox} = this.models
            await UserOTPSandbox.create({
                sessionId: session.id,
                devUserId: devUser.id,
                otpCode: otp.code,
                createdAt: new Date(),
                expiredAt: session.expiredAt
            })
        } else {
            // Get localized message
            const smsMessage = this.getRequestOTPMessage(option.language, otp.code)

            // Send otp
            await this.sendSms(phone.number, smsMessage, {
                country: phone.country,
                appId: option.appId
            })
        }

        return {
            requestId: otp.requestId,
            nextResendAt: otp.nextResendAt,
            failAttemptCount: otp.failAttemptCount,
            otpCount: otp.otpCount,
            config: OTP_RULE
        }
    }

    async login(payload) {
        // Get references
        const {User, AppUser} = this.models

        // Parse phone number input
        const phone = this.components.common.parsePhoneNo(payload.countryCode, payload.phone)

        // Get hash id
        const hashId = this.getHashId(phone.number)

        // Verify code
        await this.verifyOtpCode(hashId, payload.verificationCode)

        // Init timestamp
        const timestamp = new Date()

        // Get user, if user not found create a new one
        let user = await User.findOrCreate({
            where: {hashId: hashId},
            defaults: {
                hashId: hashId,
                hashIdVersion: 1,
                hashIdFormatVersion: HASH_ID_FORMAT_VERSION,
                countryCode: phone.country,
                userStatusId: USER_STATUS_VERIFIED,
                lastVerifiedAt: timestamp,
                createdAt: timestamp,
                updatedAt: timestamp
            }
        })
        user = user[0]

        // Register user to the app
        const userId = user.id
        const appId = payload.appId
        let appUser = await AppUser.findOrCreate({
            where: {appId: appId, userId: userId},
            defaults: {
                appId: appId,
                userId: userId,
                extId: this.generateAppUserExtId(),
                accessStatusId: Constants.APP_ACCESS_GRANTED,
                createdAt: timestamp,
                updatedAt: timestamp
            }
        })
        appUser = appUser[0]

        // Create exchange token
        const exchangeToken = await this.services.Auth.createExchangeToken(appUser)

        // Persist lastVerifiedAt timestamp
        const lastVerifiedAt = new Date()
        await User.update({
            lastVerifiedAt: lastVerifiedAt,
            updatedAt: lastVerifiedAt
        }, {
            where: {id: userId}
        })

        return {
            data: {
                exchangeToken
            }
        }
    }

    async revokeAccess(opt) {
        // Get apps access status
        const accessStatus = await this.getAppsAccessStatus(opt.legacyAppsId, opt.legacyUserHash)
        if (accessStatus !== "GRANTED") {
            throw new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED)
        }

        // Delete row
        const {LegacyAppUser: AppUser} = this.models
        const count = await AppUser.destroy({
            where: {
                appId: opt.legacyAppsId,
                hash: opt.legacyUserHash
            }
        })

        this.logger.debug(`DeletedRowCount=${count}`)
    }

    async verifyOtpCode(hashId, verificationCode) {
        // Get references
        const {dateUtil} = this.components
        const {UserOTPSession, UserOTP} = this.models

        // Get session
        const session = await UserOTPSession.findOne({
            where: {userHashId: hashId},
            include: [{model: UserOTP, as: 'otps'}],
            order: [['otps', 'otpNo', 'DESC']]
        })

        // Validate session exist
        if (!session) {
            throw new APIError("ERR_11")
        }

        // Validate session expired
        if (dateUtil.compare(new Date(), session.expiredAt) === dateUtil.GREATER_THAN) {
            throw new APIError("ERR_15")
        }

        // Validate failed attempt count
        if (session.failAttemptCount >= session.rule.failAttemptLimit) {
            throw new APIError("ERR_13")
        }

        // Validate otp list exist
        const otpList = session['otps']
        const otpCount = otpList.length
        if (!otpList || otpCount === 0) {
            throw new APIError("ERR_11")
        }

        // Iterate validation
        let valid
        for (let i = 0; i < otpCount; i++) {
            const otp = otpList[i]
            try {
                if (await argon2.verify(otp.signature, verificationCode)) {
                    valid = true
                    break
                }
            } catch (err) {
                this.logger.error(`Failed to verify OTP. OTP No = ${otp.otpNo}`)
            }
        }

        // If invalid, throw error
        if (!valid) {
            session.failAttemptCount += 1
            session.updatedAt = new Date()
            session.version += 1
            await session.save()

            // Throw error
            throw new APIError("ERR_5")
        }

        // Clear otp session
        await this.clearOTPSession(session.id)
    }

    async clearOTPSession(id) {
        // Get references
        const {UserOTP, UserOTPSession, UserOTPSandbox} = this.models

        // Clear otp session
        const tx = await UserOTP.sequelize.transaction()
        try {
            // Delete existing session
            let count = await UserOTP.destroy({where: {sessionId: id}})
            if (count === 0) {
                throw new Error("no UserOTP rows deleted")
            }

            count = await UserOTPSandbox.destroy({where: {sessionId: id}})
            this.logger.debug(`UserOTPSandbox rows deleted count = ${count}`)

            count = await UserOTPSession.destroy({where: {id: id}})
            if (count === 0) {
                throw new Error("no UserOTPSession rows deleted")
            }
            await tx.commit()
        } catch (err) {
            this.logger.error(`Failed to clear OTP Session. Error = ${err.toString()}`)
            await tx.rollback()
            throw err
        }
    }

    async getAppsAccessStatus(appId, userHash) {
        // Count user by id and hash
        const {LegacyAppUser: AppUser} = this.models
        const count = await AppUser.count({
            where: {appId: appId, hash: userHash}
        })

        if (count === 1) {
            return "GRANTED"
        }

        return "DENIED"
    }
}

module.exports = UserService