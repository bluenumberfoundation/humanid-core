'use strict'

const
    Sequelize = require('sequelize')

const
    TABLE_NAME = 'AppUserSession',
    MODEL_NAME = 'AppUserSession'

module.exports = (sequelize) => {
    const Model = sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true
        },
        appUserId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        devicePlatformId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        deviceId: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        notificationChannelId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        notificationToken: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        expiredAt: {
            type: Sequelize.DATE,
            allowNull: false,
        },
        createdAt: {
            type: Sequelize.DATE,
            allowNull: false
        }
    }, {
        tableName: TABLE_NAME
    })

    Model.associate = function (models) {
        Model.belongsTo(models.AppUser, {
            foreignKey: 'appUserId',
            as: 'appUser',
        })
    }

    return Model
}