'use strict'

const
    Sequelize = require('sequelize')

const
    TABLE_NAME = 'OrgDevUser',
    MODEL_NAME = 'OrgDevUser'

module.exports = (sequelize) => {
    return sequelize.define(MODEL_NAME, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        extId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        ownerEntityTypeId: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        ownerId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        hashId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        phoneNoMasked: {
            type: Sequelize.STRING,
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
}