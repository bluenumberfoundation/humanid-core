'use strict'

const Constants = require("../constants")

class Middlewares {
    constructor({components, services, server, logger}) {
        this.components = components
        this.services = services
        this.logger = logger
        this.server = server

        this.authClientServer = this.server.handleAsync(async (req, res, next) => {
            // Get credential
            const cred = this.getClientCredential(req)

            // Call validation service
            req.client = await this.services.Auth.authClient(cred, Constants.AUTH_SCOPE_SERVER)

            next()
        })

        this.authClientMobile = this.server.handleAsync(async (req, res, next) => {
            // Get credential
            const cred = this.getClientCredential(req)

            // Call validation service
            req.client = await this.services.Auth.authClient(cred, Constants.AUTH_SCOPE_MOBILE)

            next()
        })
    }

    getClientCredential(req) {
        // Get parameter
        const cred = {
            clientId: req.headers['client-id'],
            clientSecret: req.headers['client-secret']
        }

        // Validate credential
        this.components.common.validateReq({
            clientId: 'required',
            clientSecret: 'required'
        }, cred)

        return cred
    }
}

module.exports = Middlewares