'use strict'

const chai = require('chai'),
    nock = require('nock'),
    chaiHttp = require('chai-http'),
    bcrypt = require('bcryptjs'),
    common = require('../components/common'),
    nexmo = require('../components/nexmo'),
    models = require('../models/index'),
    middlewares = require('../middlewares'),
    Server = require('../server'),
    app = new Server(models, common, middlewares, nexmo).app

// setup chai
chai.use(chaiHttp)
chai.should()

describe('Server', () => {

    beforeEach(async () => {
        await models.sequelize.drop()
        await models.migrate()
        await models.LegacyAdmin.create({
            email: 'admin@local.host',
            password: bcrypt.hashSync('admin123'),
        })
    })

    it('index should be publicliy accessible', async () => {
        let res = await chai.request(app).get('/')
        res.should.have.status(200)
    })

    it('should be able to register an app ID', async () => {
        // called by our platform when app owner is 
        // registering to use our API
        try {
            let res = await chai.request(app)
                .post('/console/login')
                .send({email: 'admin@local.host', password: 'admin123'})
            res.should.have.status(200)
            res.body.accessToken.length.should.gte(10)
            let accessToken = res.body.accessToken
            let data = {appId: 'NEW_YORK_TIMES', platform: models.LegacyApp.PlatformCode.ANDROID}
            res = await chai.request(app)
                .post('/console/apps')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(data)
            res.should.have.status(200)
            res.body.id.should.equals(data.appId)
            res.body.secret.length.should.gte(10)
            res = await chai.request(app)
                .get('/console/apps')
                .set('Authorization', `Bearer ${accessToken}`)
            res.body.data.length.should.equals(1)
            res.body.total.should.equals(1)
        } catch (e) {
            throw e
        }
    })

    it('should reject invalid app ID registration', async () => {
        // called by our platform when app owner is 
        // registering to use our API
        try {
            let res = await chai.request(app)
                .post('/console/login')
                .send({email: 'admin@local.host', password: 'admin123'})
            res.should.have.status(200)
            res.body.accessToken.length.should.gte(10)
            let accessToken = res.body.accessToken
            let data = {appId: 'invalid@pp!d', platform: models.LegacyApp.PlatformCode.ANDROID}
            res = await chai.request(app)
                .post('/console/apps')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(data)
            res.text.should.equals('Validation error: App ID must be 5-20 alphanumeric characters')
            res.should.have.status(400)
        } catch (e) {
            throw e
        }
    })

    it('should be able to register as new user', async () => {
        let appIds = ['NEW_YORK_TIMES', 'THE_GUARDIAN']
        let data = {countryCode: '62', phone: '80989999', deviceId: '122333444455555'}
        let req = chai.request(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID
            })

            // mock nexmo api response
            nock(common.config.NEXMO_REST_URL)
                .post(/^\/sms/)
                .times(1)
                .reply(200, {messages: [{status: '0'}]})

            // Called by SDK within partner app
            // when a new user is trying to login
            let res2 = await req.post('/mobile/users/verifyPhone').send({
                countryCode: data.countryCode,
                phone: data.phone,
                appId: app1.id,
                appSecret: app1.secret,
            })
            res2.should.have.status(200)

            // reject invalid code
            res2 = await req.post('/mobile/users/register').send({
                countryCode: data.countryCode,
                phone: data.phone,
                deviceId: '122333444455555',
                verificationCode: 'INVALID_CODE',
                appId: app1.id,
                appSecret: app1.secret,
            })
            res2.should.have.status(400)

            // valid code
            let v = await models.LegacyVerification.findByPk(common.combinePhone(data.countryCode, data.phone))
            res2 = await req.post('/mobile/users/register').send({
                countryCode: data.countryCode,
                phone: data.phone,
                deviceId: '122333444455555',
                verificationCode: v.requestId,
                appId: app1.id,
                appSecret: app1.secret,
            })
            res2.should.have.status(200)
            res2.body.appId.should.equals(app1.id)
            // The hash is unique per app per user
            // this hash should be encrypted and stored 
            // on user device
            res2.body.hash.length.should.gte(10)
            res2.body.should.not.have.all.keys('hash')
        } catch (e) {
            throw e
        } finally {
            req.close()
        }
    })

    it('should be able to login using stored hash', async () => {
        let appIds = ['NEW_YORK_TIMES', 'THE_GUARDIAN']
        let phones = [
            ['62', '80989999'],
        ]
        let req = chai.request(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID
            })
            let app2 = await models.LegacyApp.create({
                id: appIds[1],
                secret: common.hmac(appIds[1]),
                platform: models.LegacyApp.PlatformCode.ANDROID
            })
            let user = await models.LegacyUser.create({hash: common.hmac(`${phones[0][0]}${phones[0][1]}`)})
            let appUser1 = await models.LegacyAppUser.create({
                appId: app1.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app1.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_1'
            })

            // reject wrong hash
            let res3 = await req.post('/mobile/users/login').send({
                appId: app2.id,
                appSecret: app2.secret,
                existingHash: 'INVALID_HASH',
            })
            res3.should.have.status(401)

            // Login to 2nd app
            // Called by SDK within partner app/server
            // to check if a user is registered (hence logged-in).
            // The hash is considered as a replacement for conventional password
            // hence must be encrypted when stored in user's device
            // and decrypted only when being used for login           
            let res4 = await req.post('/mobile/users/login').send({
                appId: app2.id,
                appSecret: app2.secret,
                existingHash: appUser1.hash,
            })
            res4.should.have.status(200)
            res4.body.appId.should.equals(app2.id)
            // The hash is unique per app per user
            // this hash should be encrypted and stored 
            // on user device
            res4.body.hash.length.should.gte(10)
            res4.body.should.not.have.any.keys('userHash')

            // check login status
            let res5 = await req.get('/mobile/users/login').query({
                appId: app2.id,
                appSecret: app2.secret,
                hash: res4.body.hash,
            })
            res5.should.have.status(200)
        } catch (e) {
            throw e
        } finally {
            req.close()
        }
    })

    it('should be able to update number', async () => {
        let app = new Server(models, common, middlewares, nexmo).app
        let appIds = ['NEW_YORK_TIMES', 'THE_GUARDIAN']
        let phones = [
            ['62', '80989999'],
            ['62', '81234567'],
        ]
        let req = chai.request(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID
            })
            let app2 = await models.LegacyApp.create({
                id: appIds[1],
                secret: common.hmac(appIds[1]),
                platform: models.LegacyApp.PlatformCode.ANDROID
            })
            let user = await models.LegacyUser.create({hash: common.hmac(`${phones[0][0]}${phones[0][1]}`)})
            let appUser1 = await models.LegacyAppUser.create({
                appId: app1.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app1.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_1'
            })
            let appUser2 = await models.LegacyAppUser.create({
                appId: app2.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app2.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_2'
            })
            let verification = await models.LegacyVerification.create({
                number: `${phones[1][0]}${phones[1][1]}`,
                requestId: 'DUMMY_CODE'
            })

            // reject invalid user hash
            let res0 = await req.post('/mobile/users/updatePhone').send({
                countryCode: phones[1][0],
                phone: phones[1][1],
                existingHash: 'INVALID_HASH',
                appId: app1.id,
                appSecret: app1.secret,
                verificationCode: verification.requestId,
            })
            res0.should.have.status(401)

            // update phone number
            let res1 = await req.post('/mobile/users/updatePhone').send({
                countryCode: phones[1][0],
                phone: phones[1][1],
                existingHash: appUser1.hash,
                appId: app1.id,
                appSecret: app1.secret,
                verificationCode: verification.requestId,
            })
            res1.should.have.status(200)
            let updatedUser = await models.LegacyUser.findByPk(user.id)
            updatedUser.hash.should.equals(common.hmac(`${phones[1][0]}${phones[1][1]}`))

            // check login status
            let res2 = await req.get('/mobile/users/login').query({
                appId: app1.id,
                appSecret: app1.secret,
                hash: appUser1.hash,
            })
            res2.should.have.status(200)
            let res3 = await req.get('/mobile/users/login').query({
                appId: app2.id,
                appSecret: app2.secret,
                hash: appUser2.hash,
            })
            res3.should.have.status(200)
        } catch (e) {
            throw e
        } finally {
            req.close()
        }
    })

    it('should be able to update notifId', async () => {
        let appIds = ['NEW_YORK_TIMES']
        let phones = [
            ['62', '80989999'],
        ]
        let req = chai.request(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID
            })
            let user = await models.LegacyUser.create({hash: common.hmac(`${phones[0][0]}${phones[0][1]}`)})
            let appUser1 = await models.LegacyAppUser.create({
                appId: app1.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app1.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_1'
            })
            let newNotifId = 'NEW_NOTIF_ID'

            // update phone number
            let res1 = await req.put('/mobile/users').send({
                notifId: newNotifId,
                hash: appUser1.hash,
                appId: app1.id,
                appSecret: app1.secret,
            })
            res1.should.have.status(200)
            let updateAppUser = await models.LegacyAppUser.findOne({where: {hash: appUser1.hash}})
            updateAppUser.notifId.should.equals(newNotifId)
        } catch (e) {
            throw e
        } finally {
            req.close()
        }
    })

    it('should be able to process web login using OTP SMS', async () => {
        const MESSAGE_ID = 'MESSAGE_ID'
        common.pushNotif = () => Promise.resolve(MESSAGE_ID)
        let appIds = ['NEW_YORK_TIMES']
        let phones = [['62', '80989999']]
        let req = chai.request.agent(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID,
                serverKey: 'SERVER_KEY'
            })
            let user = await models.LegacyUser.create({hash: common.hmac(`${phones[0][0]}${phones[0][1]}`)})
            await models.LegacyAppUser.create({
                appId: app1.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app1.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_1'
            })

            // mock nexmo api response
            nock(common.config.NEXMO_REST_URL)
                .post(/^\/sms/)
                .times(2)
                .reply(200, {messages: [{status: '0'}]})

            // request OTP SMS
            let res = await req.post('/web/users/login').send({
                type: 'otp',
                countryCode: phones[0][0],
                phone: phones[0][1],
                appId: app1.id,
                appSecret: app1.secret,
            })
            res.should.have.status(202)

            // reject invalid code
            res = await req.post('/web/users/login').send({
                type: 'otp',
                countryCode: phones[0][0],
                phone: phones[0][1],
                verificationCode: '99999', // INVALID CODE
                appId: app1.id,
                appSecret: app1.secret,
            })
            res.should.have.status(400)

            // valid code login
            let v = await models.LegacyVerification.findByPk(common.combinePhone(phones[0][0], phones[0][1]))
            let res1 = await req.post('/web/users/login').send({
                type: 'otp',
                countryCode: phones[0][0],
                phone: phones[0][1],
                verificationCode: v.requestId,
                appId: app1.id,
                appSecret: app1.secret,
            })
            res1.should.have.status(200) // success
            res1.body.messageId.should.equals('OTP')
            res1.body.type.should.equals(models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST)
            res1.body.status.should.equals(models.LegacyConfirmation.StatusCode.CONFIRMED)
            res1.body.appId.should.equals(app1.id)
            res1.body.should.not.have.any.keys(['userId'])
            res1.should.have.cookie('sessionId')

            // once success, it should always 
            // return same success confirmation object
            // and does not require any confirmation code again
            let res2 = await req.post('/web/users/login').send({
                type: 'otp',
                countryCode: phones[0][0],
                phone: phones[0][1],
                appId: app1.id,
                appSecret: app1.secret,
            })
            res2.should.have.status(200)
            res2.body.status.should.equals(models.LegacyConfirmation.StatusCode.CONFIRMED)
            res2.body.updatedAt.should.equals(res1.body.updatedAt) // must not be updated

            // check login status
            let sessionId = res2.body.sessionId
            let resStatus = await req.get('/web/users/status')
                .query({
                    sessionId: sessionId,
                    appId: app1.id,
                    appSecret: app1.secret,
                })
            resStatus.should.have.status(200)
            resStatus.body.status.should.equals(models.LegacyConfirmation.StatusCode.CONFIRMED)
            resStatus.body.sessionId.should.equals(sessionId)

            // logout
            let res3 = await req.post('/web/users/logout').send({
                sessionId: sessionId,
                appId: app1.id,
                appSecret: app1.secret,
            })
            res3.should.have.status(204)

            // once logout, login should trigger confirmation again
            let res4 = await req.post('/web/users/login').send({
                type: 'otp',
                countryCode: phones[0][0],
                phone: phones[0][1],
                appId: app1.id,
                appSecret: app1.secret,
            })
            res4.should.have.status(202)
            res4.should.not.have.cookie('sessionId')

        } catch (e) {
            throw e
        } finally {
            req.close()
        }

    })

    it('should be able to process web login using push notif', async () => {
        const MESSAGE_ID = 'MESSAGE_ID'
        common.pushNotif = () => Promise.resolve(MESSAGE_ID)
        let appIds = ['NEW_YORK_TIMES']
        let phones = [['62', '80989999']]
        let req = chai.request.agent(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID,
                serverKey: 'SERVER_KEY'
            })
            let user = await models.LegacyUser.create({hash: common.hmac(`${phones[0][0]}${phones[0][1]}`)})
            await models.LegacyAppUser.create({
                appId: app1.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app1.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_1'
            })

            // web login
            let res1 = await req.post('/web/users/login').send({
                countryCode: phones[0][0],
                phone: phones[0][1],
                appId: app1.id,
                appSecret: app1.secret,
            })
            res1.should.have.status(202) // success but pending
            res1.body.messageId.should.equals(MESSAGE_ID)
            res1.body.type.should.equals(models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST)
            res1.body.status.should.equals(models.LegacyConfirmation.StatusCode.PENDING)
            res1.body.appId.should.equals(app1.id)
            res1.body.should.not.have.any.keys(['userId'])

            let confirmation = await models.LegacyConfirmation.findByPk(res1.body.id)
            let lastUpdatedAt = confirmation.updatedAt
            confirmation.userId.should.equals(user.id)

            // when called again should not send notif
            await req.post('/web/users/login').send({
                countryCode: phones[0][0],
                phone: phones[0][1],
                appId: app1.id,
                appSecret: app1.secret,
            })
            await confirmation.reload()
            confirmation.updatedAt.toISOString().should.equals(lastUpdatedAt.toISOString())

            // after expiry limit should send notif
            await common.sleep(common.config.CONFIRMATION_EXPIRY_MS)
            await req.post('/web/users/login').send({
                countryCode: phones[0][0],
                phone: phones[0][1],
                appId: app1.id,
                appSecret: app1.secret,
            })
            let count = await models.LegacyConfirmation.count({
                where: {
                    type: models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST,
                    appId: app1.id,
                    userId: user.id,
                }
            })
            count.should.equals(1)
        } catch (e) {
            throw e
        } finally {
            req.close()
        }

    })

    it('should be able to confirm web login', async () => {
        let appIds = ['NEW_YORK_TIMES']
        let phones = [['62', '80989999']]
        let req = chai.request.agent(app).keepOpen()
        try {
            let app1 = await models.LegacyApp.create({
                id: appIds[0],
                secret: common.hmac(appIds[0]),
                platform: models.LegacyApp.PlatformCode.ANDROID,
                serverKey: 'SERVER_KEY'
            })
            let user = await models.LegacyUser.create({hash: common.hmac(`${phones[0][0]}${phones[0][1]}`)})
            let appUser1 = await models.LegacyAppUser.create({
                appId: app1.id,
                userId: user.id,
                hash: common.hmac(`${user.id}${app1.secret}`),
                deviceId: 'DEVICE_ID',
                notifId: 'NOTIF_ID_1'
            })
            let confirmation = await models.LegacyConfirmation.create({
                type: models.LegacyConfirmation.TypeCode.WEB_LOGIN_REQUEST,
                appId: app1.id,
                userId: user.id,
                status: models.LegacyConfirmation.StatusCode.PENDING,
                sessionId: 'SESSION_ID',
            })

            // mobile confirm
            let res1 = await req.post('/web/users/confirm').send({
                hash: appUser1.hash,
                requestingAppId: app1.id, // same app
                appId: app1.id,
                appSecret: app1.secret,
            })
            res1.should.have.status(200)
            let confirmedConfirmation = await models.LegacyConfirmation.findByPk(confirmation.id)
            confirmedConfirmation.status.should.equals(models.LegacyConfirmation.StatusCode.CONFIRMED)

            // login again should return confirmed
            let res2 = await req.post('/web/users/login')
                .set('Cookie', `sessionId=${confirmation.sessionId};`)
                .send({
                    countryCode: phones[0][0],
                    phone: phones[0][1],
                    appId: app1.id,
                    appSecret: app1.secret,
                })
            res2.should.have.status(200)
            res2.body.status.should.equals(models.LegacyConfirmation.StatusCode.CONFIRMED)
            res2.body.sessionId.should.equals(confirmation.sessionId)

            // check login status
            let res3 = await req.get('/web/users/status')
                .query({
                    sessionId: confirmation.sessionId,
                    appId: app1.id,
                    appSecret: app1.secret,
                })
            res3.should.have.status(200)
            res3.body.status.should.equals(models.LegacyConfirmation.StatusCode.CONFIRMED)
            res3.body.sessionId.should.equals(confirmation.sessionId)

            // logout
            let resLogout = await req.post('/web/users/logout').send({
                sessionId: confirmation.sessionId,
                appId: app1.id,
                appSecret: app1.secret,
            })
            resLogout.should.have.status(204)
            resLogout.should.not.have.cookie('sessionId')

        } catch (e) {
            throw e
        } finally {
            req.close()
        }

    })
})