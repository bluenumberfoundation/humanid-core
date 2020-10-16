'use strict'

// Constants
const
    API_VERSION = '2010-03-31',
    SMS_TRX_SUCCESS = 1,
    SMS_TRX_FAILED = 2

// Import Dependencies
const
    AWS = require('aws-sdk')

class AwsSmsProvider {
    init({accessKeyId, secretAccessKey, region}) {
        this.accessKeyId = accessKeyId
        this.secretAccessKey = secretAccessKey
        this.defaultRegion = region
    }

    // Send sms
    async sendSms({phoneNo, message}, {region, senderId}) {
        // Determine region
        if (!region) {
            region = this.defaultRegion
        }

        if (!senderId) {
            senderId = 'HUMANID'
        }

        // Create client
        const client = new AWS.SNS({
            apiVersion: API_VERSION,
            credentials: new AWS.Credentials({
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey
            }),
            region: region
        })

        // Send sms
        let status, err, data
        try {
            data = await client.publish({
                Message: message,
                PhoneNumber: phoneNo,
                MessageAttributes: {
                    "AWS.SNS.SMS.SMSType": {
                        DataType: "String",
                        StringValue: "Transactional"
                    },
                    "AWS.SNS.SMS.SenderID": {
                        DataType: "String",
                        StringValue: senderId
                    },
                }
            }).promise()
            status = SMS_TRX_SUCCESS
            err = null
        } catch (e) {
            status = SMS_TRX_FAILED
            err = e
        }

        // Log data
        return {
            metadata: { region: region },
            apiResp: data,
            status: status,
            error: err
        }
    }

    getProviderSnapshot() {
        return {
            id: 1,
            name: 'AWS-SNS'
        }
    }
}

module.exports = new AwsSmsProvider()