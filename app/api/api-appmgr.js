/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const appImport  = require( './api-app-import' )
const propHandler= require( '../data/propertyHandler' )
const models     = require( './api-models' )

exports: module.exports = { 
  setupAPI
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null

async function setupAPI( app ) {
  let svc = app.getExpress()
  gui = app

  const guiAuthz = apiSec.customizeAuthz( gui )

  // --------------------------------------------------------------------------

  svc.get(  '/app-lnk/html', guiAuthz, getAppLnk ) // for HTML view above the app list
  svc.get(  '/app', guiAuthz, getApp )
  svc.post( '/app', guiAuthz, addApp )
  svc.get(  '/app/customize', guiAuthz, getAppForCustomize )
  
  svc.get(    '/app/entity', guiAuthz, getEntity )
  svc.post(   '/app/entity', guiAuthz, addEntity )
  svc.post(   '/app/entity/config', guiAuthz, chgEntity )
  svc.delete( '/app/entity', guiAuthz, delEntity )

  svc.get(    '/app/entity/property', guiAuthz, getProperty )
  svc.post(   '/app/entity/property', guiAuthz, addProperty )
  svc.delete( '/app/entity/property', guiAuthz, delProperty )
  svc.post(   '/app/entity/property/move-down', guiAuthz, addPropertyMoveDn )
  svc.get(    '/app/entity/property/status-change', guiAuthz, getPropertyStatus )
  svc.post(   '/app/entity/property/status-change', guiAuthz, setPropertyStatus )

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
  res.send( '<a href="index.html?layout=ERM-nonav" class="erm-link">Show Data Model</a>')
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
      apps.push({
        active : ( app.role.length > 0),
        id : appId,
        title : app.title,
        scope : ( app.scopeId ? app.scopeId : 'all' ),
        tags  : getTagsCSV( app.scope ),
        role  : ( app.role ? app.role.join() : '' ),
        enabled  : ( app.enabled ? true : false ),
        entitiesLnk :'<a href="index.html?layout=AppEntities-nonav&id='+appId+'">Manage&nbsp;Entities</a>',
        pagesLnk :'<a href="index.html?layout=AppPages-nonav&id='+appId+'">Manage&nbsp;Pages</a>',
        appLnk :'<a href="index.html?layout=AppEntity-nonav&id='+appId+','+app.startPage+'">Open&nbsp;App</a>',
        expLnk :'<a href="app/json/'+appId.replaceAll('/','_').replace('_','/')+'" target="_blank">Export</a>'
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
    appId : appId,  // appId.substring( appId.indexOf('/') + 1 ),
    name  : app.title,
    scope : ( app.scopeId ? app.scopeId : '-' ),
    tags  : getTagsCSV( app.scope ),
    role  : ( app.role.length > 0 ? app.role[0] : '-' ),
    img   : ( app.img ? app.img : '' ),
    enabled  : ( app.enabled ? true : false )
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
  let app = await dta.getAppById( appId )
  if ( ! app ) {
    app = {
      require   : {},
      entity    : {},
      page      : {},
      startPage : [],
      enabled   : false
    }
  }
  app.scopeId = ( req.body.scope == '-' ? null : req.body.scope )
  app.title   = ( req.body.name ? req.body.name : req.body.id )
  app.enabled = ( req.body.enabled ? true : false )
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
  log.info( 'GET entity',  req.query )
  let { allOK, user, app, appId } = await checkUserApp( req, res )
  if ( ! allOK ) { return }
 
  if (  req.query.appId &&  req.query.entityId && ! req.query.scope  ) { // get by id 
  
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
        noEdit     : ( entity.noEdit === true ?  'no' : 'yes' ),
        userDelete : ( entity.noDelete === true ? false : true )
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
        startPage  : ( app.startPage.indexOf( entityId ) < 0 ? '': 'yes' ),
        editForm   : ( entity.noEdit === true ? 'hide' : 'yes' ),
        userDelete : ( entity.noDelete === true ? 'no' : 'yes' ),
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

  if ( ! app.startPage ) { app.startPage = [] }

  let newEntity = {
    title : req.body.title,
    scope : req.body.scope,
    maintainer : [req.body.maintainer],
    properties : ( app.entity[ req.body.entityId ] ? app.entity[ req.body.entityId ].properties : {} )
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
  } 

  if ( req.body.noEdit == 'noEdit' ) {
    newEntity.noEdit = true
  } else {
    delete newEntity.noEdit
  }

  if ( req.body.stateModel &&  req.body.stateModel != '' ) {
    newEntity.stateModel = req.body.stateModel 
  } else {
    delete newEntity.stateModel
  }

  log.info( 'POST app', newEntity )
  if ( ! app.entity ) { app.entity = {} }
  let resultTxt = ( app.entity[ req.body.entityId ] ? 'Updated' : 'Created' )
  app.entity[ req.body.entityId ] = newEntity
  await dta.saveApp( req.body.appId, app )
  res.send( resultTxt )
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
   
    propArr.push({
      appId    : appId,
      entityId : entityId,
      propId   : propId,
      label    : prop.label,
      type     : pType,
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
  res.send( entity.properties )
}

async function getPropertyStatus( req, res ) {
  log.debug( 'GET /app/entity/property', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  let stateModelId = entity.stateModel
  if ( ! stateModelId ) {  log.warn('GET /app/entity/property: app entity has no stateModel'); return res.status(400).send([]) }

  let states = await dta. getData( 'state', user.rootScopeId )
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

  await propHandler.addNewPropertyDef( entity.properties[ id ], req.body.type, req.body.ref )

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

function isValidId( str ) {
  return /^[a-zA-Z]+[a-zA-Z0-9\-]+$/.test( str )
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
