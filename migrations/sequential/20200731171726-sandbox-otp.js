'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('OrgDevUser', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            extId: {
                type: Sequelize.STRING(24),
                allowNull: false
            },
            ownerEntityTypeId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'EntityType',
                    key: 'id'
                }
            },
            ownerId: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            hashId: {
                type: Sequelize.STRING(256),
                allowNull: false
            },
            phoneNoMasked: {
                type: Sequelize.STRING(16),
                allowNull: false
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        await queryInterface.createTable('UserOTPSandbox', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            sessionId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'UserOTPSession',
                    key: 'id'
                }
            },
            devUserId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'OrgDevUser',
                    key: 'id'
                }
            },
            otpCode: {
                type: Sequelize.STRING(8),
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
            },
        })

        await queryInterface.addIndex('OrgDevUser', ['extId'])
        await queryInterface.addIndex('OrgDevUser', ['ownerId'])
        await queryInterface.addIndex('OrgDevUser', ['hashId'])
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('UserOTPSandbox')
        await queryInterface.dropTable('OrgDevUser')
    }
};
