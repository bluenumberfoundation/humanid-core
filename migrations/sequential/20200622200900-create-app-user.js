'use strict'

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create reference data table
        await queryInterface.createTable('AccessStatus', {
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
        await queryInterface.createTable('DevicePlatform', {
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
        await queryInterface.createTable('NotificationChannel', {
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
        await queryInterface.createTable('AppUser', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            appId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'App',
                    key: 'id'
                }
            },
            userId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'User',
                    key: 'id'
                }
            },
            extId: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            accessStatusId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'AccessStatus',
                    key: 'id'
                }
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
        await queryInterface.createTable('AppUserSession', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            appUserId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'AppUser',
                    key: 'id'
                }
            },
            devicePlatformId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'DevicePlatform',
                    key: 'id'
                }
            },
            deviceId: {
                type: Sequelize.STRING(256),
                allowNull: false
            },
            notificationChannelId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'NotificationChannel',
                    key: 'id'
                }
            },
            notificationToken: {
                type: Sequelize.STRING(256),
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
            }
        })

        // Create index
        await queryInterface.addIndex('AppUser', ['extId'], {unique: true})
        await queryInterface.addIndex('AppUserSession', ['devicePlatformId', 'deviceId'])

        // Insert reference data
        await queryInterface.bulkInsert('AccessStatus', [
            {id: 1, name: 'Grant', updatedAt: '2020-01-01 00:00:00'},
            {id: 2, name: 'Deny', updatedAt: '2020-01-01 00:00:00'}
        ])
        await queryInterface.bulkInsert('DevicePlatform', [
            {id: 1, name: 'Android', updatedAt: '2020-01-01 00:00:00'},
            {id: 2, name: 'iOS', updatedAt: '2020-01-01 00:00:00'},
            {id: 3, name: 'Web', updatedAt: '2020-01-01 00:00:00'}
        ])
        await queryInterface.bulkInsert('NotificationChannel', [
            {id: 1, name: 'FCM', updatedAt: '2020-01-01 00:00:00'},
            {id: 2, name: 'APNS', updatedAt: '2020-01-01 00:00:00'}
        ])
    },
    down: async queryInterface => {
        await queryInterface.dropTable('AppUserSession')
        await queryInterface.dropTable('AppUser')
        // Drop reference data
        await queryInterface.dropTable('AccessStatus')
        await queryInterface.dropTable('DevicePlatform')
        await queryInterface.dropTable('NotificationChannel')
    }
}
