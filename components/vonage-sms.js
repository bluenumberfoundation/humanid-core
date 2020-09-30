'use strict'

// Constants
const
    REST_URL = 'https://rest.nexmo.com',
    SMS_TRX_SUCCESS = 1,
    SMS_TRX_FAILED = 2

// Import Dependencies
const
    fetch = require('node-fetch')

class VonageSmsProvider {
    init({apiKey, apiSecret, senderIdDefault, senderIdMap, logger}) {
        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.senderIdDefault = senderIdDefault
        this.senderIdMap = senderIdMap
        this.logger = logger
    }

    getSenderId(options) {
        // If options is empty or country code is empty then return default sender id
        if (!options || !options.countryCode) {
            this.logger.debug(`options.countryCode is not set. fallback to default sender id`)
            return this.senderIdDefault
        }

        // Get country code
        const countryCode = options.countryCode

        let senderId = this.senderIdMap[countryCode]

        if (!senderId) {
            this.logger.debug(`sender id for country ${countryCode} is not available. fallback to default sender id`)
            return this.senderIdDefault
        }

        return senderId
    }

    getTextParams(message, options) {
        if (!options || !options.lang) {
            return {
                message: message,
                textType: "text"
            }
        }

        switch (options.lang) {
            case "bd":
            case "cn":
            case "gr":
            case "in":
            case "jp":
            case "ko":
            case "ru":
            case "th":
            case "tw":
            case "vn":
                return {
                    message: message,
                    textType: "unicode"
                }
            default:
                return {
                    message: message,
                    textType: "text"
                }
        }
    }

    // Send sms
    async sendSms({phoneNo, message}, options) {
        const senderId = this.getSenderId(options)

        const textParams = this.getTextParams(message, options)

        const params = new URLSearchParams()
        params.append('from', senderId)
        params.append('text', textParams.message)
        params.append('to', phoneNo)
        params.append('api_key', this.apiKey)
        params.append('api_secret', this.apiSecret)
        params.append('type', textParams.textType)

        const resp = await fetch(`${REST_URL}/sms/json`, {
            method: 'post',
            body: params
        })

        // Parse resp body
        const respBody = await resp.json()

        // Init response
        const result = {
            metadata: {},
            apiResp: respBody,
            error: null
        }

        // Check response body
        if (respBody.messages && respBody.messages.length === 1 && respBody.messages[0].status === '0') {
            result.status = SMS_TRX_SUCCESS
        } else {
            result.status = SMS_TRX_FAILED
        }

        // Log data
        return result
    }

    getProviderSnapshot() {
        return {
            id: 2,
            name: 'VONAGE'
        }
    }
}

module.exports = new VonageSmsProvider()