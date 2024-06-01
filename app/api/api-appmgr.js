/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const appImport  = require( './api-app-import' )
const propHandler= require( '../data/propertyHandler' )
const models     = require( './api-models' )
const helper     = require( '../helper/helper' )

exports: module.exports = { 
  setupAPI
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null
let cfg = {}

async function setupAPI( app, appCfg ) {
  let svc = app.getExpress()
  gui = app
  cfg = appCfg

  const guiAuthz = apiSec.customizeAuthz( gui )

  // --------------------------------------------------------------------------

  svc.get(  '/app-lnk/html', guiAuthz, getAppLnk ) // for HTML view above the app list
  svc.get(  '/app', guiAuthz, getApp )
  svc.post( '/app', guiAuthz, addApp )
  svc.get(  '/app/customize', guiAuthz, getAppForCustomize )
  
  svc.get(    '/app/entity', guiAuthz, getEntity )
  svc.post(   '/app/entity', guiAuthz, addEntity )
  svc.post(   '/app/entity/inherit', guiAuthz, inheritEntity )
  svc.post(   '/app/entity/config', guiAuthz, chgEntity )
  svc.delete( '/app/entity', guiAuthz, delEntity )

  svc.get(    '/app/entity/property', guiAuthz, getProperty )
  svc.post(   '/app/entity/property', guiAuthz, addProperty )
  svc.delete( '/app/entity/property', guiAuthz, delProperty )
  svc.post(   '/app/entity/property/move-down', guiAuthz, addPropertyMoveDn )
  svc.get(    '/app/entity/property/status-change', guiAuthz, getPropertyStatus )
  svc.post(   '/app/entity/property/status-change', guiAuthz, setPropertyStatus )

  svc.get(    '/app/dashboard/panel', guiAuthz, getDashboardPanel )
  svc.post(   '/app/dashboard/panel', guiAuthz, addDashboardPanel )
  svc.delete( '/app/dashboard/panel', guiAuthz, delDashboardPanel )
 
  // svc.get(  '/erm', getERM )
  // svc.post( '/erm', saveERM )

  appImport.setupAPI( app )
  models.setupAPI( app )
}
// ============================================================================

async function getAppLnk( req, res )  {
  log.info( 'GET erm' )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  res.send( 
    '<a href="index.html?layout=ERM-nonav" class="erm-link">Show Data Model</a>'+
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+
    '<a href="index.html?layout=StateAdmin-nonav" class="erm-link">Manage State Models</a>'+
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+
    '<a href="index.html?layout=css-edit-nonav" class="erm-link">Customize CSS and Colors</a>'
  )
}

// --------------------------------------------------------------------------

async function getApp( req, res )  {
  log.debug( 'GET app' )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let appId = req.query.id
  if ( appId ) {
    let app = await dta.getAppById( appId )
    res.send( app )
  } else {
    let appMap = await dta.getAppList( user.scopeId, [], 'admin' )
    let apps = []
    for ( let appId in appMap ) {
      let app = appMap[ appId ]
      let dashboardLnk = ''
      if ( app.dashboard ) {
        dashboardLnk = '<a href="index.html?layout=AppDashboardPanels-nonav&id='+app.title.replaceAll(' ','_')+'">Configure</a>'
      }
      apps.push({
        active : ( app.role.length > 0),
        id : appId,
        title : app.title,
        scope : ( app.scopeId ? app.scopeId : 'all' ),
        tags  : getTagsCSV( app.scope ),
        role  : ( app.role ? app.role.join() : '' ),
        enabled  : ( app.enabled ? true : false ),
        dashboardLnk : dashboardLnk, 
        entitiesLnk : '<a href="index.html?layout=AppEntities-nonav&id='+appId+'">Manage&nbsp;Entities</a>',
        pagesLnk :'<a href="index.html?layout=AppPages-nonav&id='+appId+'">Manage&nbsp;Pages</a>',
        appLnk :'<a href="index.html?layout=AppEntity-nonav&id='+appId+','+app.startPage+'">Open&nbsp;App</a>',
        expLnk :'<a href="app/json/'+appId.replaceAll('/','_').replace('_','/')+'" target="_blank">Export</a>',
        swaggerLnk :'<a href="adapter/app/'+appId+'/swagger" target="_blank">Swagger</a>'
      })
    }
    res.send( apps )
  }
}


async function getAppForCustomize( req, res )  {
  log.debug( 'GET app/customize' )
  let { allOK, user, app, appId } = await checkUserApp( req, res )
  if ( ! allOK ) { return }

  let cApp = {
    appIdOrig   : appId,  
    appId       : appId,  // appId.substring( appId.indexOf('/') + 1 ),
    name        : app.title,
    scope       : ( app.scopeId ? app.scopeId : '-' ),
    tags        : getTagsCSV( app.scope ),
    role        : ( app.role.length > 0 ? app.role[0] : '-' ),
    img         : ( app.img ? app.img : '' ),
    enabled     : ( app.enabled ? true : false ),
    description : ( app.description ?  app.description : '' )
  }
  if ( cfg.MARKETPLACE_SERVER ) {
    cApp.marketplace = ( app.marketplace ? true : false )
    cApp.by = app.by
  }

  res.send( cApp )
}

// ============================================================================

function getTagsCSV( scope ) {
  let tags = []
  for ( let tag in scope ) {
    if ( tag.startsWith('#') ) {
      tags.push( tag.substring(1) )
    }
  }
  return tags.join()
}


async function addApp( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let appId = req.body.appId
  if ( ! appId.startsWith( user.rootScopeId ) ) {
    appId =  user.rootScopeId +'/'+ appId
  }
  if ( appId.split('/').length != 3 ) {
    return res.status(401).send( 'ID must be scope/name/version or name/version' )
  }
  log.info( 'POST /app', req.body )
  let app = await dta.getAppById( req.body.appIdOrig )
  if ( req.body.appIdOrig != req.body.appId ) { // copy mode
    let appN = await dta.getAppById( req.body.appId )
    if ( appN ){
      return res.status(401).send( 'ID or version already exists' )
    }
    app = JSON.parse( JSON.stringify( app ) )
    req.body.enabled = false
  }
  if ( ! app ) {
    app = {
      require   : {},
      entity    : {},
      page      : {},
      startPage : [],
      enabled   : false
    }
  }
  app.scopeId = ( req.body.scope == '' ? null : req.body.scope )
  app.title   = ( req.body.name ? req.body.name : req.body.id )
  app.enabled = ( req.body.enabled ? true : false )
  app.dashboard = ( req.body.dashboard ? true : false )
  if ( cfg.MARKETPLACE_SERVER ) {
    app.marketplace = ( req.body.marketplace ? true : false )
  }
  if ( app.dashboard ) {
   if ( ! app.startPage[0] || ! app.startPage[0].startsWith( 'dashboard/' ) ) {
    app.startPage.unshift( 'dashboard/' + app.title )
   }
  } else  {
    if ( app.startPage[0] &&  app.startPage[0].startsWith( 'dashboard/' ) ) {
      app.startPage.shift()
    }
  }
  if ( req.body.role == '-' ) {
    app.role = []
  } else {
    app.role = [ req.body.role ]
  }
 
  let scope = {}
  if ( req.body.tags ) {
    let tags = req.body.tags.split(',')
    for ( let tag of tags ) {
      scope[ '#'+tag ] = {
        role   : app.role
      }
    }
  }
  app.scope = scope
  app.description = req.body.description 

  if ( req.body.img == '' && app.img ) {
    delete app.img
  } else {
    app.img =  req.body.img
  }

  await dta.addApp( appId, app)
  res.send( 'OK' )
}

// --------------------------------------------------------------------------

async function getEntity( req, res )  {
  log.debug( 'GET entity',  req.query )
  let { allOK, user, app, appId } = await checkUserApp( req, res )
  if ( ! allOK ) { return }
 
  if (  req.query.appId &&  req.query.entityId && ! req.query.scope && ! req.query.parentId  ) { // get by id 
  
    if ( app.entity[ req.query.entityId ] ) {
      let entity = app.entity[ req.query.entityId ]
      return res.send({
        appId      : appId,
        entityId   : req.query.entityId,
        title      : entity.title,
        scope      : entity.scope,
        maintainer : entity.maintainer,
        start      : ( app.startPage.indexOf( req.query.entityId ) < 0 ? false : 'start' ),
        stateModel : ( entity.stateModel ? entity.stateModel : '' ),
        noEdit     : ( entity.noEdit    === true ? true : false ),
        userDelete : ( entity.noDelete  === true ? false : true ),
        csvUpload  : ( entity.csvUpload === true ? true : false )
      }) 

    } else { return res.send( null )  } // id not in scopes
  
  } else {  // get by abb id
  
    let entityArr = []
    for ( let entityId in app.entity ) {
      let entity = app.entity[ entityId ]

      let stateModel = ''
      if ( entity.stateModel ) {
        stateModel = '<a href="index.html?layout=AppEntityStatus-nonav&id='+appId+','+entityId+'">'+ entity.stateModel+'</a>'
      }

      entityArr.push({
        entityId   : entityId,
        appId      : appId,
        title      : entity.title,
        scope      : entity.scope,
        startPage  : ( app.startPage.indexOf( entityId ) < 0 ? false : true ),
        editForm   : ( entity.noEdit   === true ? false : true ),
        userDelete : ( entity.noDelete  === true ? false : true ),
        csvUpload  : ( entity.csvUpload === true ? true : false ),
        stateModel : stateModel,
        maintainer : entity.maintainer,
        propLnk :'<a href="index.html?layout=AppEntityProperties-nonav&id='+appId+','+entityId+'">Manage Properties</a>'
      })
    }
    res.send( entityArr )
  }
}

async function addEntity( req, res ) {
  log.info( 'POST entity', req.body )
  let { allOK, user, app, appId } = await checkUserApp( req, res )
  if ( ! allOK ) { return }
  if ( ! req.body.entityId ||  req.body.entityId == '' ) {
    return res.status(400).send('ID required') 
  }

  if ( ! app.startPage ) { app.startPage = [] }

  let newEntity = {
    title : req.body.title,
    scope : req.body.scope,
    maintainer : [req.body.maintainer],
    properties : ( 
      app.entity[ req.body.entityId ] ? app.entity[ req.body.entityId ].properties : 
      { "id": { type: "UUID-Index", noDelete: true, noTable: true, noEdit: true } } 
    )
  }

  if ( req.body.start ) {
    if ( app.startPage.indexOf( req.body.entityId ) == -1 ) {
      app.startPage.push( req.body.entityId )
    }
  } else {
    if ( app.startPage.indexOf( req.body.entityId ) >= 0 ) {
      app.startPage.splice( app.startPage.indexOf( req.body.entityId ), 1 )
    }
  }
  
  if ( ! req.body.userDelete ) {
    newEntity.noDelete = true
  } else if ( newEntity.userDelete ) { 
    delete newEntity.userDelete 
  }

  if ( req.body.noEdit ) {
    newEntity.noEdit = true
  } else if ( newEntity.noEdit ) { 
    delete newEntity.noEdit 
  }

  if ( req.body.csvUpload ) {
    newEntity.csvUpload = true
  } else  if ( newEntity.csvUpload ) { 
    delete newEntity.csvUpload 
  }

  if ( req.body.stateModel &&  req.body.stateModel != '' ) {
    newEntity.stateModel = req.body.stateModel 
  } else if ( newEntity.stateModel ) { 
    delete newEntity.stateModel
  }

  log.info( 'POST app', newEntity )
  if ( ! app.entity ) { app.entity = {} }
  let resultTxt = ( app.entity[ req.body.entityId ] ? 'Updated' : 'Created' )
  app.entity[ req.body.entityId ] = newEntity
  await dta.saveApp( req.body.appId, app )
  res.send( resultTxt )
}


async function inheritEntity( req, res ) {
  log.info( 'POST entity/config', req.body )
  let { allOK, user, app, appId } = await checkUserApp( req, res )
  if ( ! allOK ) { return }
  let entityId = req.body.entityId
  if ( ! entityId ||  entityId == '' ) { return res.status(400).send('ID required') }
  if ( app.entity[ entityId ] ) { return res.status(400).send('ID exists') }
  if ( !req.body.parentId ) { return res.status(400).send('Parent ID required') }
  let pid = req.body.parentId.split('/')
  if ( pid.length != 4 ) { return res.status(400).send('Parent ID wrong') }
  let parentApp = await dta.getAppById( pid[0]+'/'+ pid[1]+'/'+ pid[2] )
  if ( ! parentApp ) { return res.status(400).send('Parent app not found') }
  let parentEntity = parentApp.entity[ pid[3] ]
  if ( ! parentEntity ) { return res.status(400).send('Parent entity not found') }
  app.entity[ entityId ] = JSON.parse( JSON.stringify( parentEntity ) )
  await dta.saveApp( appId, app )
  res.send( 'OK' )
}


async function chgEntity( req, res ) {
  log.info( 'POST entity/config', req.body )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  changeEntityCfg( entity, 'creFromHeight', req ) 
  changeEntityCfg( entity, 'tableHeight', req ) 

  await dta.saveApp( appId, app )
  res.send( 'OK' )
}

function changeEntityCfg( entity, config, req ) {
  if ( req.body[ config ] ) {
    if ( req.body[ config ] == '' ) {
      if ( entity[ config ] ) {
        delete entity[ config ]
      }
    } else {
      entity[ config ] = req.body[ config ]
    }
  } 
}


async function delEntity( req, res ) {
  log.info( 'DELETE entity', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  delete app.entity[ entityId ]
  await dta.saveApp( appId, app )
  res.send( 'Entity deleted!')
  
}

// --------------------------------------------------------------------------

async function getProperty( req, res ) {
  log.debug( 'GET /app/entity/property', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  if ( req.query.propId && ! req.query.id ) { // property by id
    let dbProp = app.entity[ entityId ].properties[ req.query.propId ]
    if ( ! dbProp ) { return res.send( null ) }
    let pType =  dbProp.type
    if ( pType == 'String' && dbProp.qr ) {
      pType = 'String QR/Barcode'
    }
    
    let prop = {
      appId    : appId,
      entityId : entityId,
      propId   : req.query.propId,
      type     : pType,
      label    : ( dbProp.label ? dbProp.label : '' ),
      colWidth : ( dbProp.colWidth ? dbProp.colWidth : 'M' ),
      filter   : ( dbProp.filter ? true : false ),
      noEdit     : ( dbProp.noEdit  === true ? true : false ),
      refLbl     : ( dbProp.refLbl  === true ? true : false ),
      notNull    : ( dbProp.notNull  === true ? true : false ),
      userDelete : ( entity.noDelete === true ? false : true ),
      noTable    : ( dbProp.noTable === true ? true : false ),
      apiManaged : ( dbProp.apiManaged ? true : false ),
      description : ( dbProp.description ? dbProp.description : '' ),
    }
    propHandler.setPropRef( prop, dbProp )

    return res.send( prop )
  } 
  
  // else ... property array

  let propArr = []
  for ( let propId in app.entity[ entityId ].properties ) {
    let prop = app.entity[ entityId ].properties[ propId ]
   
    let pType = propHandler.getpropTypeDef( prop )
   
    let colWidth = 'M'
    if ( prop.colWidth ) { colWidth = prop.colWidth }
    if ( prop.noTable  ) { colWidth = '' }

    propArr.push({
      appId    : appId,
      entityId : entityId,
      propId   : propId,
      label    : prop.label,
      type     : pType,
      colWidth : colWidth,
      filter   : ( prop.filter   ? true : false ),
      api      : ( prop.apiManaged ? true : false ),
      noEdit   : ( prop.noEdit  ? true : false ),
      refLbl   : ( prop.refLbl  ? true : false ),
      notNull  : ( prop.notNull ? true : false ),
      userDelete : ( entity.noDelete === true ? false : true ),
      noTable  : ( prop.noTable ? true : false )
    })
  }
  res.send( propArr )
}

async function addPropertyMoveDn( req, res ) {
  log.info( 'POST /app/entity/property/mode-down', req.body )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  let propCopy = JSON.parse( JSON.stringify( entity.properties ))
  entity.properties = {}
  let doNext = false
  for ( let propId in propCopy ) {
    if ( propId != req.body.propId ) { 
      entity.properties[ propId ] = propCopy[ propId ]
    }
    if ( doNext ) {
      entity.properties[ req.body.propId ] = propCopy[ req.body.propId ]
      doNext = false
    }
    if ( propId == req.body.propId ) { 
      doNext = true
    }
  }
  await dta.saveApp( appId, app )
  res.send( entity.properties )
}

async function getPropertyStatus( req, res ) {
  log.debug( 'GET /app/entity/property', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  let stateModelId = entity.stateModel
  if ( ! stateModelId ) {  log.warn('GET /app/entity/property: app entity has no stateModel'); return res.status(400).send([]) }

  let states = await dta.getStateModelMap( user.rootScopeId )
  if ( ! states || ! states[ user.rootScopeId +'/'+ stateModelId ] ) {  log.warn('GET /app/entity/property: stateModel not found'); return res.status(400).send([]) }
  
  let stateModel = states[ user.rootScopeId +'/'+ stateModelId ].state

  let propArr = [] 
  // create matrix of properties (cols) and transition (rows)
  for ( let statesId in stateModel ) try {
    // log.info( ' >>>', statesId )
    for ( let transitionId in stateModel[ statesId ].actions ) {
      let actionId = statesId +'_'+ transitionId
      let propRow = { 
        appId        : appId, 
        entityId     : entityId, 
        transitionId : actionId,
        transition   : ( statesId === 'null' ? transitionId : statesId+' > '+transitionId ),
        transitionCondition : '-'
      }
      if (  entity.stateTransition && entity.stateTransition[ actionId +'_condition' ] ) {
        propRow.transitionCondition =  entity.stateTransition[ actionId +'_condition' ]
      }
      for ( let propId in entity.properties ) {
        let pId = propId.replaceAll('.','_')
        let prop = entity.properties[ propId ]
        // log.info( ' >>', propId )
        if ( ! prop.stateTransition ) { // default: all fields
          propRow[ 'prop/'+pId ] = false 
          propRow[ 'prop/'+pId+'/default' ] = '-'
        } else {
          if ( prop.stateTransition[ actionId ] ) {
            propRow[ 'prop/'+pId ] = true
          } else {
            propRow[ 'prop/'+pId ] = false
          }
          if ( prop.stateTransition[ actionId +'_default' ] ) {
            propRow[ 'prop/'+pId+'/default' ] = prop.stateTransition[ actionId +'_default' ]
          } else {
            propRow[ 'prop/'+pId+'/default' ] = '-'
          }
        }
      }
      propArr.push( propRow )
    } 
  }  catch (exc) { log.warn( 'getPropertyStatus loop', exc )}

  res.send( propArr )
}

async function setPropertyStatus( req, res ) {
  log.debug( 'GET /app/entity/property', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }
  if ( ! req.body.transitionId ) { return res.status(400).send('transitionId missing') }
  let propId = null
  let inclProp = false
  let defaultVal = null
  for ( let p in req.body ) {
    if ( p.startsWith( 'prop/') ) {
      let pParts = p.split('/')
      propId = pParts[ 1 ]
      propId = propId.replaceAll('_','.')
      if ( pParts[2] == 'default' ) { defaultVal = req.body[ p ] }
      if ( req.body[ p ] == 'true' ) { inclProp = true }
      break
    } 
  }
  if ( propId && ! entity.properties[ propId ] ){ return res.status(400).send('propId not found') }

  if ( ! entity.stateTransition ) {  entity.stateTransition = {} }
  if ( propId && ! entity.properties[ propId ].stateTransition ) { 
    entity.properties[ propId ].stateTransition = {} 
  }

  if (  req.body.transitionCondition && req.body.transitionCondition != '-' ) { 
    entity.stateTransition[ req.body.transitionId + '_condition' ] = req.body.transitionCondition
  } else {
    delete entity.stateTransition[ req.body.transitionId + '_condition' ]
  }

  if ( propId ) {
    // finally all checks done
    if ( defaultVal ) {
      entity.properties[ propId ].stateTransition[ req.body.transitionId + '_default' ] = defaultVal
    } else {
      if ( inclProp ) {
        entity.properties[ propId ].stateTransition[ req.body.transitionId ] = inclProp
      } else {
        if ( entity.properties[ propId ].stateTransition[ req.body.transitionId ] ) {
          delete entity.properties[ propId ].stateTransition[ req.body.transitionId ]
        }
      }  
    }
  }
  await dta.saveApp( appId, app )

  res.send( ( allOK ? 'OK' : 'Failed' ) )
}


async function addProperty ( req, res ) {
  log.info( 'addProperty', req.body )
  let id = req.body.propId
  let addResultTxt = ''
  if ( ! id ) { log.warn('POST /entity/property: id required'); return res.status(400).send("Id required") }

  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  if ( req.body.type == 'UUID-Index' ) { // need to check that this in only once 
    let indexKey = propHandler.getIndex( entity )  
    if ( indexKey &&  indexKey != id ) {
      if ( entity.properties[ indexKey ].type == 'UUID-Index' ) {
        return res.send( 'ERROR: UUID-Index is allowed only once' )
      }
    }
  }

  // TODO
  let jsonId = null
  let subId  = null
  if ( id.indexOf( '.' ) > 0 ) {  //  JSON sub fields
    jsonId = id.split( '.' )[0]
    subId  = id.split( '.' )[1]
    if ( ! entity.properties[ jsonId ] ) { log.warn('POST /entity/property: JSON id not found'); return res.status(400).send("JSON id not found") }
    if ( entity.properties[ jsonId ].type != 'JSON' ) { log.warn('POST /entity/property: JSON id not found'); return res.status(400).send("JSON id invalid") }
    if ( ! isValidId( subId ) ) { log.warn('POST /entity/property: JSON sub-id invalid'); return res.status(400).send("JSON sub-id invalid") }
    if ( ! [ 'String', 'Text','Boolean','Date','Select' ].includes( req.body.type  ) ) { log.warn('POST /entity/property: JSON sub type invalid'); return res.status(400).send("JSON sub-type invalid") }
  } else { // simple ID
    if ( ! isValidId( id ) ) { log.warn('POST /entity/property: id invalid'); return res.status(400).send("Id invalid") }
  }


  if ( !  entity.properties[ id ] )  {
    entity.properties[ id ] = {}
  }
 
  if ( req.body.label ) { entity.properties[ id ].label = req.body.label }
  entity.properties[ id ].type = req.body.type 

  if ( jsonId ) {
    entity.properties[ id ].jsonId = jsonId
    entity.properties[ id ].subId  = subId
  }

  if ( req.body.colWidth == 'M'  ) { 
    delete entity.properties[ id ].colWidth 
  } else {
     entity.properties[ id ].colWidth = req.body.colWidth 
  }

  if ( req.body.filter  ) { 
    entity.properties[ id ].filter = true 
  } else {
    delete entity.properties[ id ].filter
  }

  if ( req.body.apiManaged  ) { 
    entity.properties[ id ].apiManaged = true 
  } else {
    delete entity.properties[ id ].apiManaged
  }

  if ( req.body.noEdit  ) { 
    entity.properties[ id ].noEdit = true 
  } else {
    delete entity.properties[ id ].noEdit
  }
  
  if ( req.body.refLbl  ) { 
    entity.properties[ id ].refLbl = true 
  } else {
    delete entity.properties[ id ].refLbl
  }

  if ( req.body.notNull  && req.body.type != 'Boolean' ) { 
    entity.properties[ id ].notNull = true 
  } else {
    delete entity.properties[ id ].notNull
  }

  if ( req.body.userDelete  ) { 
    delete entity.properties[ id ].noDelete
  } else {
    entity.properties[ id ].noDelete = true 
  }
  
  if ( req.body.noTable ) { 
    entity.properties[ id ].noTable = true 
  } else {
    delete entity.properties[ id ].noTable
  }
  if ( req.body.description &&  req.body.description.trim() != '' ) { 
    entity.properties[ id ].description = req.body.description 
  } else {
    delete entity.properties[ id ].description
  }

  let addResult = await propHandler.addNewPropertyDef( entity.properties[ id ], req.body.type, req.body.ref )
  if ( addResult.error ) {
    delete  entity.properties[ id ]
    return res.send( 'ERROR: ' + addResult.error )
  }

  log.info( 'addProperty e', entity.properties[ id ] )

  await dta.saveApp( req.body.appId, app )
  res.send( 'Added' + addResultTxt )
}


async function delProperty( req, res ) {
  log.info( 'DELETE property', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  // TODO: Check JSON sub prop exists
  if ( entity.properties[ req.query.propId ].type == 'JSON' ) {
    for ( let propId in entity.properties ) {
      if (  entity.properties[ propId ].jsonId == req.query.propId ) {
        log.warn( 'JSON Sub id', propId )
        return res.status(400).send( 'JSON sub property exists' )
      }
    }
  }
  if ( entity.properties[ req.query.propId ] ) {
    delete entity.properties[ req.query.propId ]
    await dta.saveApp( appId, app )
    res.send( 'Property deleted!')
  }  else { 
    return res.status(401).send( 'Property not found' )
  }
}

// ============================================================================

async function getDashboardPanel( req, res ) {
  log.info( 'GET /app/dashboard/panel', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let panelArr = []
  if ( req.query._recId == '_empty' ) {
    return res.send({
      panelId : '',
      boardId : req.query.bId,
      scopeId : user.rootScopeId,
      Type    : 'Number',
      Title   : '',
      SubText : '',
      PosX    : '1',
      PosY    : '1',
      Size    : '1x1',
      Entity  : '',
      Query   : '{}',
      Prop    : '',
      Descr   : '',
      Style   : '',
      CSS     : 'L',
      Img     : ''
    })
  } else if ( req.query.id  &&  req.query.layout ) { // board id
    let panels = await dta.getData( 
      user.rootScopeId + '_dashboard', 
      user.rootScopeId,
      false,
      { "Board": req.query.id } 
    )
    for ( let panelId in panels ) {
      let panel = panels[ panelId ]
      let e = panel.Metric.Entity.split('/')
      panelArr.push({
        panelId : panel.id,
        scopeId : panel.scopeId,
        Board   : panel.Board,
        Title   : panel.Title,
        CSS     : ( panel.CSS ? panel.CSS : 'L' ),
        Type    : panel.Type,
        Pos     : panel.Pos[0]+','+panel.Pos[1],
        Size    : panel.Size[0]+'x'+panel.Size[1],
        Entity  : e[0]+'/'+e[1]+'/'+e[2]+'/'+e[4],
        Query   : JSON.stringify( panel.Metric.Query ),
        Prop    : panel.Metric.Prop
      })
    }
    return res.send( panelArr )
  } else if ( req.query.panelId ) {
    let p = await dta.getDataById( user.rootScopeId + '_dashboard', req.query .panelId )
    if ( ! p ) { return res.status(401).send( 'not found' ) }
    let e = p.Metric.Entity.split('/')
    let panel = {
      panelId : p.id,
      boardId : p.Board,
      scopeId : p.scopeId,
      Type    : p.Type,
      Title   : p.Title,
      SubText : p.SubText,
      PosX    : p.Pos[0],
      PosY    : p.Pos[1],
      Size    : p.Size[0] +'x'+ p.Size[1],
      Entity  : e[0]+'/'+e[1]+'/'+e[2]+'/'+e[4],
      Query   : JSON.stringify( p.Metric.Query ),
      Prop    : p.Metric.Prop,
      Descr   : p.Metric.Descr,
      Style   : p.Metric.Style,
      CSS     : p.CSS,
      Img     : p.Img
    }
    log.debug( 'panel', panel )
    return res.send( panel )
  }
  res.send([])
}

async function addDashboardPanel( req, res ) {
  log.info( 'POST /app/dashboard/panel', req.query, req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let s = req.body.Size.split('x')
  let size = [ Number.parseInt( s[0] ),  Number.parseInt( s[1] ) ]
  let e = req.body.Entity.split('/')
  log.info(' >>>', e )
  if ( ! e || e.length != 4 ) { return res.send('ERROR: Entity must have format: "scope/app-name/ver/entity-name"') }
  let panel = {
    scopeId : user.rootScopeId,
    Board   : req.body.boardId,
    Type    : req.body.Type,
    Title   : req.body.Title,
    SubText : req.body.SubText,
    Pos     : [ Number.parseInt( req.body.PosX ), Number.parseInt( req.body.PosY ) ],
    Size    : size,
    CSS     : req.body.CSS,
    Img     : req.body.Img,
    Metric  : {
      Entity : e[0]+'/'+e[1]+'/'+e[2]+'/entity/'+e[3],
      Query  : JSON.parse( req.body.Query ),
      Prop   : req.body.Prop,
      Descr  : req.body.Descr,
      Style  : req.body.Style
    } 
  }
  if ( req.body.panelId  &&  req.body.panelId != 'undefined' ) {
    panel.id = req.body.panelId
  } else {
    panel.id = helper.uuidv4()
  }
  await dta.addDataObjNoEvent( user.rootScopeId + '_dashboard', panel.id, panel )
  res.send( 'OK' )
}


async function delDashboardPanel( req, res ) {
  res.send('TODO')
}

// ============================================================================

function isValidId( str ) {
  return /^[a-zA-Z@]+[a-zA-Z0-9\-]+$/.test( str )
}


function isScopeId( str ) {
  return /^(\/{0,1})[A-Za-z0-9\/\-_]+?$/.test( str )
}

function getAllTags( scopeArr ) {
  let tags = []
  for ( let scope of scopeArr ){
    for ( let aTag of scope.tagArr ) {
      if ( tags.indexOf( aTag ) == -1 ) {
        tags.push( aTag )
      }
    }
  }
  return tags
}

// ============================================================================

async function checkUserAppEntity( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    res.status(401).send( 'login required' ) 
    return { allOK: false, user: null, app: null, entity: null, entityId: null }
  }
  let appId    = null 
  let entityId = null 
  if ( req.query.appId ) { 
    appId = req.query.appId 
  } else if ( req.query.id ) {
    appId = req.query.id.split(',')[0] 
  } else if ( req.body.appId ) {
    appId = req.body.appId 
  }
  if ( ! appId ) { 
    res.status(400).send([]) 
    return { allOK: false, user: user, app: null, appId: appId, entity: null, entityId: entityId }
  }
  if ( req.query.entityId ) { 
    entityId = req.query.entityId 
  } else if ( req.query.id ) {
    entityId = req.query.id.split(',')[1] 
  } else if ( req.body.entityId ) {
    entityId = req.body.entityId 
  }
  // let entityId = ( req.query.entityId ? req.query.entityId : req.query.id.split(',')[1] )
  let app = await dta.getAppById( appId )
  // log.info( 'GET /app/entity/property', appId, entityId, app )
  if ( ! app ) { 
    log.warn( 'app not found', appId, app )
    res.status(400).send('app not found') 
    return { allOK: false, user: user, app: null, appId: appId, entity: null, entityId: entityId }
  }
  if ( ! app.startPage ) { app.startPage = [] }
  if ( ! app.entity ) { app.entity = {} }
  if ( ! app.entity[ entityId ] ) {  
    log.warn( 'app entity not found', entityId )
    res.status(400).send('app entity not found') 
    return { allOK: false, user: user, app: app, entity: null }
  }
  return { allOK: true, user: user, app: app, appId: appId, entity: app.entity[ entityId ], entityId: entityId }
}

//-----------------------------------------------------------------------------

async function checkUserApp( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    res.status(401).send( 'login required' ) 
    return { allOK: false, user: null, app: null }
  }
  let appId    = null 
  if ( req.query.appId ) { 
    appId = req.query.appId 
  } else if ( req.query.id ) {
    appId = req.query.id.split(',')[0] 
  } else if ( req.body.appId ) {
    appId = req.body.appId 
  }
  if ( ! appId ) { 
    res.status(400).send([]) 
    return { allOK: false, user: user, app: null, appId: appId }
  }
  // let entityId = ( req.query.entityId ? req.query.entityId : req.query.id.split(',')[1] )
  let app = await dta.getAppById( appId )
  // log.info( 'GET /app/entity/property', appId, entityId, app )
  if ( ! app ) { 
    log.warn('GET entity: /app/entity/property not found')
    res.status(400).send([]) 
    return { allOK: false, user: user, app: null, appId: appId }
  }
  if ( ! app.startPage ) { app.startPage = [] }
  if ( ! app.entity ) { app.entity = {} }
  return { allOK: true, user: user, app: app, appId: appId }
}


// ============================================================================
