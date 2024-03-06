/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const helper     = require( '../helper/helper' )
const propHandler = require( '../data/propertyHandler' )
const { appRoot } = require( 'easy-web-app' )

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

  //const myJWTcheck = apiSec.initJWTcheck()
  const guiAuthz = apiSec.userTenantAuthz( gui )
 
  // --------------------------------------------------------------------------
  svc.get( '/setscope',  guiAuthz,  setScope )
  svc.get( '/gui/tenant/app/icons', guiAuthz, getAppIcons )
  svc.get( '/app/:tenantId/:appId/:appVersion/:view', guiAuthz, getAppView )

  svc.get(  '/guiapp/:tenantId/entity', guiAuthz, getEntitiesOfTenant )

  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity', guiAuthz, getDocArr )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, getDoc )
  svc.post( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, addDoc )
  svc.post( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/:recId/:actionId', guiAuthz, docStateChange )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/:recId/:event', guiAuthz, docEvent )
  svc.delete( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, delDoc )
}

// --------------------------------------------------------------------------

async function setScope ( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( req.query.id && user ) { 
    log.debug( 'SET SCOPE', user.userId, req.query.id )
    let scopeTbl = await userDta.getScopeList( user.userId )
    if ( scopeTbl[ req.query.id+'' ] ) {
      await userDta.setSelScope( user.userId, req.query.id+'' )
    }
  } else {
    log.info( 'ERR: SET SCOPE', user.userId, req.query.id )
  }
  log.debug( 'set scope', req.query )
  let layout = req.query.layout 
  if ( ! layout || layout == 'AppEntity-nonav' ) { layout = 'Apps' }
  res.redirect( 'index.html?layout='+layout ) 
}


async function getAppIcons( req, res ) {
  // log.info( 'GET apps', req.user )
  let appMap = await dta.getAppList( req.user.scopeId, req.user.scopeTags )
  let icons = []
  for ( let appId in appMap ) {
    let app = appMap[ appId ]
    if ( app.role == [] ) { continue }
    icons.push({
      id     : appId,
      layout : 'AppEntity-nonav&id=' + appId,
      label  : app.title,
      img    : ( app.img ? app.img : 'img/k8s-ww-conn.png' )
    })
  }
  // log.info( 'GET apps', appArr )
  res.send({ icons: icons, update: "60" } )
}


async function getAppView( req, res ) {
  // log.info( 'GET apps', req.user )
  let appArr = await dta.getAppList( req.user.scopeId, req.user.scopeTags )
  // log.info( 'GET apps', appArr )
  res.send( appArr )
}


async function getDocArr( req, res ) {
  log.info( 'GET entities', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )

  // let data = await dta.getDocById(  req.params.entityId, user.scopeId )
  // log.info( 'GET entity data', data )
  if ( ! app ) { log.warn('GET entity: app not found'); return res.status(400).send([]) }
  let entityArr = []
  for ( let entityId in app.entity ) {
    let entity = app.entity[ entityId ]
    entityArr.push({
      id : entityId,
      title : entity.title,
      scope : entity.scope,
      maintainer : entity.maintainer.join(),
      properties :'<a href="index.html?layout=AppEntityProperty-nonav&id='+appId+','+entityId+'">Manage</a>'
    })
  }
  res.send( entityArr )
}


