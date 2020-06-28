'use strict'

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create reference data table
        await queryInterface.createTable('UserExchangeSession', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            extId: {
                type: Sequelize.STRING(24),
                allowNull: false
            },
            appUserId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'AppUser',
                    key: 'id'
                }
            },
            iv: {
                type: Sequelize.STRING(32),
                allowNull: false
            },
            expiredAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        await queryInterface.addIndex('UserExchangeSession', ['extId'], {unique: true})
    },
    down: async queryInterface => {
        await queryInterface.dropTable('UserExchangeSession')
    }
}
