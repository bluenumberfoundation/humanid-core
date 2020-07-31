'use strict'

const
    Sequelize = require('sequelize')
const
    TABLE_NAME = 'SMSTransaction',
    MODEL_NAME = 'SMSTransaction'

module.exports = (sequelize) => {
    const Model = sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
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
        providerId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        providerSnapshot: {
            type: Sequelize.JSON,
            allowNull: false
        },
        targetCountry: {
            type: Sequelize.STRING(3),
            allowNull: false
        },
        statusId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        trxSnapshot: {
            type: Sequelize.JSON,
            allowNull: true
        },
        version: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    }, {
        tableName: TABLE_NAME,
        timestamps: true
    })

    Model.associate = function (models) {
        Model.hasMany(models.SMSTransactionLog, {
            foreignKey: 'id',
            as: 'log',
        })
    }

    return Model
}