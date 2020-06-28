'use strict'

const BaseController = require('./base'),
	cors = require('cors'),	
	cookieParser = require('cookie-parser'),
	router = require('express').Router()

class WebController extends BaseController {
	constructor(models, common, nexmo) {
		super(models)		

		// apply cors
		router.use(cors((req, callback) => {			
			if (req.body.appId) {
				console.log('Request origin: ', req.header('Origin'))
				models.LegacyApp.findByPk(req.body.appId).then((app) => {
					let urls = app.urls ? app.urls.split(',') : null
					let whitelisted = !urls || urls.indexOf(req.header('Origin')) !== -1
					callback(null, {origin: whitelisted})
				})
			} else {
				// allow to pass, let invalid appId be validated in request handler
				callback(null, {origin: true})
			}
		}))

		// cookie parser
		router.use(cookieParser())

		/**
		 * @apiIgnore WIP
		 * @api {post} /web/users/login Login
		 * @apiName Login
		 * @apiGroup Web
		 * @apiDescription Attempt to login by phone number. If not authorized, request confirmation based on <code>type</code>:
		 * <p>1. <code>app</code>: Send login push notification to one of mobile app: <code>{"type": "WEB_LOGIN_REQUEST", "requestingAppId": "APP_ID"}</code> where <code>type</code> always be <code>WEB_LOGIN_REQUEST</code>, and <code>requestingAppId</code> is the ID of the app that requests login</p>
		 * <p>2. <code>otp</code>: Send SMS containing OTP code to phone number (if already registered)</p>
		 *
		 * @apiParam {String} [type] Auth type <code>{'app','otp'}</code>. Default: <code>'app'</code>
		 * @apiParam {String} countryCode User mobile phone country code (eg. 62 for Indonesia)
		 * @apiParam {String} phone User mobile phone number
		 * @apiParam {String} [verificationCode] User phone number verification code (OTP)
		 * @apiParam {String} appId Partner app ID
		 * @apiParam {String} appSecret Partner app secret
		 *
		 * @apiSuccess (202) {String} appId Partner app ID
		 * @apiSuccess (202) {String} sessionId session ID
		 * @apiSuccess (202) {String} status <code>PENDING</code>
		 * 
		 * @apiSuccess (200) {String} appId Partner app ID
		 * @apiSuccess (200) {String} sessionId session ID
		 * @apiSuccess (200) {String} status <code>CONFIRMED</code>
		 * 
		 */
		router.post('/users/login', async (req, res, next) => {
			let body = req.body
			let error = this.validate({
				type: 'in:app,otp',
				countryCode: 'required', 
				phone: 'required', 
				appId: 'required', 
				appSecret: 'required', 
			}, body)
			
			if (error) {
				return res.status(400).send(error)
			}
			
			// validate credentials
			let user = null
			let app = null
			try {
				let hash = common.hmac(common.combinePhone(body.countryCode, body.phone))
				user = await models.LegacyUser.findOne({
					where: {hash: hash},
					include: [{
						model: models.LegacyAppUser,
						include: {
							model: models.LegacyApp,
							as: 'app',
						}
					}]
				})
				if (!user) throw new Error(`Account not found: (${body.countryCode}) ${body.phone}`)
				app = await this.validateAppCredentials(body.appId, body.appSecret)
			} catch (e) {
				// console.error(e)
				return res.status(401).send(e.message)
			}

			// generate new sessionId					
			let sessionId = req.cookies.sessionId
			if (!sessionId) {
				let phoneHash = common.combinePhone(body.countryCode, body.phone)
				sessionId = common.hmac(`${app.id}_${phoneHash}_${Date.now()}`)
			}

			// handle existing confirmation (checking status)
			let confirmationData = {
				type: models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST,
				appId: app.id,
				userId: user.id,
				status: models.LegacyConfirmation.StatusCode.PENDING,
				updatedAt: new Date(),
				messageId: null,
				sessionId: sessionId,
			}
			let confirmation = null
			try {
				confirmation = await models.LegacyConfirmation.findOne({
					where: {
						type: confirmationData.type,
						appId: app.id,
						userId: user.id,
					}
				})

				if (confirmation) {
					let lastCheck = new Date() - confirmation.updatedAt
					// if different sessionID or rejected
					if (confirmation.sessionId !== confirmationData.sessionId
						|| confirmation.status === models.LegacyConfirmation.StatusCode.REJECTED) {
						// delete confirmation to allow requesting again
						await confirmation.destroy()
						confirmation = null
					} else if (confirmation.status === models.LegacyConfirmation.StatusCode.PENDING) {
						if (lastCheck > common.config.CONFIRMATION_EXPIRY_MS) {
							// if expired
							// delete confirmation to allow requesting again
							await confirmation.destroy()
							confirmation = null
						} else {
							// not yet expired
							res.cookie('sessionId', confirmationData.sessionId, {httpOnly: true})
							return res.status(202).send(confirmation)
						}
					} else if (confirmation.status === models.LegacyConfirmation.StatusCode.CONFIRMED) {
						// set sessionId cookie
						res.cookie('sessionId', confirmationData.sessionId, {httpOnly: true})
						return res.status(200).send(confirmation)
					}
				}
			} catch (e) {
				return res.status(500).send(e.message)
			}

			// handle new or expired authorization request

			let authType = body.type ? body.type.toLowerCase() : 'app'
			if (authType === 'otp') {
				confirmationData.messageId = 'OTP'
				// request OTP
				if (!body.verificationCode) {
					try {
						await nexmo.sendVerificationSMS(body.countryCode, body.phone)
						confirmationData.status = models.LegacyConfirmation.StatusCode.PENDING
						confirmation = await models.LegacyConfirmation.create(confirmationData)
						return res.status(202).send(confirmation)
					} catch (error) {
						return res.status(500).send(error.message)
					}
				} 
				// verify OTP
				else {
					try {
						await nexmo.checkVerificationSMS(body.countryCode, body.phone, body.verificationCode)
						confirmationData.status = models.LegacyConfirmation.StatusCode.CONFIRMED
						confirmation = await models.LegacyConfirmation.create(confirmationData)
						res.cookie('sessionId', confirmationData.sessionId, {httpOnly: true})
						return res.send(confirmation)
					} catch (error) {
						let status = error.name === 'ValidationError' ? 400 : 500
						return res.status(status).send(error.message)
					}
				}

			} else { // authType === 'app'

				// try to send notif to an app
				// iterate all available apps until successful
				// or no more app
				let i = 0
				let results = []
				while (!confirmationData.messageId && i < user.AppUsers.length) {
					let appUser = user.AppUsers[i] 
					try {
						// get server key based on platform
						let serverKey = common.config.FIREBASE_SERVER_KEY
						if (appUser.app.platform === models.LegacyApp.PlatformCode.ANDROID) {
							serverKey = appUser.app.serverKey
						} // else models.LegacyApp.PlatformCode.IOS use common.config.FIREBASE_SERVER_KEY

						// validate or send push notif
						if (!serverKey) {
							throw new Error('Missing server key')
						} else if (!appUser.notifId) {
							throw new Error('Missing notifId')
						} else {
							confirmationData.messageId = await common.pushNotif({
								to: appUser.notifId,
								data: {
									title: 'Web Login Request',
									body: 'Please confirm web login request',
									type: confirmationData.type,
									requestingAppId: confirmationData.appId,
									updatedAt: confirmationData.updatedAt.toISOString(),
								},
							}, serverKey)
							results.push({
								appId: appUser.appId,
								platform: appUser.app.platform,
								success: true,
								reason: null
							})
						}
					} catch (e) {
						results.push({appId: appUser.appId, platform: appUser.app.platform, success: false, reason: `Push notif failed: ${e.message}`})
					} finally {
						i++
					}        
				}

				// message not sent
				if (!confirmationData.messageId) {
					console.error(results)
					return res.status(500).send({results: results})
				}
				try {
					// create confirmation object
					confirmation = await models.LegacyConfirmation.create(confirmationData)
					// set sessionId cookie
					res.cookie('sessionId', confirmation.sessionId, {httpOnly: true})
					return res.status(202).send(confirmation)
				} catch (e) {
					return res.status(500).send(e.message)
				}

			}
		})

		/**
		 * @apiIgnore WIP
		 * @api {get} /web/users/status Status
		 * @apiName Status
		 * @apiGroup Web
		 * @apiDescription Check login status by <code>sessionId</code> from server-side/backend
		 *
		 * @apiParam {String} sessionId Obtained from login response
		 * @apiParam {String} appId Partner app ID
		 * @apiParam {String} appSecret Partner app secret
		 *
		 * @apiSuccess (200) {String} appId Partner app ID
		 * @apiSuccess (200) {String} sessionId session ID
		 * @apiSuccess (200) {String} status <code>CONFIRMED</code>
		 *
		 * @apiSuccess (202) {String} appId Partner app ID
		 * @apiSuccess (202) {String} sessionId session ID
		 * @apiSuccess (202) {String} status <code>PENDING</code>
		 *
		 */
		router.get('/users/status', async (req, res, next) => {
			let body = req.query
			let error = this.validate({
				sessionId: 'required', 
				appId: 'required', 
				appSecret: 'required', 
			}, body)
			
			if (error) {
				return res.status(400).send(error)
			}

			// validate credentials
			let app = null
			try {
				app = await this.validateAppCredentials(body.appId, body.appSecret)
			} catch (err) {
				return res.status(401).send(err.message)
			}

			// validate sessionId
			let confirmation = null
			try {
				confirmation = await models.LegacyConfirmation.findOne({
					where: {
						type: models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST,
						appId: app.id,
						sessionId: body.sessionId
					}
				})

				if (!confirmation) {
					return res.status(401).send('Invalid sessionId')
				} else {
					return res.send(confirmation)
				}
			} catch (err) {
				return res.status(500).send(err.message)
			}
		})

		/**
		 * @apiIgnore WIP
		 * @api {post} /web/users/logout Logout
		 * @apiName Logout
		 * @apiGroup Web
		 * @apiDescription Revoke web login session
		 *
		 * @apiParam {String} sessionId Obtained from login response
		 * @apiParam {String} appId Partner app ID
		 * @apiParam {String} appSecret Partner app secret
		 *
		 */
		router.post('/users/logout', async (req, res, next) => {
			let body = req.body
			let error = this.validate({
				sessionId: 'required', 
				appId: 'required', 
				appSecret: 'required', 
			}, body)
			if (error) {
				return res.status(400).send(error)
			}
				
			let app = null
			try {
				app = await this.validateAppCredentials(body.appId, body.appSecret)
			} catch (e) {
				// console.error(e)
				return res.status(401).send(e.message)
			}

			// validate confirmation
			let confirmation = null
			try {
				confirmation = await models.LegacyConfirmation.findOne({
					where: {
						type: models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST,
						appId: app.id,
						sessionId: body.sessionId,
					}
				})

				let code = 204
				let msg = null
				if (!confirmation) {
					code = 401
					msg = 'Invalid session'
				} else {
					// valid. delete confirmation
					await confirmation.destroy()
					// clear cookie
					res.clearCookie('sessionId', {httpOnly: true})
				}
				return res.status(code).send(msg)
			} catch (e) {
				return res.status(500).send(e.message)
			}			
		})

		/**
		 * @apiIgnore WIP
		 * @api {post} /web/users/confirm Confirm
		 * @apiName Confirm
		 * @apiGroup Mobile
		 * @apiDescription Confirm web login
		 *
		 * @apiParam {String} hash User hash (unique authentication code) of confirming app
		 * @apiParam {String} requestingAppId App ID that requests confirmation
		 * @apiParam {String} [type] Confirmation type eg. <code>WEB_LOGIN_REQUEST</code>
		 * @apiParam {String} appId Partner app ID
		 * @apiParam {String} appSecret Partner app secret
		 *
		 * @apiSuccess {String} id Confirmation ID
		 * @apiSuccess {String} appId Requesting App ID
		 * @apiSuccess {String} type Confirmation type
		 * @apiSuccess {String} confirmingAppId Confirming App ID
		 * @apiSuccess {String} status
		 * 
		 */
		router.post('/users/confirm', async (req, res, next) => {
			try {
				return this.updateLoginConfirmation(models.LegacyConfirmation.StatusCode.CONFIRMED, req, res)
			} catch (e) {
				return res.status(500).send(e.message)
			}
		})

		/**
		 * @apiIgnore WIP
		 * @api {post} /web/users/reject Reject
		 * @apiName Reject
		 * @apiGroup Mobile
		 * @apiDescription Reject or revoke web login
		 *
		 * @apiParam {String} hash User hash (unique authentication code) of confirming app
		 * @apiParam {String} requestingAppId App ID that requests confirmation
		 * @apiParam {String} [type] Confirmation type eg. <code>WEB_LOGIN_REQUEST</code>
		 * @apiParam {String} appId Partner app ID
		 * @apiParam {String} appSecret Partner app secret
		 *
		 * @apiSuccess {String} id Confirmation ID
		 * @apiSuccess {String} appId Requesting App ID
		 * @apiSuccess {String} type Confirmation type
		 * @apiSuccess {String} confirmingAppId Confirming App ID
		 * @apiSuccess {String} status
		 * 
		 */
		router.post('/users/reject', async (req, res, next) => {
			try {
				return this.updateLoginConfirmation(models.LegacyConfirmation.StatusCode.REJECTED, req, res)
			} catch (e) {
				return res.status(500).send(e.message)
			}			
		})

		this.router = router
	}

	// update login request confirmation
	async updateLoginConfirmation (status, req, res) {
		let body = req.body
		let error = this.validate({
			hash: 'required',
			requestingAppId: 'required',
			appId: 'required',
			appSecret: 'required',
		}, body)
		if (error) {
			return res.status(400).send(error)
		}

		// default to models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST
		body.type = body.type || this.models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST

		let appUser = null
		try {
			appUser = await this.validateAppUserCredentials(body.hash, body.appId, body.appSecret)
		} catch (e) {
			return res.status(401).send(e.message)
		}

		// find Confirmation
		let confirmation = null
		try {
			confirmation = await this.models.LegacyConfirmation.findOne({
				where: {
					type: body.type,
					appId: body.requestingAppId,
					userId: appUser.userId,
				}
			})
			if (!confirmation) {
				return res.status(404).send('Confirmation not found')
			}
			if (confirmation.status === status) {
				return res.status(403).send(`Already ${status}`)
			} else {
				// update Confirmation status
				confirmation.status = status
				await confirmation.save()
			}
			return res.send(confirmation)
		} catch (e) {
			return res.status(500).send(e.message)
		}    
	}

}

module.exports = WebController