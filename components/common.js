'use strict'

const
    APIError = require('../server/api_error'),
    Constants = require('../constants'),
    logger = require('../logger').child({scope: 'Core.Components.Common'}),
    fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    jwt = require('jsonwebtoken'),
    request = require('request'),
    LibPhoneNo = require('libphonenumber-js'),
    configPath = 'config.json'

// load config
let config = {DATABASE: {}}
if (fs.existsSync(path.join('.', configPath))) {
    config = require('../' + configPath)
} else {
    logger.warn(`${configPath} not found`)
}

// TODO: To be deprecated
config.CONFIRMATION_EXPIRY_MS = process.env.CONFIRMATION_EXPIRY_MS || config.CONFIRMATION_EXPIRY_MS || 30000
config.OTP_EXPIRY_MS = process.env.OTP_EXPIRY_MS || config.OTP_EXPIRY_MS || 60000
config.APP_SECRET = process.env.APP_SECRET || config.APP_SECRET || 'ThisIsADefaultSecretPhrase'
config.AUTHY_API_URL = process.env.AUTHY_API_URL || 'https://api.authy.com'
config.AUTHY_API_KEY = process.env.AUTHY_API_KEY || config.AUTHY_API_KEY
config.DEMO_APP_JWT_LIFETIME = process.env.DEMO_APP_JWT_LIFETIME || '15m';
config.NEXMO_API_URL = process.env.NEXMO_API_URL || 'https://api.nexmo.com'
config.NEXMO_REST_URL = process.env.NEXMO_REST_URL || 'https://rest.nexmo.com'

// Server
config.APP_PORT = process.env.APP_PORT || config.APP_PORT || 3000
config.DEBUG = process.env.DEBUG || false
config.BASE_PATH = process.env.BASE_PATH || config.BASE_PATH || ''
config.BASE_URL = process.env.BASE_URL || config.BASE_URL || `http://localhost:${config.APP_PORT}${config.BASE_PATH}`

// Server.DemoMode
config.DEMO_MODE = process.env.DEMO_MODE || config.DEMO_MODE || false

// Server.UserHash
config.HASH_ID_SALT_1 = process.env.HASH_ID_SALT_1 || config.HASH_ID_SALT_1
config.HASH_ID_SALT_2 = process.env.HASH_ID_SALT_2 || config.HASH_ID_SALT_2
config.HASH_ID_REPEAT = process.env.HASH_ID_REPEAT || config.HASH_ID_REPEAT || 4
config.HASH_ID_SECRET = process.env.HASH_ID_SECRET || config.HASH_ID_SECRET

// Client.ExchangeToken
config.EXCHANGE_TOKEN_AES_KEY = process.env.EXCHANGE_TOKEN_AES_KEY || config.EXCHANGE_TOKEN_AES_KEY
config.EXCHANGE_TOKEN_LIFETIME = process.env.EXCHANGE_TOKEN_LIFETIME || config.EXCHANGE_TOKEN_LIFETIME || 300

// Client.DevConsole
config.DEV_CONSOLE_CLIENT_API_KEY = process.env.DEV_CONSOLE_CLIENT_API_KEY || config.DEV_CONSOLE_CLIENT_API_KEY

// Client.WebLogin
config.WEB_LOGIN_SESSION_SALT = process.env.WEB_LOGIN_SESSION_SALT || config.WEB_LOGIN_SESSION_SALT
config.WEB_LOGIN_SESSION_SECRET = process.env.WEB_LOGIN_SESSION_SECRET || config.WEB_LOGIN_SESSION_SECRET
config.WEB_LOGIN_SESSION_LIFETIME = process.env.WEB_LOGIN_SESSION_LIFETIME || config.WEB_LOGIN_SESSION_LIFETIME || 300

// Components.Nexmo
config.NEXMO_API_KEY = process.env.NEXMO_API_KEY || config.NEXMO_API_KEY
config.NEXMO_API_SECRET = process.env.NEXMO_API_SECRET || config.NEXMO_API_SECRET
config.NEXMO_FROM = process.env.NEXMO_FROM || config.NEXMO_FROM || 'humanID'

