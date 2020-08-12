'use strict'

const
    Sequelize = require('sequelize')
const
    TABLE_NAME = 'UserEventLog',
    MODEL_NAME = 'UserEventLog'

module.exports = (sequelize) => {
    return sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        ownerId: {
            type: Sequelize.STRING(64),
            allowNull: false
        },
        appId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        appSnapshot: {
            type: Sequelize.JSON,
            allowNull: false
        },
        userFingerprint: {
            type: Sequelize.STRING(64),
            allowNull: false
        },
        eventName: {
            type: Sequelize.STRING(64),
            allowNull: false
        },
        metadata: {
            type: Sequelize.JSON,
            allowNull: true
        },
        createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: '2020-01-01 00:00:00'
        }
    }, {
        tableName: TABLE_NAME,
        timestamps: false
    })
}