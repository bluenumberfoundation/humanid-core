'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('App', 'config', {
            type: Sequelize.JSON
        })
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('App', 'config', {})
    }
};
