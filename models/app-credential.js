'use strict'

const
    Sequelize = require('sequelize')

const
    MODEL_NAME = 'AppCredential',
    TABLE_NAME = 'AppCredential'

module.exports = (sequelize) => {
    const Model = sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true
        },
        appId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        environmentId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        credentialTypeId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING(128),
            allowNull: false
        },
        clientId: {
            type: Sequelize.STRING(64),
            allowNull: false,
        },
        clientSecret: {
            type: Sequelize.STRING(64),
            allowNull: false,
        },
        options: {
            type: Sequelize.JSON,
            allowNull: false
        },
        credentialStatusId: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    }, {
        tableName: TABLE_NAME,
        timestamps: true
    })

    Model.associate = function (models) {
        Model.belongsTo(models.App, {
            foreignKey: 'appId',
            as: 'app',
        })
    }

    return Model
}