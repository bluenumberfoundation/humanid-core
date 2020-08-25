'use strict'

const BaseController = require('./base'),
    express = require('express')

class WebLoginController extends BaseController {
    constructor(args) {
        super(args.models, args)

        // Create child logger
        this.logger = args.logger.child({scope: 'Core.WebLoginAPI'})

        // Route
        this.route()
    }

    route() {
        this.router = express.Router()

        this.router.post('/sessions', this.middlewares.authClientWebLogin, this.handleRESTAsync(
            async req => {
                // Validate request
                const {body} = req
                this.validate({
                    requesterClientId: 'required',
                    requesterClientSecret: 'required'
                }, body)

                // Validate requester credentials
                const {App} = this.services
                const result = await App.requestWebLoginSession(body)

                return {
                    data: result
                }
            }
        ))
    }
}

module.exports = WebLoginController