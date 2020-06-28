'use strict'

const chai = require('chai'),
    nock = require('nock'),
    models = require('../models/index'),
    common = require('../components/common'),
    nexmo = require('../components/nexmo'),
    config = common.config

// setup chai
chai.should()

describe('Nexmo Helpers', () => {
    
    beforeEach(async () => {
        await models.sequelize.drop()
        await models.migrate()
    })

    it('should send verification sms properly', async () => {
        let requestId = common.randStr(4, 1)
        let phone = '081234567890'
        let countryCode = '62'
        let number = common.combinePhone(countryCode, phone)
        let text = `Your humanID verification code is ${requestId}`
        nock(config.NEXMO_REST_URL)
            .post(`/sms/json`, `from=humanID&text=${encodeURIComponent(text)}&to=${number}&api_key=${config.NEXMO_API_KEY}&api_secret=${config.NEXMO_API_SECRET}`)
            .reply(200, {messages: [{status: '0'}]})
        
        let res = await nexmo.sendVerificationSMS(countryCode, phone, requestId)
        res.number.should.equals(number)
        res.requestId.should.equals(requestId)
        let count = await models.LegacyVerification.count({where: {number: number, requestId: requestId}})
        count.should.equals(1)
    })

    it('should be able to check verification sms', async () => {
        let verificationCode = common.randStr(4, 1)
        let phone = '081234567890'
        let countryCode = '62'
        let number = common.combinePhone(countryCode, phone)
        await models.LegacyVerification.create({number: number, requestId: verificationCode})
        
        let destroyedRow = await nexmo.checkVerificationSMS(countryCode, phone, verificationCode)
        destroyedRow.should.equals(1)
        let count = await models.LegacyVerification.count({where: {number: number}})
        count.should.equals(0)
    })


    it('should send request phone verification properly', async () => {
        let requestId = common.randStr(10)
        let phone = '081234567890'
        let countryCode = '62'
        let number = common.combinePhone(countryCode, phone)
        nock(config.NEXMO_API_URL)
            .get(`/verify/json?api_key=${config.NEXMO_API_KEY}&api_secret=${config.NEXMO_API_SECRET}&number=${number}&brand=humanID&code_length=4`)
            .reply(200, {status: '0', request_id: requestId})
        
        let res = await nexmo.requestPhoneVerification(countryCode, phone)
        res.number.should.equals(number)
        res.requestId.should.equals(requestId)
        let count = await models.LegacyVerification.count({where: {number: number, requestId: requestId}})
        count.should.equals(1)
    })

    it('should check verification code properly', async () => {
        let requestId = common.randStr(10)
        let verificationCode = common.randStr(4)
        let phone = '081234567890'
        let countryCode = '62'
        let number = common.combinePhone(countryCode, phone)
        // create dummy verification
        await models.LegacyVerification.create({number: number, requestId: requestId})

        nock(config.NEXMO_API_URL)
            .get(`/verify/check/json?api_key=${config.NEXMO_API_KEY}&api_secret=${config.NEXMO_API_SECRET}&request_id=${requestId}&code=${verificationCode}`)
            .reply(200, {status: '0', request_id: requestId})
                
        let destroyedRow = await nexmo.checkVerificationCode(countryCode, phone, verificationCode)
        destroyedRow.should.equals(1)
        let count = await models.LegacyVerification.count({where: {number: number}})
        count.should.equals(0)
    })

})