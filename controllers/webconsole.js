'use strict'

const BaseController = require('./base'),
    router = require('express').Router(),
    bcrypt = require('bcryptjs')

class WebConsoleController extends BaseController {
    constructor(models, common, middlewares) {
        super(models)
        this.router = router
        this.middlewares = middlewares
        this.common = common
        this.hmac = common.hmac

        /**
         * @apiIgnore WIP
         * @api {post} /console/login Login
         * @apiName login
         * @apiGroup WebConsole
         *
         * @apiParam {String} email
         * @apiParam {String} password
         *
         * @apiSuccess {String} email
         * @apiSuccess {String} accessToken
         */
        this.router.post('/login', async (req, res, next) => {
            let body = req.body
            let error = this.validate({email: 'required', password: 'required'}, body)
            if (error) {
                return res.status(400).send(error)
            }
            const email = req.body.email
            const password = req.body.password
            try {
                let admin = await this.models.LegacyAdmin.findOne({
                    where: {email: email},
                })
                if (!admin) {
                    return res.status(400).send('Invalid credential')
                }
                let valid = await bcrypt.compare(password, admin.password)
                if (!valid) {
                    return res.status(400).send('Invalid credential')
                }
                let obj = admin.toJSON()
                obj.accessToken = this.common.createJWT(admin)
                return res.send(obj)
            } catch (e) {
                next(e)
            }
        })

        /**
         * @apiIgnore WIP
         * @api {post} /console/apps App registration
         * @apiName CreateApp
         * @apiGroup WebConsole
         * @apiDescription New (partner) app registration
         *
         * @apiHeader {String} Authorization <code>Bearer accessToken</code>
         *
         * @apiParam {String} appId Application ID
         *
         * @apiSuccess {String} id Application ID (must be unique 5-20 characters alphanumeric)
         * @apiSuccess {String} secret Secret code to invoke secured API
         * @apiSuccess {String} platform Platform <code>{'ANDROID', 'IOS'}</code>
         * @apiSuccess {String} [serverKey] Firebase Cloud Messaging Server Key
         * @apiSuccess {String} [urls] Whitelisted domain URLs for web client (comma-separated). Example: <code>https://foo.com,https://bar.com</code>
         */
        this.router.post('/apps', this.middlewares.verifyJWT, async (req, res, next) => {
            let body = req.body
            let error = this.validate({
                appId: 'required',
                platform: 'required',
            }, body)
            if (error) {
                return res.status(400).send(error)
            }
            try {
                let hash = this.hmac(body.appId)
                let app = await this.models.LegacyApp.findOrCreate({
                    where: {id: body.appId},
                    defaults: {id: body.appId, secret: hash, platform: body.platform, serverKey: body.serverKey}
                })
                return res.send(app[0])
            } catch (e) {
                next(e)
            }
        })

        /**
         * @apiIgnore WIP
         * @api {get} /console/apps App list
         * @apiName ListApps
         * @apiGroup WebConsole
         * @apiDescription Get list of registered (partner) apps
         *
         * @apiHeader {String} Authorization <code>Bearer accessToken</code>
         *
         * @apiSuccess {Array} data
         * @apiSuccess {Integer} total
         * @apiSuccess {Integer} pages
         * 
         */
        this.router.get('/apps', this.middlewares.verifyJWT, async (req, res, next) => {
            let limit = req.query.limit || 10
            let skip = req.skip || 0
            try {
                // TODO: standardized paginated result
                let results = await this.models.LegacyApp.findAndCountAll({limit: limit, offset: skip})
                res.send({
                    data: results.rows,
                    total: results.count,
                    pages: Math.ceil(results.count / limit),
                })
            } catch (e) {        
                next(e)
            }
        })

        /**
         * @apiIgnore WIP
         * @api {get} /console/users User list
         * @apiName ListUser
         * @apiGroup WebConsole
         * @apiDescription Get list of registered users
         *
         * @apiHeader {String} Authorization <code>Bearer accessToken</code>
         *
         * @apiSuccess {Array} data
         * @apiSuccess {Integer} total
         * @apiSuccess {Integer} pages
         * 
         */
        this.router.get('/users', this.middlewares.verifyJWT, async (req, res, next) => {
            let limit = req.query.limit || 10
            let skip = req.skip || 0
            try {
                // TODO: standardized paginated result
                let results = await this.models.LegacyUser.findAndCountAll({limit: limit, offset: skip})
                res.send({
                    data: results.rows,
                    total: results.count,
                    pages: Math.ceil(results.count / limit),
                })
            } catch (e) {        
                next(e)
            }
        })

    }
}

module.exports = WebConsoleController