async function getDoc( req, res ) {
  log.info( 'GET entity', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId, req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { log.warn('GET data: app not found'); return res.status(400).send([]) }
  if ( ! app.entity[ req.params.entityId ] ) { log.warn('GET data: app entity not found'); return res.status(400).send([]) }
  let entity = app.entity[ req.params.entityId ]

  if ( req.query.recId ) { // single doc by id
    log.info( 'GET entity q/id', req.query.recId )

    if ( req.query.recId == '_empty' ) {
      return res.send( propHandler.genEmptyDataReturn( entity ) )
    }

    let doc = await dta.getDataObjX( 
      user.rootScopeId,  
      req.params.appId, 
      req.params.appVersion,
      req.params.entityId,
      user.scopeId, 
      req.query.recId
    )
    log.debug( 'GET entity doc', doc )
    let result = JSON.parse( JSON.stringify( doc ) )
    propHandler.reformatDataReturn( entity, result )

    result.recId =  req.query.recId
    log.debug( 'GET entity q/id', result )
    return  res.send( result )
  }

  // else doc array
  let filter = extractFilter( req.query.dataFilter )

  let dataArr = await dta.getDataObjX( user.rootScopeId,  req.params.appId, req.params.appVersion, req.params.entityId, user.scopeId, null, filter )
  let stateModel = null
  if ( entity.stateModel ) {
    stateModel = await dta.getStateModelById( user.rootScopeId, entity.stateModel )
  }

  let result = []
  for ( let rec of dataArr ) {
    let p =  req.params 
    let url =  'guiapp/'+p.tenantId+'/'+p.appId+'/'+p.appVersion+'/entity/'+p.entityId+'/'+rec.id
    result.push( await propHandler.reformatDataTableReturn( entity, rec, url, stateModel )  )
  }
  // log.info( 'GET entity data', result )
  res.send( result )
}


async function addDoc( req, res )  {
  log.info( 'Add entity', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId, req.body.id  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { return res.send( 'ERROR: App not found') }
  let entity = app.entity[ req.params.entityId ]

  let dtaColl = user.rootScopeId + req.params.entityId
  
  // let existRec = await dta.idExists( dtaColl, req.body.id )  
  // if ( existRec && existRec.scopeId != user.scopeId ) {
  //   return  res.send( 'ID '+  req.body.id +' already used in scope'+  existRec.scopeId )
  // }
  let rec = req.body
  rec.scopeId = user.scopeId
  
  let parse = propHandler.reformatDataUpdateInput( entity, rec )
  if ( parse.err ) {
    return res.status(400).send( parse.err )
  }
  
  // complete data set with property data from DB
  let dbRec = await  dta.getDataById( dtaColl, rec.id ) 
  for ( let propId in dbRec ) {
    if ( ! rec[ propId ] || ( entity.properties[ propId ] && entity.properties[ propId ].apiManaged ) ) {
      rec[ propId ] = dbRec[ propId ]
    }
  }

  for ( let propId in entity.properties ) {
    // check not null required
    if ( entity.properties[ propId ].notNull ) {
      if ( ! rec[ propId ] || rec[ propId ].trim() == '' ) {
        return res.status(401).send( propId + ' required' ) 
      }
    }
  }

  let result = await dta.addDataObj( dtaColl, rec.id, rec, null, entity )
  // TODO check entity
  res.send( 'OK' )
}


async function docStateChange( req, res ) {
  log.info( 'Add entity', req.params.tenantId, req.params.entityId, req.params.actionId, req.body.id  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { return res.send( 'ERROR: App not found') }
  let entity = app.entity[ req.params.entityId ]
  if ( ! entity ) { return res.send( 'ERROR: Entity not found') }

  await dta.addDataObj( req.params.tenantId + req.params.entityId, req.body.id, req.body, 'dta.stateUpdate', entity )

  let appIdX = appId.replaceAll('-','').replaceAll('.','').replaceAll('/','')

  let tabSel = '&Tabs'+ appIdX +'=Tab'+ req.params.entityId
  let id = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  res.send( 'index.html?layout=AppEntity-nonav&id=' + id + tabSel )
}

async function delDoc( req, res )  {
  log.info( 'Del entity', req.params, req.query  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.query.recId ) { return res.send( 'ERROR: id required') }
  let dtaColl = user.rootScopeId + req.params.entityId
  let result = await dta.delDataObj( dtaColl, req.query.recId )
  res.send( result )
}


async function getEntitiesOfTenant( req, res ) {
  let app = await dta.getApp( req.params.tenantId )
  let entityTbl = []
  for ( let entityId in app.entity ) {
    let id = req.params.tenantId +'/'+ entityId
    entityTbl.push({
      id    : id,
      title : app.entity[ entityId ].title,
      scope : app.entity[ entityId ].scope,
      maintainer : app.entity[ entityId ].maintainer.join()
    })
  }
  res.send( entityTbl )
}


async function docEvent( req, res )  {
  log.info( 'Entity Event', req.params, req.query  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let p = req.params

  let rec = await dta.getDataObjX( user.rootScopeId, p.appId, p.appVersion, p.entityId, user.scopeId, p.recId )
  if ( rec ) {
    if ( ! rec.eventArr ) { rec.eventArr = [] }
    if ( rec.eventArr.indexOf( p.event ) == -1 ) {
      rec.eventArr.push( p.event )
      await dta.addDataObj( user.rootScopeId+p.entityId,  p.recId, rec )
    } 
  }
  res.redirect( '../../../../../../../index.html?layout=AppEntity-nonav&id='+p.tenantId+'/'+p.appId+'/'+p.appVersion )
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