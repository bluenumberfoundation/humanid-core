'use strict'

const winston = require('winston');
const {format} = winston


// Retrieve logger configuration from env
const logLevel = process.env['LOG_LEVEL'] || 'info'
const logFormat = process.env['LOG_FORMAT'] || 'json'

// Determine format
let logFmt
if (logFormat === 'console') {
    logFmt = format.combine(
        format.timestamp({}),
        format.colorize({
            all: true
        }),
        format.printf((info) => {
            // Set metadata
            let metadata = ''
            if (info.metadata) {
                metadata = '\n  > metadata:' + JSON.stringify(info.metadata, null, 4)
            }
            let stackTrace = ''
            if (info.stackTrace) {
                stackTrace = `\n  > stackTrace: ${info.stackTrace}`
            }
            return `[${info.timestamp}] ${info.level}:\t${info.message}${metadata}${stackTrace}`
        }),
    )
} else {
    logFmt = format.combine(
        format.timestamp(),
        format.json(),
    )
}


// Create logger singleton module
module.exports = winston.createLogger({
    level: logLevel,
    format: logFmt,
    transports: [
        new winston.transports.Console({})
    ]
})

