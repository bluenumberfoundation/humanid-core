'use strict'

const
    AuthService = require('./auth'),
    UserService = require('./user')

const SERVICES = [
    AuthService,
    UserService
]

function init(args) {
    // Get logger
    const {logger} = args

    // Load services
    const serviceMap = {}
    SERVICES.forEach(Service => {
        const svc = new Service(serviceMap, args)
        const svcName = svc.getServiceName()
        serviceMap[svc.getServiceName()] = svc
        logger.debug(`Service loaded: ${svcName}`)
    })

    // Return service map
    return serviceMap
}

module.exports = {init}

