/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const helper     = require( '../helper/helper' )
const apiSec     = require( '../api/api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const axios      = require( 'axios' )
const fs         = require( 'fs' )
const { writeFile, readFile } = require( 'node:fs/promises' )

exports: module.exports = { 
  init,
  publishDataChgEvt
}

// ============================================================================

let seqNo = 0

// ============================================================================
let gui = null
let db = null

async function init( app, persistence ) {
  db = persistence
  // if ( ! dbDir.endsWith( '/' ) ) { dbDir += '/' }
  // DB = dbDir + 'event-subscriptions.json'
  // if ( ! fs.existsSync( DB ) ) {
  //   await writeFile( DB, '{}' )
  // }
  gui = app
  
  // subscriptions = JSON.parse( await readFile( DB ) )
  let svc = app.getExpress()
  svc.use( bodyParser.urlencoded({  limit: "20mb", extended: false }) )
  svc.use( bodyParser.json({ limit: "20mb" }) )

  const apiAuthz = apiSec.apiAppAuthz( app )
  const guiAuthz = apiSec.userTenantAuthz( gui )

  // --------------------------------------------------------------------------
  svc.post( '/event/subscribe',    apiAuthz, subscribeCall )   
  svc.post( '/event/unsubscribe',  apiAuthz, unsubscribeCall )
  svc.get(  '/event/subscription', guiAuthz, getAppSubs )   

}

async function getAppSubs( req, res ) {
  log.info( 'getAppSubs', req.query )
  // let user = await userDta.getUserInfoFromReq( gui, req )
  let appSubs = []
  let subscriptions = await db.getSubscriptions()
  for ( let scope in subscriptions ) {
    // log.info( 'getAppSubs scope', scope )
    for ( let app in subscriptions[ scope ] ) {
      let sub = subscriptions[ scope ][ app ]
      // log.info( 'getAppSubs app', sub.app )
      if ( sub.app == req.query.id ) {
        // log.info( 'getAppSubs', sub )
        let creDt = ( new Date( sub.creDt ) ).toISOString().substring(0,16).replace('T',' ')
        appSubs.push({
          name    : app,
          scope   : scope,
          filter  : JSON.stringify( sub.filter ),
          webhook : sub.webHook,
          creDt   : creDt
        })
      }
    }
  }       

  res.send( appSubs )
}


// ==========================================================================

async function publishDataChgEvt( dtaOp, dtaId, uri, dtaType, data ) {
  if ( [ 'app','erm','event-subscriptions','oidc-session','user-auth','user-scope' ].includes( dtaType )) { return }
  let evt = {
    type : 'data',
    op   : dtaOp,
    id   : dtaId,
    uri  : uri,
    type : dtaType,
    data : data,
    seqNo: ( seqNo++ ),
    dt   : Date.now()
  }
  log.info( 'evt',evt )
  let subscriptions = await db.getSubscriptions()
  for ( let scope in subscriptions ) {
    log.info( 'evt scope', scope )
    if ( dtaType.indexOf( scope) == 0 ) {
      for ( let app in subscriptions[ scope ] ) {
        log.info( 'evt app', scope, app )
        let sub = {}
        try {
          sub = subscriptions[ scope ][ app ]
          if ( sub.filter ) {
            if ( ! isQueried( data,  sub.filter.data ) ) { continue }
            if ( ! isQueried( dtaOp, sub.op ) ) { continue }
          }
          log.info( 'evt post', sub.webHook )
          let result = await axios.post( sub.webHook, evt )
          log.info( 'evt post', sub.webHook ,result.status )
        } catch ( exc ) { log.warn( 'could not post event', app, sub.webHook ) }
      }  
    }
  }
}

function isQueried( doc, qry ) {
  log.debug( 'QRY', doc, qry )
  if ( ! qry ) { return true }
  for ( let q in qry ) {
    if ( ! doc[q]  ||  doc[q] != qry[q] ) { return false }
  }
  return true
}

// ============================================================================

async function subscribeCall( req, res ) { try {
  log.info( 'POST /event/subscribe', req.body )
  if ( ! req.body.name    ) { return res.status(401).send( 'name required' ) }
  if ( ! req.body.webHook ) { return res.status(401).send( 'webHook required' ) }
  let scopes = req.appScopes
  let result = {}
  for ( let scopeId of scopes ) {
    result[ scopeId ] = await db.subscribeEvt( req.appId, req.body.name, scopeId, req.body.webHook, req.body.filter, req.body.since )
  }
  res.send( result ) 
} catch (exc) { log.error( 'subscribeCall', exc ) } }


async function unsubscribeCall( req, res ) {  try {
  log.info( 'POST /event/unsubscribe', req.body )
  if ( ! req.body.name ) { return res.status(401).send( 'name required' ) }
  for ( let scopeId of req.appScopes ) {
    await db.unsubscribeEvt( scopeId, req.body.name ) 
  }
  res.send( 'done' ) 
} catch (exc) { 
  log.error( 'subscribeCall', exc ) } 
  res.send( 'failed' ) 
}

