'use strict'

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create reference data table
        await queryInterface.createTable('SMSTransaction', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
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
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            version: {
                type: Sequelize.INTEGER,
                allowNull: false
            }
        })

        // Create reference data table
        await queryInterface.createTable('SMSTransactionLog', {
            logId: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            changelog: {
                type: Sequelize.JSON,
                allowNull: false
            },
            id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'SMSTransaction',
                    key: 'id'
                }
            },
            statusId: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            trxSnapshot: {
                type: Sequelize.JSON,
                allowNull: true
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            version: {
                type: Sequelize.INTEGER,
                allowNull: false
            }
        })

        await queryInterface.addIndex('SMSTransaction', ['ownerId', 'providerId'])
        await queryInterface.addIndex('SMSTransaction', ['statusId'])
    },
    down: async queryInterface => {
        await queryInterface.dropTable('SMSTransactionLog')
        await queryInterface.dropTable('SMSTransaction')
    }
}
