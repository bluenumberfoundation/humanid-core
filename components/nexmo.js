'use strict'

const DEMO_PHONE_NO = '628199999999'

const
    logger = require('../logger').child({scope: 'Core.Components.Vonage'}),
    request = require('request'),
    models = require('../models'),
    helpers = require('./common'),
    config = helpers.config,
    {LegacyVerification: VerificationModel} = models

// create random verification code and send SMS
const sendVerificationSMS = async (countryCode, phone, testVerificationCode) => {
    // Convert phone number to E.164 standard
    // TODO: replace function with libphonenumber implementation
    const number = helpers.combinePhone(countryCode, phone)

    // Init send flags
    let sendSms = true

    // If server is running on demo mode and demo phone number is correct, set test verification code to 1234
    let verificationCode
    if (config.DEMO_MODE && number === DEMO_PHONE_NO) {
        // Set verification code to 1234
        verificationCode = '1234'
        // Override send flags
        sendSms = false
    } else {
        // Generate secure verification code
        // TODO: Generate with CSPRG standard randomizer
        verificationCode = testVerificationCode || helpers.randStr(4, 1)
    }

    // Find existing verification code
    let verification = await VerificationModel.findOne({where: {number: number}})

    // If not found, then create a new one and set resend flag to false
    let resend
    if (!verification) {
        verification = await VerificationModel.create({number: number, requestId: verificationCode})
    } else {
        // Else, update verification code
        verification.requestId = verificationCode
        await verification.save()
    }

    // If DEMO_MODE is on, then return
    if (!sendSms) {
        return
    } else if (!config.NEXMO_REST_URL || !config.NEXMO_API_KEY || !config.NEXMO_API_SECRET) {
        return 'TEST_CODE'
    }

    // Send otp
    let options = {
        method: 'post',
        url: `${config.NEXMO_REST_URL}/sms/json`,
        form: {
            from: config.NEXMO_FROM,
            text: `Your humanID verification code is ${verificationCode}`,
            to: number,
            api_key: config.NEXMO_API_KEY,
            api_secret: config.NEXMO_API_SECRET,
        },
        json: true,
    }

    return new Promise((resolve, reject) => {
        request(options, (error, res, body) => {
            if (error) {
                logger.error(error)
                reject(error)
                return
            }

            if (body.messages && body.messages.length === 1 && body.messages[0].status === '0') {
                resolve(verification)
                return
            }

            logger.error(body)
            reject(body)
        })
    })
}

// compare verificationCode with database entry
const checkVerificationSMS = async (countryCode, phone, verificationCode) => {
    if (config.NEXMO_REST_URL && config.NEXMO_API_KEY && config.NEXMO_API_SECRET) {
        let number = helpers.combinePhone(countryCode, phone)
        let count = await VerificationModel.destroy({where: {number: number, requestId: verificationCode}})
        if (count === 1) {
            return Promise.resolve(1)
        } else {
            return Promise.reject({name: 'ValidationError', message: 'Invalid verification code'})
        }
    } else {
        return Promise.resolve(1)
    }
}


const requestPhoneVerification = async (countryCode, phone) => {
    if (config.NEXMO_API_URL && config.NEXMO_API_KEY && config.NEXMO_API_SECRET) {
        let number = helpers.combinePhone(countryCode, phone)
        let options = {
            method: 'get',
            url: `${config.NEXMO_API_URL}/verify/json`,
            qs: {
                api_key: config.NEXMO_API_KEY,
                api_secret: config.NEXMO_API_SECRET,
                number: number,
                brand: 'humanID',
                code_length: 4,
            },
            json: true,
        }
        return new Promise((resolve, reject) => {
            request(options, (error, res, body) => {
                if (error) {
                    reject(error)
                } else {
                    if (body.status === '0' && body.request_id) {
                        resolve(body.request_id)
                    } else {
                        logger.error(body)
                        resolve(body['error_text'])
                    }
                }
            })
        })
            .then((requestId) => {
                return VerificationModel.create({
                    number: number,
                    requestId: requestId,
                })
            })
    } else {
        // mock up for demo
        return Promise.resolve('TEST_REQUEST_ID')
    }
}

// check verification code
const checkVerificationCode = async (countryCode, phone, verificationCode) => {
    if (config.NEXMO_API_URL && config.NEXMO_API_KEY && config.NEXMO_API_SECRET) {
        let number = helpers.combinePhone(countryCode, phone)
        let verification = await VerificationModel.findByPk(number)
        if (!verification) {
            return Promise.reject({
                name: 'SequelizeValidationError',
                message: `No pending verification for (${countryCode}) ${phone}`
            })
        }
        let options = {
            method: 'get',
            url: `${config.NEXMO_API_URL}/verify/check/json`,
            qs: {
                api_key: config.NEXMO_API_KEY,
                api_secret: config.NEXMO_API_SECRET,
                request_id: verification.requestId,
                code: verificationCode,
            },
            json: true,
        }
        return new Promise((resolve, reject) => {
            request(options, (error, res, body) => {
                if (error) {
                    reject(error)
                } else {
                    if (body.status === '0' && body.request_id) {
                        resolve(body.request_id)
                    } else {
                        logger.error(body)
                        resolve(body['error_text'])
                    }
                }
            })
        })
            .then(() => {
                // delete verification record
                return VerificationModel.destroy({where: {number: number}})
            })
    } else {
        // mock up for demo
        return Promise.resolve(1)
    }
}

module.exports = {
    requestPhoneVerification: requestPhoneVerification,
    checkVerificationCode: checkVerificationCode,
    sendVerificationSMS: sendVerificationSMS,
    checkVerificationSMS: checkVerificationSMS,
}
