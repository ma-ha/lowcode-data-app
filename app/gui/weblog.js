/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log = require( '../helper/log' ).logger

module.exports = weblog

// main
function weblog ( ) {
  log.info( 'weblog', 'init' )
  return function logger ( req, res, next ) {
    // filter interesting actions
    if ( filter( req ) ) {
      var remoteAddress = 
        req.ip ||
        req._remoteAddress ||
        (req.connection && req.connection.remoteAddress) ||
        undefined

      var logRec = {
        ts :  Date.now(),
        mtd: req.method, 
        ip : remoteAddress,
        ref: req.headers['referer'] || req.headers['referrer'],
        ua : req.headers['user-agent'],
        url: req.originalUrl || req.url
      }
      log.debug( 'access-log', (new Date()), logRec.ip, logRec.url, '"'+logRec.ua+'"' )
      
      // write rec to DB
      // db.addWebLog( logRec )
    }
    next()
  }
}


function filter( req ) {
  var url = req.originalUrl || req.url
  if ( url.endsWith( '/status' ) ||  url.endsWith( 'svc/nav' )  ) {
    return false
  }
  if ( url.endsWith( '.css' ) ||  url.endsWith( '.js' ) ||  url.endsWith( 'EN.json' )   ) {
    return false
  }
  if ( url.indexOf( '/monitor/js' ) >= 0 ) {
    return false
  }
  if ( url.indexOf( 'css/' ) >= 0 ) {
    return false
  }
  if ( url.indexOf( 'jscript?' ) >= 0 ) {
    return false
  }
  if ( url.indexOf( '/modules' ) >= 0 ) {
    return false
  }
  if ( url.indexOf( '/img' ) >= 0 ) {
    return false
  }
  if ( url.indexOf( 'statusping' ) >= 0 ) {
    return false
  }
  return true
}