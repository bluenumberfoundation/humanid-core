'use strict'

const helpers = require('./components/common')

const verifyJWT = (req, res, next) => {
  let authHeader = req.header('Authorization')
  if (!authHeader) {
    return res.status(400).json({message: 'Missing authorization header'})
  }  
  let values = authHeader.split(' ')
  if (values.length != 2) {
    return res.status(400).json({message: 'Invalid authorization token'})
  }
  let token = values[1]
  helpers.verifyJWT(token)
    .then((decodedToken) => {
      req.user = decodedToken.data
      next()
    })
    .catch((err) => {
      return res.status(400).json({message: 'Invalid auth token provided'})
    })
}

module.exports = {
    verifyJWT: verifyJWT,
}
