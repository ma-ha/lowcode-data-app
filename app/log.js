/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const pjson  = require( './package.json' )
const bunyan = require( 'bunyan' )

let log = bunyan.createLogger({
  name  : pjson.name,
  level : ( process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info' )
})

module.exports = {
  logger: log
}

