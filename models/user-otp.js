'use strict'

const
    Sequelize = require('sequelize')

const
    TABLE_NAME = 'UserOTP',
    MODEL_NAME = 'UserOTP'

module.exports = (sequelize) => {
    const Model = sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        sessionId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        otpNo: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        signature: {
            type: Sequelize.STRING,
            allowNull: false
        },
        metadata: {
            type: Sequelize.JSON,
            allowNull: false
        },
        createdAt: {
            type: Sequelize.DATE,
            allowNull: false
        }
    }, {
        tableName: TABLE_NAME,
        timestamps: false
    })

    Model.associate = function (models) {
        Model.belongsTo(models.UserOTPSession, {
            foreignKey: 'sessionId',
            as: 'session',
        })
    }

    return Model
}