// Components.AWS
config.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || config.AWS_ACCESS_KEY_ID
config.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || config.AWS_SECRET_ACCESS_KEY
config.AWS_SMS_REGION = process.env.AWS_SMS_REGION || config.AWS_SMS_REGION || 'us-west-2'

// Components.Firebase
config.FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || config.FIREBASE_SERVER_KEY

const SECRET = config.APP_SECRET

// hash data using secret
const hmac = (data, secret) => {
    secret = secret || SECRET
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

// sleep
const sleep = require('util').promisify(setTimeout)

// validate body
const validate = (rules, body) => {
    for (let r in rules) {
        // If field is a custom or inherited property, continue
        if (!rules.hasOwnProperty(r)) {
            continue
        }
        // Validate
        if (rules[r] === 'required' && !body[r]) {
            return {error: `${r} is required`}
        }
    }
    return null
}

// create (sign) JWT
const createJWT = (user) => {
    return jwt.sign({id: user.id}, SECRET)
}

// verify JWT
const verifyJWT = (token, secret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decodedToken) => {
            if (err || !decodedToken) {
                return reject(err)
            }
            resolve(decodedToken)
        })
    })
}

// generate random string
const randStr = (length, type) => {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    if (type === 1) {
        characters = '0123456789'
    } else if (type === 2) {
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    }
    let charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

// combine country code and phone number
const combinePhone = (countryCode, phone) => {
    phone = phone[0] === '0' ? phone.substring(1) : phone
    return countryCode + phone
}

// send push notif
const pushNotif = async (data, serverKey) => {
    let options = {
        method: 'post',
        url: 'https://fcm.googleapis.com/fcm/send',
        headers: {'Authorization': `key=${serverKey}`},
        json: true,
        body: data,
    }
    return new Promise((resolve, reject) => {
        request(options, (error, res, body) => {
            if (error) {
                reject(error)
            } else {
                resolve(body.results[0].message_id)
            }
        })
    })
}

const getEpoch = t => {
    return Math.round(t.getTime() / 1000)
}

/**
 * Validate body against rules
 * @param {Object.<string, string>} rules
 * @param {*} body Request Body
 */
const validateReq = (rules, body) => {
    for (let field in rules) {
        // If field is a custom or inherited property, continue
        if (!rules.hasOwnProperty(field)) {
            continue
        }
        let fieldRules = rules[field].split('|')
        for (let i in fieldRules) {
            let val = body[field]
            let rule = fieldRules[i].toLowerCase()
            if (rule === 'required') {
                if (!val || val.length <= 0) {
                    throw new APIError(Constants.RESPONSE_ERROR_BAD_REQUEST, `${field} is required`)
                }
            } else if (rule.startsWith('in:')) {
                // ignore if empty
                if (val && val.length > 0) {
                    let values = rule.split(':')[1].split(',')
                    if (values.indexOf(val.toLowerCase()) < 0) {
                        throw new APIError(Constants.RESPONSE_ERROR_BAD_REQUEST, `${field} must be in: ${values}`)
                    }
                }
            }
        }
    }
}

// parsePhoneNo parse phone number to E.164 format
const parsePhoneNo = (countryCode, phoneNo) => {
    // Clean input
    const input = "+" + countryCode + (phoneNo[0] === '0' ? phoneNo.substring(1) : phoneNo)

    // Clean phoneNo number with libphonenumber
    const result = LibPhoneNo.parsePhoneNumberFromString(input)

    // If failed to parse phoneNo number, then throw error
    if (!result) {
        throw new APIError("ERR_10")
    }

    return result
}

module.exports = {
    config: config,
    sleep: sleep,
    hmac: hmac,
    validate: validate,
    createJWT: createJWT,
    verifyJWT: verifyJWT,
    randStr: randStr,
    combinePhone: combinePhone,
    pushNotif: pushNotif,
    getEpoch,
    validateReq,
    parsePhoneNo: parsePhoneNo,
}
