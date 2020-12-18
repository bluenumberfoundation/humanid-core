'use strict';

module.exports = {
    up: async (queryInterface, _) => {
        await queryInterface.bulkInsert('AppStatus', [
            {id: 4, name: 'Hidden', updatedAt: '2020-01-01 00:00:00'}
        ])
    },

    down: async (queryInterface, _) => {
        await queryInterface.bulkDelete('AppStatus', {
            'id': 4
        })
    }
};
