'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('UserEventLog', {
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
            userFingerprint: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            eventName: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            metadata: {
                type: Sequelize.JSON,
                allowNull: true
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: '2020-01-01 00:00:00'
            }
        })

        await queryInterface.addIndex('UserEventLog', ['ownerId', 'appId', 'eventName', 'userFingerprint', 'createdAt'],
            {
                name: 'idx_user_event'
            })
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('UserEventLog')
    }
};
