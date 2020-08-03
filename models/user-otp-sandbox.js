'use strict'

const
    Sequelize = require('sequelize')

const
    TABLE_NAME = 'UserOTPSandbox',
    MODEL_NAME = 'UserOTPSandbox'

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
        devUserId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        otpCode: {
            type: Sequelize.STRING,
            allowNull: false
        },
        expiredAt: {
            type: Sequelize.DATE,
            allowNull: false
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

    Model.associate = function (models) {
        Model.belongsTo(models.OrgDevUser, {
            foreignKey: 'devUserId',
            as: 'devUser',
        })

        Model.belongsTo(models.UserOTPSession, {
            foreignKey: 'sessionId',
            as: 'session',
        })
    }

    return Model
}