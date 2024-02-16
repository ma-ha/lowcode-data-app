/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const helper     = require( '../helper/helper' )

exports: module.exports = { 
  setupAPI  
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null

async function setupAPI( app, oauthCfg ) {
  log.info( 'Starting API...' )

  let svc = app.getExpress()
  gui = app

  svc.use( bodyParser.urlencoded({  limit: "20mb", extended: false }) )
  svc.use( bodyParser.json({ limit: "20mb" }) )

  apiSec.init( oauthCfg )

  //---------------------------------------------------------------------------
  const apiAuthz = apiSec.apiAppAuthz( app )

  // svc.get(  '/adapter/app/:scopeId', apiAuthz, TODO )
  // svc.get(  '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, TODO )
  // svc.post( '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, TODO )
  // svc.get(  '/adapter/entity/:scopeId/entity', apiAuthz, TODO )
  // svc.get(  '/adapter/entity/:scopeId/:appId/:appVersion/entity', apiAuthz, TODO )
  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId',        apiAuthz, getDocArr )
  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId/:recId', apiAuthz, getDoc )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId/:recId', apiAuthz, addDoc )
  svc.delete('/adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId/:recId', apiAuthz, delDoc )
}

// ----------------------------------------------------------------------------

async function getDocArr( req, res ) {
  log.info( 'GET data array', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  if ( ! await checkApp( req, res ) ) { return }
  let tbl = req.scopeId + req.params.entityId
  let dtaArr = await getData( tbl, req.scopeId )
  res.send( dtaArr )
}


async function getDoc( req, res ) {
  log.info( 'GET data by id', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.recId )
  if ( ! await checkApp( req, res ) ) { return }
  let tbl = req.scopeId + req.params.entityId
  let dta = await getDataById( tbl, req.params.recId )
  return dta
}


async function addDoc( req, res )  {
  log.info( 'Add data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.recId )
  let app = await checkApp( req, res )
  if ( ! app ) { return }
  let tbl = req.scopeId + req.params.entityId
  
  let properties = app.entity[ req.params.entityId ].properties
  for ( let propId in req.body ) {
    if ( ! properties[ propId ] ) {
      log.warn( 'api-adapter: properties not defined', propId )
      return res.status( 400 ).send( )
    }
  }
  
  for ( let propId in properties ) {
    let p = req.body[ propId ]
    if ( ! req.body[ propId ] ) {
      log.warn( 'api-adapter: properties missing', propId )
      return res.status( 400 ).send( )
    }
    switch ( properties[ propId ].type ) {
      case 'String': 
        if ( typeof p === 'string' ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
      case 'Number': 
        if ( isNaN( p ) ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
      case 'Boolean': 
        if ( typeof p === 'boolean' ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
      case 'Date': 
        break
      case 'Select': 
        if ( typeof p === 'boolean' ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
      case 'DocMap': 
        // TODO
        break
      case 'SelectRef': 
        // TODO
        break
      case 'MultiSelectRef': 
        // TODO
        break
      case 'UUID': 
        if ( typeof p === 'string' ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
        break
      case 'JSON': 
        if ( typeof p === 'object' ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
        break
      case 'Link': 
        if ( typeof p === 'string' ) { return  sendErr( res, 'api-adapter: body not valid: '+propId )}; break
        break

      default:
        return sendErr( res, 'api-adapter: body not valid: '+propId )
        break
    }
  }

  let result = await dta.addDataObj( tbl, req.params.recId, req.body )
  res.send( result )
}


async function delDoc( req, res )  {
  log.info( 'Del data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.recId )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! await checkApp( req, res ) ) { return }
  let tbl = req.scopeId + req.params.entityId
  let result = await dta.delDataObj( tbl, req.params.recId )
  res.send( result )
}


function extractFilter( filterQuery ){
  let filter = null
  if ( filterQuery ) {
    for (  let fp in filterQuery ) { try {
      let query = filterQuery[ fp ].replaceAll( '%20', ' ' ).trim()
      if ( query != '' ) {
        if ( ! filter ) { filter = {} }
        filter[ fp ] = query
      }
    } catch ( exc ) { log.warn( 'extractFilter', exc ) }}
  }
  return filter
}

// ----------------------------------------------------------------------------

function sendErr( res, err ) {
  log.warn( err )
  res.status( 400 ).send( )
}


async function checkApp( req, res ) {
  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { 
    log.warn( 'api-adapter: app not found', appId )
    res.status( 400 ).send( )
  }
  if ( ! app.entity[ req.params.entityId ] ) { 
    log.warn( 'api-adapter: entity not found', appId )
    res.status( 400 ).send( )
  }
  return app
}
