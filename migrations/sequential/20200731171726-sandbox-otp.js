'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('OrgUserWhitelist', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true,
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
            phoneNoHash: {
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
            orgUserWhitelistId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'OrgUserWhitelist',
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

        await queryInterface.addIndex('OrgUserWhitelist', ['ownerId'])
        await queryInterface.addIndex('OrgUserWhitelist', ['phoneNoHash'])
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('UserOTPSandbox')
        await queryInterface.dropTable('OrgUserWhitelist')
    }
};
