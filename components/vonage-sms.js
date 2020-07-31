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
    init({apiKey, apiSecret, defaultSenderId}) {
        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.defaultSenderId = defaultSenderId || 'VONAGE'
    }

    // Send sms
    async sendSms({phoneNo, message, senderId}) {
        const params = new URLSearchParams()
        params.append('from', senderId || this.defaultSenderId)
        params.append('text', message)
        params.append('to', phoneNo)
        params.append('api_key', this.apiKey)
        params.append('api_secret', this.apiSecret)

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