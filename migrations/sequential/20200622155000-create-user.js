'use strict'

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create reference data table
        await queryInterface.createTable('UserStatus', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: false,
            },
            name: {
                type: Sequelize.STRING(32),
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        // Create table
        await queryInterface.createTable('User', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            hashId: {
                type: Sequelize.STRING(256),
                allowNull: false
            },
            hashIdVersion: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 1
            },
            hashIdFormatVersion: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 1
            },
            recoveryHashId: {
                type: Sequelize.STRING(256),
                allowNull: true
            },
            recoveryHashIdVersion: {
                type: Sequelize.BIGINT,
                allowNull: true
            },
            recoveryHashIdFormatVersion: {
                type: Sequelize.BIGINT,
                allowNull: true
            },
            countryCode: {
                type: Sequelize.STRING(3),
                allowNull: false
            },
            userStatusId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'UserStatus',
                    key: 'id'
                }
            },
            lastVerifiedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        // Create index
        await queryInterface.addIndex('User', ['hashId'], {unique: true})

        // Insert reference data
        await queryInterface.bulkInsert('UserStatus', [
            {id: 1, name: 'Unverified', updatedAt: '2020-01-01 00:00:00'},
            {id: 2, name: 'Verified', updatedAt: '2020-01-01 00:00:00'},
            {id: 3, name: 'Suspended', updatedAt: '2020-01-01 00:00:00'}
        ])
    },
    down: async queryInterface => {
        await queryInterface.dropTable('User')
        await queryInterface.dropTable('UserStatus')
    }
}
