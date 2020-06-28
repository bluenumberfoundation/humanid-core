'use strict'

const
    Sequelize = require('sequelize')

const
    TABLE_NAME = 'UserExchangeSession',
    MODEL_NAME = 'UserExchangeSession'

module.exports = (sequelize) => {
    const Model = sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        extId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        appUserId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        iv: {
            type: Sequelize.STRING,
            allowNull: false
        },
        expiredAt: {
            type: Sequelize.DATE,
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
        Model.belongsTo(models.AppUser, {
            foreignKey: 'appUserId',
            as: 'appUser',
        })
    }

    return Model
}