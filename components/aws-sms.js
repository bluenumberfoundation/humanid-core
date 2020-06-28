'use strict'

// Constants
const
    API_VERSION = '2010-03-31'

// Import Dependencies
const
    AWS = require('aws-sdk')

class AwsSmsProvider {
    init({accessKeyId, secretAccessKey, region}) {
        this.client = new AWS.SNS({
            apiVersion: API_VERSION,
            credentials: new AWS.Credentials({
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            }),
            region: region,
        })
    }

    // Send sms
    async sendSms({phoneNo, message, senderId}) {
        // Create service
        const client = this.client

        // Send sms
        const data = await client.publish({
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

        // Log data
        return {
            provider: 'aws-sns',
            result: data
        }
    }
}

module.exports = new AwsSmsProvider()