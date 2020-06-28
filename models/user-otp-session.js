'use strict'

const
    Sequelize = require('sequelize')
const
    TABLE_NAME = 'UserOTPSession',
    MODEL_NAME = 'UserOTPSession'

module.exports = (sequelize) => {
    const Model = sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        requestId: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        userHashId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        rule: {
            type: Sequelize.JSON,
            allowNull: false
        },
        otpCount: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        failAttemptCount: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        nextResendAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        expiredAt: {
            type: Sequelize.DATE,
            allowNull: false,
        }
    }, {
        tableName: TABLE_NAME,
        timestamp: true
    })

    Model.associate = function (models) {
        Model.hasMany(models.UserOTP, {
            foreignKey: 'sessionId',
            as: 'otps',
        })
    }

    return Model
}