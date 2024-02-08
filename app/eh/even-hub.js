/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const helper     = require( '../helper/helper' )
const apiSec     = require( '../api/api-sec' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const axios      = require( 'axios' )
const { mkdir, writeFile, readFile, rename, rm, stat } = require( 'node:fs/promises' )

exports: module.exports = { 
  init,
  publishDataChgEvt,
  subscribeEvt
}

const DB = '../dta/event-subscriptions.json'

// ============================================================================
let subscriptions = {
}
let seqNo = 0

// ============================================================================
let gui = null

async function init( app ) {
  gui = app
  subscriptions = JSON.parse( await readFile( DB ) )
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

async function publishDataChgEvt( dtaOp, dtaId, dtaType, data ) {
  if ( [ 'app','auth','erm','event-subscriptions','oidc-session','user-auth','user-scope' ].includes( dtaType )) { return }
  let evt = {
    type : 'data',
    op   : dtaOp,
    id   : dtaId,
    type : dtaType,
    data : data,
    seqNo: ( seqNo++ ),
    dt   : Date.now()
  }
  log.debug( 'evt', evt )
  for ( let scope in subscriptions ) {
    log.debug( 'evt scope', scope )
    if ( dtaId.indexOf( scope) == 0 ) {
      for ( let app in subscriptions[ scope ] ) {
        log.debug( 'evt app', scope, app )
        try {
          let sub = subscriptions[ scope ][ app ]
          if ( sub.filter ) {
            // TODO
          }
          log.debug( 'evt post', sub.webHook )
          let result = await axios.post( sub.webHook, evt )
          log.debug( 'evt post', sub.webHook ,result.status )
        } catch ( exc ) { log.warn( 'event err', app ) }
      }  
    }
  }
}


// ============================================================================

async function subscribeCall( req, res ) { try {
  log.info( 'POST /event/subscribe', req.body )
  if ( ! req.body.name    ) { return res.status(401).send( 'name required' ) }
  if ( ! req.body.webHook ) { return res.status(401).send( 'webHook required' ) }
  let scopes = req.appScopes
  let result = {}
  for ( let scopeId of scopes ) {
    result[ scopeId ] = await subscribeEvt( req.appId, req.body.name, scopeId, req.body.webHook, req.body.filter, req.body.since )
  }
  res.send( result ) 
} catch (exc) { log.error( 'subscribeCall', exc ) } }


async function unsubscribeCall( req, res ) {  try {
  log.info( 'POST /event/unsubscribe', req.body )
  if ( ! req.body.name ) { return res.status(401).send( 'name required' ) }
  let scopes = req.appScopes
  let result = {}
  for ( let scopeId of scopes ) {
     delete  subscriptions[ scopeId ][ req.body.name ]
  }
  await writeFile( DB, JSON.stringify( subscriptions, null, '  ' ) )
  res.send( 'done' ) 
} catch (exc) { log.error( 'subscribeCall', exc ) } }


async function subscribeEvt( app, name, scopeId, webHook, filter, since ) {
  // TODO check app authz
  if ( ! subscriptions[ scopeId ] ) {
    subscriptions[ scopeId ] = {}
  }
  subscriptions[ scopeId ][ name ] = {
    webHook : webHook,
    app     : app,
    filter  : ( filter ? filter : {} ),
    creDt   : Date.now()
  }
  await writeFile( DB, JSON.stringify( subscriptions, null, '  ' ) )

  log.info( 'subs', subscriptions )
  return 'OK'
}