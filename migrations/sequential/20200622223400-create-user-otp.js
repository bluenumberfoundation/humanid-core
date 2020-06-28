'use strict'

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create reference data table
        await queryInterface.createTable('UserOTPSession', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            requestId: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            userHashId: {
                type: Sequelize.STRING(256),
                allowNull: false
            },
            rule: {
                type: Sequelize.JSON,
                allowNull: false
            },
            otpCount: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            failAttemptCount: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            nextResendAt: {
                type: Sequelize.DATE,
                allowNull: true
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
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            },
            version: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        // Create table
        await queryInterface.createTable('UserOTP', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            sessionId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'UserOTPSession',
                    key: 'id'
                }
            },
            otpNo: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            signature: {
                type: Sequelize.STRING(256),
                allowNull: false
            },
            metadata: {
                type: Sequelize.JSON,
                allowNull: false
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        // Create index
        await queryInterface.addIndex('UserOTPSession', ['userHashId'])
        await queryInterface.addIndex('UserOTPSession', ['requestId'], {unique: true})
    },
    down: async queryInterface => {
        await queryInterface.dropTable('UserOTP')
        await queryInterface.dropTable('UserOTPSession')
    }
}
