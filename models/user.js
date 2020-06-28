'use strict'

const
    Sequelize = require('sequelize')

const
    MODEL_NAME = 'User',
    TABLE_NAME = 'User'

module.exports = (sequelize) => {
    return sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        hashId: {
            type: Sequelize.STRING(256),
            allowNull: false
        },
        hashIdVersion: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        hashIdFormatVersion: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        recoveryHashId: {
            type: Sequelize.STRING(256),
            allowNull: true
        },
        recoveryHashIdVersion: {
            type: Sequelize.BIGINT,
            allowNull: true
        },
        recoveryHashIdFormatVersion: {
            type: Sequelize.BIGINT,
            allowNull: true
        },
        countryCode: {
            type: Sequelize.STRING(3),
            allowNull: false
        },
        userStatusId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        lastVerifiedAt: {
            type: Sequelize.DATE,
            allowNull: false
        },
    }, {
        tableName: TABLE_NAME,
        timestamps: true
    })
}