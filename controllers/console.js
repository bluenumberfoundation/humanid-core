'use strict'

const BaseController = require('./base'),
    express = require('express'),
    APIError = require('../server/api_error'),
    Constants = require('../constants'),
    multer = require('multer'),
    path = require('path')

class ConsoleController extends BaseController {
    constructor(args) {
        super(args.models, args)

        // Create child logger
        this.logger = args.logger.child({scope: 'Core.ConsoleAPI'})

        // Init uploader to temporary directory
        this.tempDir = path.join(this.config.WORK_DIR, '/storage/temp')
        this.upload = multer({
            dest: this.tempDir,
            fileFilter: function (req, file, cb) {
                // TODO: read by detecting mime types and content types header
                const ext = path.extname(file.originalname);
                if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
                    return cb(new APIError('ERR_30'))
                }
                cb(null, true)
            }
        }).single('logo')

        // Route
        this.route()
    }

    route() {
        this.router = express.Router()

        this.router.get('/apps', this.handleConsoleAuth, this.handleListApp)
        this.router.post('/apps', this.handleConsoleAuth, this.handleCreateApp)
        this.router.delete('/apps/:appExtId', this.handleConsoleAuth, this.handleDeleteApp)
        this.router.post('/apps/:appExtId/credentials', this.handleConsoleAuth, this.handleCreateAppCredential)
        this.router.get('/apps/:appExtId/credentials', this.handleConsoleAuth, this.handleListAppCredential)
        this.router.put('/apps/:appExtId/configurations', this.handleConsoleAuth, this.handleUpdateAppConfig)
        this.router.get('/apps/:appExtId', this.handleConsoleAuth, this.handleGetAppDetail)
        this.router.put('/apps/:appExtId/logo', [this.handleConsoleAuth], this.handlePutUploadAppLogo)
        this.router.delete('/apps/:appExtId/credentials/:clientId', this.handleConsoleAuth, this.handleDeleteAppCredential)
        this.router.put('/apps/:appExtId/credentials/:clientId/status', this.handleConsoleAuth, this.handleToggleAppCredentialStatus)
        this.router.post('/sandbox/dev-users', this.handleConsoleAuth, this.handleRegisterDevUser)
        this.router.get('/sandbox/dev-users', this.handleConsoleAuth, this.handleListDevUser)
        this.router.delete('/sandbox/dev-users/:extId', this.handleConsoleAuth, this.handleDeleteDevUser)
        this.router.get('/sandbox/otps', this.handleConsoleAuth, this.handleListSandboxOTPs)
    }

    uploadAsync = (req, res) => {
        return new Promise((resolve, reject) => {
            this.upload(req, res, err => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        switch (err.code) {
                            case 'LIMIT_FILE_SIZE': {
                                err = new APIError('ERR_31')
                                break
                            }
                        }
                    }
                    return reject(err)
                }

                return resolve()
            })
        })
    }

    handlePutUploadAppLogo = this.handleAsync(async (req, res) => {
        // Handle form data
        await this.uploadAsync(req, res)

        // Check if file uploaded
        if (!req.file) {
            this.logger.debug('logo file is required')
            throw new APIError(Constants.RESPONSE_ERROR_BAD_REQUEST)
        }

        // Get app id params
        const extId = req.params['appExtId']

        // Store logo file
        const result = await this.services.App.uploadLogo(extId, req.file)

        this.sendResponse(res, {
            data: result
        })
    })

    handleGetAppDetail = this.handleRESTAsync(async req => {
        const extId = req.params['appExtId']

        const app = await this.services.App.getAppDetail(extId)

        return {
            data: app
        }
    })

    handleDeleteDevUser = this.handleRESTAsync(async req => {
        const extId = req.params['extId']

        const {App} = this.services
        await App.deleteSandboxDevUser(extId)

        return {}
    })

    handleListSandboxOTPs = this.handleRESTAsync(async req => {
        const reqBody = {
            skip: parseInt(req.query['skip'], 10) || 0,
            limit: parseInt(req.query['limit'], 10) || 10,
            ownerEntityTypeId: parseInt(req.query['ownerEntityTypeId'], 0) || 0,
            ownerId: req.query['ownerId']
        }

        this.validate({
            ownerEntityTypeId: 'required',
            ownerId: 'required'
        }, reqBody)

        const {App} = this.services
        const result = await App.listSandboxOTPs(reqBody)

        return {
            data: result
        }
    })

    handleUpdateAppConfig = this.handleRESTAsync(async req => {
        // Get request parameters
        const payload = req.body
        const appExtId = req.params['appExtId']

        const {App} = this.services
        await App.updateConfig(appExtId, payload)

        return {}
    })

    handleListDevUser = this.handleRESTAsync(async req => {
        const reqBody = {
            skip: parseInt(req.query['skip'], 10) || 0,
            limit: parseInt(req.query['limit'], 10) || 10,
            ownerEntityTypeId: parseInt(req.query['ownerEntityTypeId'], 0) || 0,
            ownerId: req.query['ownerId']
        }

        this.validate({
            ownerEntityTypeId: 'required',
            ownerId: 'required'
        }, reqBody)

        const {App} = this.services
        const result = await App.listSandboxDevUsers(reqBody)

        return {
            data: result
        }
    })

    handleRegisterDevUser = this.handleRESTAsync(async req => {
        const body = req.body
        this.validate({
            ownerEntityTypeId: 'required',
            ownerId: 'required',
            countryCode: 'required',
            phone: 'required'
        }, body)

        // Register dev user
        await this.services.App.registerDevUser({
            ownerEntityTypeId: body.ownerEntityTypeId,
            ownerId: body.ownerId,
            inputCountryCode: body.countryCode,
            inputPhoneNo: body.phone
        })

        return {}
    })

    handleCreateApp = this.handleRESTAsync(async req => {
        // Validate request
        const body = req.body
        this.validate({
            ownerEntityTypeId: 'required',
            ownerId: 'required',
            name: 'required'
        }, body)

        // Create app
        const result = await this.services.App.create(body)

        return {
            data: {
                id: result.extId
            }
        }
    })

    handleCreateAppCredential = this.handleRESTAsync(async req => {
        // Validate request
        const body = req.body
        this.validate({
            credentialTypeId: 'required'
        }, body)

        // Get app external id
        const appExtId = req.params['appExtId']

        // Create app
        const result = await this.services.App.createCredential(appExtId, body)

        return {
            data: {
                environmentId: result.environmentId,
                credentialTypeId: result.credentialTypeId,
                name: result.name,
                clientId: result.clientId,
                clientSecret: result.clientSecret,
                options: result.options,
                credentialStatusId: result.credentialStatusId,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt
            }
        }
    })

    handleListAppCredential = this.handleRESTAsync(async req => {
        // Get pagination from query
        const skip = parseInt(req.query['skip'], 10) || 0
        const limit = parseInt(req.query['limit'], 10) || 10
        const appExtId = req.params['appExtId']

        const result = await this.services.App.listCredential(appExtId, skip, limit)

        return {
            data: result
        }
    })

    handleListApp = this.handleRESTAsync(async req => {
        // Get pagination from query
        const skip = parseInt(req.query['skip'], 10) || 0
        const limit = parseInt(req.query['limit'], 10) || 10
        const filters = {
            ownerId: req.query['filterOwnerId']
        }

        const result = await this.services.App.list(skip, limit, filters)

        return {
            data: result
        }
    })

    handleDeleteApp = this.handleRESTAsync(async req => {
        const appExtId = req.params['appExtId']

        await this.services.App.delete(appExtId)

        return {}
    })

    handleDeleteAppCredential = this.handleRESTAsync(async req => {
        const appExtId = req.params['appExtId']
        const clientId = req.params['clientId']

        const result = await this.services.App.deleteCredential(appExtId, clientId)

        return {
            data: result
        }
    })

    handleToggleAppCredentialStatus = this.handleRESTAsync(async req => {
        const appExtId = req.params['appExtId']
        const clientId = req.params['clientId']

        const result = await this.services.App.toggleCredentialStatus(appExtId, clientId)

        return {
            data: result
        }
    })

    handleConsoleAuth = (req, res, next) => {
        // Get api key from header
        const apiKey = req.headers['x-api-key']

        // Validate
        if (apiKey !== this.config.DEV_CONSOLE_CLIENT_API_KEY) {
            this.sendErrorResponse(res, new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED))
            return
        }

        next()
    }
}

module.exports = ConsoleController