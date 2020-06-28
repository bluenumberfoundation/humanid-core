'use strict'

const
    logger = require('./logger'),
    common = require('./components/common'),
    models = require('./models/index'),
    Server = require('./server'),
    services = require('./services/index'),
    components = require('./components/index')

const port = process.env.PORT || common.config.APP_PORT
const app = new Server({
    config: common.config,
    components, models, services, logger
}).app

if (require.main === module) {
    if (process.env['DROP_CREATE'] === '1') {
        // heroku drop-create
        models.sequelize.drop()
            .then(() => {
                return models.sequelize.query('DROP TABLE IF EXISTS `SequelizeMeta`', null)
            })
            .then(models.migrate)
            .then(models.seed)
            .then(() => {
                app.listen(port, () => logger.info(`Listening on port ${port}..`))
            })
    } else {
        app.listen(port, () => {
            logger.info(`Listening on port ${port}...`)
            logger.info(`Base Path: ${common.config.BASE_PATH}`)

            if (common.config.DEMO_MODE) {
                logger.info('Running on Demo mode')
            }
        })
    }
} else {
    module.exports = app
}
