'use strict'

class APIError extends Error {
    /**
     * Creates APIError
     *
     * @param code {string} Error code
     * @param message {string|null} Error message
     * @param source {Error|null} Error Cause
     */
    constructor(code, message = null, source = null) {
        super(message);
        this.name = 'APIError'
        this.code = code
        this.message = message
        this.source = source
    }

    setData(data) {
        this.data = data
        return this
    }
}

module.exports = APIError