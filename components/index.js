'use strict'

const
    Common = require('./common'),
    DateUtil = require('./date_util'),
    ResponseMapper = require('./response-mapper'),
    smsNexmo = require('./nexmo'),
    smsAWS = require('./aws-sms'),
    smsVonage = require('./vonage-sms'),
    logger = require('../logger')

function init({config}) {
    // Init response mapper singleton
    ResponseMapper.init({filePath: config.server.workDir + '/response-codes.json'})

    // Init AWS SMS Provider
    smsAWS.init({
        accessKeyId: config['AWS_ACCESS_KEY_ID'],
        secretAccessKey: config['AWS_SECRET_ACCESS_KEY'],
        region: config['AWS_SMS_REGION']
    })

    smsVonage.init({
        apiKey: config['NEXMO_API_KEY'],
        apiSecret: config['NEXMO_API_SECRET'],
        senderIdDefault: config['NEXMO_SENDER_ID_DEFAULT'],
        senderIdMap: {
            'US': config['NEXMO_SENDER_ID_US'],
            'VN': config['NEXMO_SENDER_ID_VN']
        },
        logger: logger
    })

    // Return components
    return {
        common: Common,
        dateUtil: DateUtil,
        nexmo: smsNexmo,
        response: ResponseMapper,
        smsAWS: smsAWS,
        smsVonage: smsVonage
    }
}

module.exports = {init}

