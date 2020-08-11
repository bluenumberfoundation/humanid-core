'use strict'

const BaseController = require('./base'),
    express = require('express'),
    APIError = require('../server/api_error')

class MobileController extends BaseController {
    constructor(args) {
        super(args.models, args)

        // Create child logger
        this.logger = args.logger.child({scope: 'Core.MobileAPI'})

        // Init routing
        this.route()
    }

    route = () => {
        // Init router
        const router = express.Router()

        router.post('/users/login/request-otp', this.middlewares.authClientMobile, this.handleRESTAsync(
            async (req) => {
                // Validate request body
                let {body} = req
                this.validate({
                    countryCode: 'required',
                    phone: 'required',
                }, body)

                // Get localization parameters from query, language code must be in ISO 639-1
                const language = req.query['lang'] || 'en'

                // Send Verification via SMS
                const result = await this.services.User.requestLoginOTP(body.countryCode, body.phone, {
                    appId: req.client.appId,
                    environmentId: req.client.environmentId,
                    language: language
                })

                return {
                    data: result
                }
            }))

        router.post('/users/login', this.middlewares.authClientMobile, this.handleRESTAsync(
            async (req) => {
                // Validate body
                const {body} = req
                this.validate({
                    countryCode: 'required',
                    phone: 'required',
                    deviceId: 'required',
                    verificationCode: 'required'
                }, body)

                // Set appId
                body.appId = req.client.appId

                // Call login service
                return await this.services.User.login(body)
            }))

        router.put('/users/revoke-access', this.middlewares.authClientMobile, this.handleRESTAsync(
            async (req) => {
                // Get body
                let {body} = req

                // Validate payload
                this.validate({userHash: 'required'}, body)

                // Call revoke service
                await this.services.User.revokeAccess({
                    legacyAppsId: req.client.legacyAppsId,
                    legacyUserHash: body.userHash
                })

                return {}
            }))

        /**
         * @apiIgnore WIP
         * @api {get} /mobile/users/login Validate App User Access
         * @apiName ValidateAppUserAccess
         * @apiGroup Core.MobileAPI
         * @apiDescription Check if partner app is granted access to user data
         *
         * @apiUse AppCredentialParam
         * @apiUse UserCredentialParam
         *
         * @apiUse SuccessResponse
         * @apiUse OkResponseExample
         *
         * @apiUse ErrorResponse
         */
        router.get('/users/login',
            [this.handleValidateAppCred, this.handleValidateAppUserCred], this.handleCheckAppUserAccess)

        /**
         * @apiIgnore WIP
         * @api {post} /mobile/users/login Login by Existing Access
         * @apiName LoginByExistingAccess
         * @apiGroup Core.MobileAPI
         * @apiDescription Login to new partner app using existing access
         *
         * @apiUse AppCredentialParam
         * @apiParam {String} existingAppId Partner app id that is used to authorized login
         * @apiParam {String} existingUserHash User identifier on existing Partner app
         * @apiParam {String} deviceId User device identifier
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Response data
         * @apiSuccess {String} data.exchangeToken TODO: Token that can be used by Partner app server to verify if a user has been authorized by humanId
         * @apiSuccess {String} data.userHash User identifier for Partner app
         * @apiSuccessExample {json} SuccessResponse:
         *   {
         *     "success": true,
         *     "code": "OK",
         *     "message": "Success",
         *     "data": {
         *       "exchangeToken": "<EXCHANGE_TOKEN>",
         *       "userHash": "<USER_HASH>"
         *     }
         *   }
         *
         * @apiUse ErrorResponse
         */
        router.post('/users/login', this.handleValidateAppCred, this.handleLogin)

        /**
         * @apiIgnore WIP
         * @api {put} /mobile/users Update FCM Notification Id
         * @apiName UpdateNotificationId
         * @apiGroup Core.MobileAPI
         * @apiDescription Update notif ID
         *
         * @apiUse AppCredentialParam
         * @apiUse UserCredentialParam
         * @apiParam {String} notifId Push notif ID
         *
         * @apiUse SuccessResponse
         * @apiUse OkResponseExample
         *
         * @apiUse ErrorResponse
         */
        router.put('/users',
            [this.handleValidateAppCred, this.handleValidateAppUserCred], this.handleUpdate)

        // Set router
        this.router = router
    }

    handleLogin = this.handleRESTAsync(async (req) => {
        // Validate body
        let body = req.body
        this.validate({
            existingUserHash: 'required',
            existingAppId: 'required',
            deviceId: 'required'
        }, body)

        // Get new appId and appSecret
        const {appId, appSecret, deviceId} = body

        // Get existing app user
        let existingAppUser = await this.models.LegacyAppUser.findOne({
            where: {hash: body.existingUserHash, appId: body.existingAppId},
        })

        // If not found, throw error
        if (!existingAppUser) {
            throw new APIError("ERR_7")
        }

        // Validate new appId with existing
        if (appId === existingAppUser.appId) {
            throw new APIError("ERR_8")
        }

        // Validate device id
        if (deviceId !== existingAppUser.deviceId) {
            throw new APIError("ERR_9")
        }

        // Register to new app
        let newAppUserHash = this.components.common.hmac(appSecret + existingAppUser.userId)
        let newAppUser = await this.models.LegacyAppUser.findOrCreate({
            where: {appId: appId, hash: newAppUserHash},
            defaults: {
                appId: appId,
                userId: existingAppUser.userId,
                hash: newAppUserHash,
                deviceId: existingAppUser.deviceId,
            }
        })
        newAppUser = newAppUser[0]

        // TODO: Returns exchangeToken
        return {
            data: {
                exchangeToken: '',
                userHash: newAppUser.hash
            }
        }
    })

    handleCheckAppUserAccess = this.handleRESTAsync(async () => {
        return {}
    })

    handleUpdate = this.handleRESTAsync(async (req) => {
        // Validate body
        let body = req.body
        this.validate({notifId: 'required'}, body)

        // Update user
        await this.models.LegacyAppUser.update({
            notifId: body.notifId
        }, {
            where: {hash: body.userHash}
        })

        return {}
    })

    handleValidateAppCred = this.handleAsync(async (req, res, next) => {
        // Get method
        const {method} = req

        // Get payload by method
        let payload
        if (method.toUpperCase() === "GET") {
            // If request method is GET, get payload from query
            payload = req.query
        } else {
            // Else, get payload from request body
            payload = req.body
        }

        // Validate payload
        this.validate({appId: 'required', appSecret: 'required'}, payload)

        // Count app by app id and secret
        const {appId, appSecret} = payload
        const {LegacyApp: App} = this.models
        const count = await App.count({
            where: {id: appId, secret: appSecret}
        })

        if (count !== 1) {
            throw new APIError('ERR_4')
        }

        next()
    })

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

    handleValidateAppUserCred = this.handleAsync(async (req, res, next) => {
        // Get method
        const {method} = req

        // Get payload by method
        let payload
        if (method.toUpperCase() === "GET") {
            // If request method is GET, get payload from query
            payload = req.query
        } else {
            // Else, get payload from request body
            payload = req.body
        }

        // Validate payload
        this.validate({appId: 'required', userHash: 'required'}, payload)

        // Get payload
        const {appId, userHash} = payload

        // Get access status
        const accessStatus = await this.getAppsAccessStatus(appId, userHash)

        // Validate access status
        if (accessStatus !== "GRANTED") {
            throw new APIError("ERR_7")
        }

        next()
    })
}

module.exports = MobileController