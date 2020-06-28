'use strict'

/**
 * @apiDefine MobileClientCredential
 * @apiHeader (Request Header) {String} client-id Client ID for Mobile SDK
 * @apiHeader (Request Header) {String} client-secret Client Secret for Mobile SDK
 */

// ----------

/**
 * @api {post} /mobile/users/verifyPhone Request Login OTP via SMS
 * @apiVersion 0.0.1
 * @apiName RequestLoginOtp
 * @apiGroup Core.MobileAPI
 * @apiDescription Trigger send OTP code via SMS
 *
 * @apiUse AppCredentialParam
 * @apiParam {String} countryCode User mobile phone country code (eg. 62 for Indonesia)
 * @apiParam {String} phone User mobile phone number
 *
 * @apiUse SuccessResponse
 * @apiUse OkResponseExample
 *
 * @apiUse ErrorResponse
 */

/**
 * @api {post} /mobile/users/login/request-otp Login: Request OTP
 * @apiVersion 0.0.2
 * @apiName RequestLoginOtp
 * @apiGroup Core.MobileAPI
 * @apiDescription Trigger send OTP code via SMS
 *
 * @apiUse MobileClientCredential
 * @apiParam {String} countryCode User mobile phone country code (eg. 62 for Indonesia)
 * @apiParam {String} phone User mobile phone number
 *
 * @apiUse SuccessResponse
 * @apiUse OkResponseExample
 *
 * @apiUse ErrorResponse
 */

/**
 * @api {post} /mobile/users/login/request-otp Login: Request OTP
 * @apiVersion 0.0.3
 * @apiName RequestLoginOtp
 * @apiGroup Core.MobileAPI
 * @apiDescription Trigger send OTP code via SMS
 *
 * @apiUse MobileClientCredential
 * @apiParam {String} countryCode User mobile phone country code (eg. 62 for Indonesia)
 * @apiParam {String} phone User mobile phone number
 *
 * @apiUse SuccessResponse
 * @apiSuccess {Object} data Response data
 * @apiSuccess {String} data.requestId OTP Request ID
 * @apiSuccess {String} data.nextResendAt Timestamp in Unix Epoch that indicates when resend OTP is allowed
 * @apiSuccess {String} data.failAttemptCount Failed verification input counter
 * @apiSuccess {String} data.otpCount Resend counter
 * @apiSuccess {Object} data.config OTP Configuration
 * @apiSuccess {Object} data.config.otpSessionLifetime OTP Session lifetime in second
 * @apiSuccess {Object} data.config.otpCountLimit Resend limit
 * @apiSuccess {Object} data.config.failAttemptLimit Failed verification attempt limit
 * @apiSuccess {Object} data.config.nextResendDelay OTP allowed resend delay in second
 * @apiSuccess {Object} data.config.otpCodeLength OTP Code Length
 * @apiSuccessExample {json} SuccessResponse:
 *   {
 *     "success": true,
 *     "code": "OK",
 *     "message": "Success",
 *     "data": {
 *         "requestId": "E9NETW9R34Z0S3OVHK6NMDYA",
 *         "nextResendAt": 1593003113,
 *         "failAttemptCount": 0,
 *         "otpCount": 1,
 *         "config": {
 *             "otpSessionLifetime": 300,
 *             "otpCountLimit": 3,
 *             "failAttemptLimit": 5,
 *             "nextResendDelay": 60,
 *             "otpCodeLength": 4
 *         }
 *     }
 * }
 *
 *
 * @apiUse ErrorResponse
 */

// ----------

/**
 * @api {post} /mobile/users/register Login
 * @apiVersion 0.0.1
 * @apiName LoginByOtp
 * @apiGroup Core.MobileAPI
 * @apiDescription Login by with given OTP code
 * If user has not yet granted access to app, a new AppUser will be created
 *
 * @apiUse AppCredentialParam
 * @apiParam {String} countryCode User mobile phone country code (eg. 62 for Indonesia)
 * @apiParam {String} phone User mobile phone number
 * @apiParam {String} deviceId User device ID
 * @apiParam {String} verificationCode User phone number verification code (OTP)
 * @apiParam {String} notifId Push notif ID
 *
 * @apiUse SuccessResponse
 * @apiSuccess {Object} data Response data
 * @apiSuccess {String} data.exchangeToken Token that can be used by Partner app server to verify if a user has been authorized by humanId
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

/**
 * @api {post} /mobile/users/login Login
 * @apiVersion 0.0.3
 * @apiName LoginByOtp
 * @apiGroup Core.MobileAPI
 * @apiDescription Login by with given OTP code
 * If user has not yet granted access to app, a new AppUser will be created
 *
 * @apiUse MobileClientCredential
 * @apiParam {String} countryCode User mobile phone country code (eg. 62 for Indonesia)
 * @apiParam {String} phone User mobile phone number
 * @apiParam {number} deviceTypeId Device Type ID (1 = Android, 2 = iOS)
 * @apiParam {String} deviceId User device ID
 * @apiParam {String} verificationCode User phone number verification code (OTP)
 * @apiParam {String} notifId Push notif ID
 *
 * @apiUse SuccessResponse
 * @apiSuccess {Object} data Response data
 * @apiSuccess {String} data.exchangeToken Token that can be used by Partner app server to verify if a user has been authorized by humanId
 * @apiSuccessExample {json} SuccessResponse:
 *   {
 *     "success": true,
 *     "code": "OK",
 *     "message": "Success",
 *     "data": {
 *       "exchangeToken": "<EXCHANGE_TOKEN>"
 *     }
 *   }
 *
 * @apiUse ErrorResponse
 */

// ----------

/**
 * @api {post} /mobile/users/revokeAccess Revoke App Access
 * @apiVersion 0.0.1
 * @apiName RevokeAppAccess
 * @apiGroup Core.MobileAPI
 * @apiDescription Revoke Partner App access to User data
 *
 * @apiUse AppCredentialParam
 * @apiUse UserCredentialParam
 *
 * @apiUse SuccessResponse
 * @apiUse OkResponseExample
 *
 * @apiUse ErrorResponse
 */

/**
 * @api {post} /mobile/users/revoke-access Revoke App Access
 * @apiVersion 0.0.2
 * @apiName RevokeAppAccess
 * @apiGroup Core.MobileAPI
 * @apiDescription Revoke Partner App access to User data
 *
 * @apiUse MobileClientCredential
 * @apiUse UserCredentialParam
 *
 * @apiUse SuccessResponse
 * @apiUse OkResponseExample
 *
 * @apiUse ErrorResponse
 */