'use strict'

/**
 * @apiDefine ServerClientCredential
 * @apiHeader (Request Header) {String} client-id Client ID for Server API
 * @apiHeader (Request Header) {String} client-secret Client Secret for Server API
 */

// ----------

/**
 * @api {post} /mobile/users/verifyExchangeToken Verify Exchange Token
 * @apiVersion 0.0.1
 * @apiName VerifyExchangeToken
 * @apiGroup Core.ServerAPI
 * @apiDescription Host-to-host API for Partner App Server to retrieve user hash
 *
 * @apiUse AppCredentialParam
 * @apiParam {String} exchangeToken Token that can be used by Partner app server to verify if a user has been authorized by humanId
 *
 * @apiUse SuccessResponse
 * @apiSuccess {Object} data Response data
 * @apiSuccess {String} data.userHash User identifier for Partner app
 * @apiSuccessExample {json} SuccessResponse:
 *   {
 *     "success": true,
 *     "code": "OK",
 *     "message": "Success",
 *     "data": {
 *       "userHash": "<USER_HASH>"
 *     }
 *   }
 *
 * @apiUse ErrorResponse
 */

/**
 * @api {post} /server/users/verifyExchangeToken Verify Exchange Token
 * @apiVersion 0.0.2
 * @apiName VerifyExchangeToken
 * @apiGroup Core.ServerAPI
 * @apiDescription Host-to-host API for Partner App Server to retrieve user hash
 *
 * @apiUse ServerClientCredential
 * @apiParam {String} exchangeToken Token that can be used by Partner app server to verify if a user has been authorized by humanId
 *
 * @apiUse SuccessResponse
 * @apiSuccess {Object} data Response data
 * @apiSuccess {String} data.userAppId User identifier for Partner app
 * @apiSuccessExample {json} SuccessResponse:
 *   {
 *     "success": true,
 *     "code": "OK",
 *     "message": "Success",
 *     "data": {
 *       "userAppId": "<USER_APP_ID>"
 *     }
 *   }
 *
 * @apiUse ErrorResponse
 */

/**
 * @api {post} /server/users/exchange Verify Exchange Token
 * @apiVersion 0.0.3
 * @apiName VerifyExchangeToken
 * @apiGroup Core.ServerAPI
 * @apiDescription Host-to-host API for Partner App Server to retrieve user hash
 *
 * @apiUse ServerClientCredential
 * @apiParam {String} exchangeToken Token that can be used by Partner app server to verify if a user has been authorized by humanId
 *
 * @apiUse SuccessResponse
 * @apiSuccess {Object} data Response data
 * @apiSuccess {String} data.appUserId User identifier for Partner app
 * @apiSuccessExample {json} SuccessResponse:
 *   {
 *     "success": true,
 *     "code": "OK",
 *     "message": "Success",
 *     "data": {
 *       "appUserId": "<APP_USER_ID>"
 *     }
 *   }
 *
 * @apiUse ErrorResponse
 */