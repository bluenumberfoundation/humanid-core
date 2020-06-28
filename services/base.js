'use strict'

class BaseService {
    constructor(name, services, {config, models, components, logger}) {
        this.config = config
        this.models = models
        this.components = components
        this.name = name
        this.services = services
        this.logger = logger.child({scope: `Services.${this.name}`})
    }

    getServiceName() {
        return this.name
    }
}

module.exports = BaseService