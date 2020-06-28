'use strict'

const
    Sequelize = require('sequelize')

const
    MODEL_NAME = 'App',
    TABLE_NAME = 'App'

module.exports = sequelize => {
    return sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true
        },
        ownerEntityTypeId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        ownerId: {
            type: Sequelize.STRING(64),
            allowNull: false
        },
        extId: {
            type: Sequelize.STRING(64),
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        logoFile: {
            type: Sequelize.STRING(64),
            allowNull: true,
        },
        appStatusId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'AppStatus',
                key: 'id'
            }
        }
    }, {
        tableName: TABLE_NAME,
        timestamps: true
    })
}