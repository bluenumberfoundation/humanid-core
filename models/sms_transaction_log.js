'use strict'

const
    Sequelize = require('sequelize')
const
    TABLE_NAME = 'SMSTransactionLog',
    MODEL_NAME = 'SMSTransactionLog'

module.exports = (sequelize) => {
    return sequelize.define(MODEL_NAME, {
        logId: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        changelog: {
            type: Sequelize.JSON,
            allowNull: false
        },
        id: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        statusId: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        trxSnapshot: {
            type: Sequelize.JSON,
            allowNull: true
        },
        updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
        },
        version: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    }, {
        tableName: TABLE_NAME,
        timestamps: false
    })
}