/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const helper     = require( '../helper/helper' )
const props      = require( '../data/propertyHandler' )
const swaggerHlp  = require( './swagger' )

exports: module.exports = { 
  setupAPI  
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null
let cfg = {}
async function setupAPI( app, config ) {
  log.info( 'Starting API...' )
  cfg = config

  let svc = app.getExpress()
  gui = app

  svc.use( bodyParser.urlencoded({  limit: "20mb", extended: false }) )
  svc.use( bodyParser.json({ limit: "20mb" }) )

  //---------------------------------------------------------------------------
  const apiAuthz = apiSec.apiAppAuthz( app )
  const provisioningApiAppAuthz = apiSec.provisioningApiAppAuthz( )
  const guiAuthz = apiSec.userTenantAuthz( gui )

  svc.post(   '/adapter/scope', provisioningApiAppAuthz, creRootScope )
  svc.get(    '/adapter/scope', provisioningApiAppAuthz, getRootScopes )
  svc.delete( '/adapter/scope', provisioningApiAppAuthz, delRootScope )
  svc.delete( '/adapter/user',  provisioningApiAppAuthz, delUser )

  svc.get(  '/adapter/scope/:scopeId', apiAuthz, getSubScopes )
  svc.post( '/adapter/scope/:scopeId', apiAuthz, addSubScope )
  
  svc.get(  '/adapter/app/:scopeId', apiAuthz, getAppList )
  svc.get(  '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, getApp )
  svc.post( '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, creApp )
  svc.get(  '/adapter/app/:scopeId/:appId/:appVersion/swagger', guiAuthz, swagger )

  svc.get(  '/adapter/state/:scopeId/:stateId', apiAuthz, getStateModel )
  svc.post( '/adapter/state/:scopeId/:stateId', apiAuthz, creStateModel )

  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId',        apiAuthz, getDocArr )
  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, getDoc )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, addDoc )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/:entityId', apiAuthz, addDocs )
  svc.put(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, chgDoc )
  svc.put(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId', apiAuthz, chgDocs )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:state/:action', apiAuthz, changeDocStatus ) // no recId since it mau also be a create
  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:state', apiAuthz, getDocByStatus )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/:entityId',        apiAuthz, addDoc )
  svc.delete('/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, delDoc )
  svc.delete('/adapter/entity/:scopeId/:entityId', apiAuthz, delCollection )
}

// ----------------------------------------------------------------------------

async function creRootScope( req, res ) {
  log.info( 'creRootScope...')
  if ( ! req.body.name || ! req.body.owner ) { log.warn( 'creRootScope data missing' ); return res.status(400).send() }
  if ( ! req.body.adminEmail || ! req.body.adminPassword ) { log.warn( 'creRootScope admin missing' );return res.status(400).send() }
  if ( ! req.body.apiId || ! req.body.apiKey ) { log.warn( 'creRootScope SP missing' );return res.status(400).send() }

  let scopeId = await userDta.creRootScope( 
    req.body.name,
    req.body.adminEmail,
    req.body.owner,
    ( req.body.tagArr ? req.body.tagArr : [] ),
    ( req.body.dev ? req.body.dev : false ) // noCustomizing = false ... allowed by default
  )

  log.info( 'creRootScope admin user...')
  let adminUser = {
    name :  req.body.adminEmail,
    role : {
      dev     : [ scopeId],
      admin   : [ scopeId ],
      appUser : [ scopeId ],
      api     : [] 
    },
    password : req.body.adminPassword,
    expires  : null
  }

  await userDta.addUser( req.body.adminEmail, adminUser )

  log.info( 'creRootScope admin SP...')

  let newSP = {
    name : req.body.apiId,
    sp   : true,
    role : {
      dev     : [],
      admin   : [],
      appUser : [],
      api     : [ scopeId ] 
    },
    password : req.body.apiKey,
    expires  : null
  }
  await userDta.addUser( req.body.apiId, newSP )

  res.send({
    status  : 'OK',
    scopeId : scopeId
  })
}


async function getRootScopes( req, res ) {
  log.info( 'getRootScopes...')
  let scopeMap = await userDta.getRootScopes()
  res.send( scopeMap )
}


async function delRootScope( req, res ) {
  log.info( 'delRootScope...', req.body )
  let result = 'OK'
  let result1 = await userDta.delRootScope( req.body.scopeId )
  if ( result1 != ' OK ') { result = result1 }
  let result2 = await dta.delRootScope( req.body.scopeId )
  if ( result2 != ' OK ') { result = result2 }
  res.send({ status : result })
}


async function delUser( req, res ) {
  log.info( 'delUser...', req.body  )
  let result = await userDta.delUser( req.body.userId )
  res.send({ status : result })
}

// ----------------------------------------------------------------------------

async function getSubScopes( req, res ) {
  log.info( '...')
  res.send({status: 'TODO'})
}

async function addSubScope( req, res ) {
  log.info( '...')
  res.send({status: 'TODO'})
}

// ----------------------------------------------------------------------------

async function creApp( req, res ) {
  log.info( 'creApp...')
  let appId = req.params.scopeId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( app ) { log.warn( 'app exists', appId ); return res.status(400).send() }
  app = req.body
  await dta.addApp( appId, app )
  res.send({status: 'OK'})
}

async function getAppList( req, res ) {
  log.info( 'getAppList...')
  let tags = []
  if ( req.query.tags ) {
    // TODO
  }
  let appMap = await dta.getAppList( req.params.scopeId, tags  )
  res.send( appMap )
}

async function getApp( req, res ) {
  log.info( 'getApp...')
  let { app } = await checkApp( req, res )
  if ( ! app ) { return }
  res.send( app )
}

async function swagger( req, res ) {
  log.info( 'getApp...')
  let { app } = await checkApp( req, res )
  if ( ! app ) { return }
  let appId = req.params.scopeId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let appSwaggerSpec = swaggerHlp.genAppSwagger( 
    app, 
    req.params.scopeId,
    req.params.appId,
    req.params.appVersion, 
    cfg 
  )
  res.send( appSwaggerSpec )
}


// ----------------------------------------------------------------------------
async function creStateModel( req, res ) {
  log.info( 'creStateModel...')
  let { stateModelId, stateModel } = await getStateModelById( req )
  if ( stateModel ) {return sendErr( res, 'state model exists' ) }
  stateModel = req.body
  stateModel.scopeId = req.params.scopeId
  let uri = '/adapter/state/' + stateModelId
  await dta.addDataObjNoEvent( 'state', stateModelId, stateModel, uri )
  res.send({status: 'OK'})
}


async function getStateModel( req, res ) {
  log.info( 'getStateModel...')
  let { stateModelId, stateModel } = await getStateModelById( req )
  if ( ! stateModel ) {return sendErr( res, 'state model not found' ) }
  res.send( stateModel )
}

// ----------------------------------------------------------------------------

async function getDocArr( req, res ) {
  log.info( 'GET data array', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let { app, tbl, entity } = await checkApp( req, res )
  if ( ! app ) { return }
  let qry = extractQuery( req )
  if ( qry == 'ERROR' ) { return sendErr( res, 'Query not valid' ) }
  let recs = await dta.getData( tbl, req.params.scopeId, false, qry ) 
  let resultMap = {}
  for ( let recId in recs ) {
    let recCpy = getApiRec( recs[ recId ], entity )
    resultMap[ recId ] = recCpy
  }
  log.debug( 'recs',resultMap )
  res.send( resultMap )
}


async function getDoc( req, res ) {
  log.info( 'GET data by id', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.recId )
  let { app, tbl, entity } = await checkApp( req, res )
  if ( ! app ) { return }
  let rec = await dta.getDataById( tbl, req.params.recId )
  let recCpy = getApiRec( rec, entity )
  log.debug( 'rec',recCpy )
  res.send( recCpy )
}


function getApiRec( rec, entity ) {
  let recCpy = JSON.parse( JSON.stringify( rec ) )
  for ( let propId in entity.properties ) {
    if ( entity.properties[ propId ].type == 'API static string' ) {
      recCpy[ propId ] = entity.properties[ propId ].apiString
    }
  }
  return recCpy
}


async function addDocs( req, res ) { // add doc w/o id or list
  log.info( 'Add data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let { app, tbl, entity, properties } = await checkApp( req, res )
  if ( ! app ) { return }
  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'

  let docMap = {}
  if ( Array.isArray( req.body ) ) {
  
    let idArr = []
    for ( let rec of req.body ) {
      if ( ! chkPropValid( rec, properties, res )  ) { return }
      rec.scopeId = req.params.scopeId
    }
    for ( let rec of req.body ) {
      await dta.addDataObj( tbl, rec.id, rec, uri + rec.id, null, entity )
      idArr.push( rec.id )
      docMap[ rec.id ] = rec
    }
    return res.send({ status: 'OK', idArr: idArr, docMap: docMap })

  } else {

    let rec = req.body
    if ( ! chkPropValid( rec, properties, res )  ) { return }
    rec.scopeId = req.params.scopeId
    await dta.addDataObj( tbl, rec.id, rec, uri + rec.id, null, entity )
    return res.send({ status: 'OK', id: rec.id })
  }
}

async function addDoc( req, res )  {
  log.info( 'Add data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let { app, tbl, entity,properties } = await checkApp( req, res )
  if ( ! app ) { return }
  let rec = req.body
  if ( ! rec.id ) {
    rec.id = req.params.recId 
  }
  if ( ! chkPropValid( rec, properties, res )  ) { return }
  rec.scopeId = req.params.scopeId
  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'+rec.id
  let result = await dta.addDataObj( tbl, rec.id, rec, uri, null, entity )
  if ( result ) {
    res.send({ status: 'OK', id: rec.id })
  } else {
    res.send({ error: '?' })
  }
}

function chkPropValid( rec, properties, res ) {
  for ( let propId in properties ) {
    if ( ! rec.id ) { 
      rec.id = helper.uuidv4()
      continue
    }
    if ( properties[ propId ].type == 'API static string' ) { continue }
    let p = rec[ propId ]
    if ( ! p ) {
      log.warn( 'api-adapter: properties missing', propId )
      res.status( 400 ).send( )
      return false
    }
    let paramOK = props.validateParam( p, properties[ propId ].type ) 
    if ( ! paramOK ) {
      sendErr( res, 'api-adapter: body not valid: '+propId )
      return false
    }
  }
  return true
}


async function chgDoc( req, res )  {
  log.info( 'Upd data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let { app, tbl, entity } = await checkApp( req, res )
  if ( ! app ) { return }
  let doc = await dta.getDataById( tbl, req.params.recId )
  if ( ! doc ) { return sendErr( res, 'Not found' ) }

  let updates = req.body
  for ( let propId in updates ) {
    if ( [ 'id', 'scopeId', '_state' ].includes( propId ) ) { continue }
    doc[ propId ] = updates[ propId ]
  }
  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'+rp.recId
  let result = await dta.addDataObj( tbl, req.params.recId, doc, uri, 'dta.update', entity )
  if ( result ) {
    res.send({ status: 'OK', id: rp.recId, doc: doc })
  } else {
    res.send({ error: '?' })
  }
}


async function chgDocs( req, res )  {
  log.info( 'Upd data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let { app, tbl, entity } = await checkApp( req, res )
  if ( ! app ) { return }
  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'

  if ( ! Array.isArray( req.body ) ) { return sendErr( res, 'array required' ) }

  let docMap = {}
  for ( let updates of req.body ) { // first check all
    let doc = await dta.getDataById( tbl,updates.id )
    if ( ! doc ) { return sendErr( res, 'Not found' ) }
  }
  
  for ( let updates of req.body ) { // now do all updates
    let doc = await dta.getDataById( tbl, updates.id )
    let containUpdates = false
    if ( ! doc ) { return sendErr( res, 'Not found' ) }
    for ( let propId in updates ) {
      if ( [ 'id', 'scopeId', '_state' ].includes( propId ) ) { continue }
      doc[ propId ] = updates[ propId ]
      containUpdates = true
    }
    if ( containUpdates ) {
      await dta.addDataObj( tbl, updates.id, doc, uri + updates.id, 'dta.update', entity )
    }
    docMap[ updates.id ] = doc
  }
  res.send({ status: 'OK', docMap: docMap })
}

// ----------------------------------------------------------------------------
async function changeDocStatus( req, res )  {
  log.info( 'Change Status', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.state, req.params.action )
  log.debug( 'Change Status', req.body )
  let { app, tbl, entity, properties } = await checkApp( req, res )
  if ( ! app ) { return }

  let { stateModelId, stateModel, stateDef, stateAction } = await extractStateModel( req, res, entity )
  if ( ! stateModel ) { return }
   
  let rec = {}
  if ( req.params.state != 'null' ) {
    rec = await dta.getDataById( tbl, req.body.id )
    if ( ! rec ) { return sendErr( res, 'Change Status: document not found' ) }
    if ( ! rec._state || rec._state !=  req.params.state ) {
      return sendErr( res, 'Change Status: wrong state not found' )
    }
  } else {
    // create ...
    // id
    if ( req.body.id ) {
      let dbRec = await dta.getDataById( tbl, req.body.id )
      if ( dbRec ) { return sendErr( res, 'Change Status: document exists' ) }
      rec.id = req.body.id
    } else if ( properties.id && properties.id.type == 'UUID' ) { 
      rec.id = helper.uuidv4()
    } else {
      return sendErr( res, 'Change Status: id required' )
    }
    // scopeId
    if ( req.body.scopeId ) {
      if ( req.body.scopeId.startsWith( req.params.scopeId ) ) {
        rec.scopeId = eq.body.scopeId
      } else {
        return sendErr( res, 'Change Status: scopeId not allowed' )
      }
    } else {
      rec.scopeId = req.params.scopeId
    }
  }
  // check re.body for all prop req in transition
  let stateActionId =  req.params.state +'_' +  req.params.action
  for ( let propId in properties ) {
    if ( propId == 'id' ) { continue }
    let propMust = false
    if ( properties[ propId ].stateTransition ) {
      if ( properties[ propId ].stateTransition[ stateActionId ] ) {
        propMust = true
      }
    }
    log.debug( 'Change Status', stateActionId, propId, propMust,  req.body[ propId ] )

    if ( propMust ) {
      if ( ! req.body[ propId ] ) {
        return sendErr( res, 'Change Status: property required for action' )
      }
    } else {
      if ( req.body[ propId ] ) {
        return sendErr( res, 'Change Status: property not allowed for action' )
      }
    }
  }
  // finally
  for ( let p in req.body ) {
    rec[ p ] = req.body[ p ]
  }
  
  rec._state = stateAction.to
  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'+rec.id
  let result = await dta.addDataObj( tbl, rec.id, rec, uri, 'dta.change-status', entity )
  if ( result ) {
    res.send({ status: 'OK', id: rec.id, doc: rec  })
  } else {
    res.send({ error: '?' })
  }
}


async function getDocByStatus( req, res )  {
  log.info( 'getDocByStatus', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.state )
  log.debug( 'getDocByStatus', req.body )
  let { app, tbl, entity } = await checkApp( req, res )
  if ( ! app ) { return }

  let { stateModelId, stateModel } = await extractStateModel( req, res, entity )
  if ( ! stateModel ) { return }
  
  let qry = extractQuery( req )
  if ( qry == 'ERROR' ) { return sendErr( res, 'Get Doc By Status: Query not valid' ) }
  if ( ! qry ) { qry = {} }
  qry[ '_state' ] = req.params.state 

  let docMap = await dta.getData( tbl, req.params.scopeId, false, qry )
  
  let result = []
  for ( let docId in docMap ) {
    result.push( docMap[ docId ])
  }
  res.send( result )
}
// ----------------------------------------------------------------------------

async function delDoc( req, res )  {
  log.info( 'Del data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.recId )
  // let user = await userDta.getUserInfoFromReq( gui, req )
  let { app, tbl, entity } = await checkApp( req, res )
  if ( ! app ) { return }
  let result = await dta.delDataObj( tbl, req.params.recId, entity )
  res.send({ status: result })
}


async function delCollection( req, res )  {
  log.info( 'Del Collection', req.params.scopeId, req.params.entityId )
  await dta.delCollection( req.params.scopeId, req.params.entityId  )
  res.send({ status: 'OK'})
}


// function extractFilter( filterQuery ){
//   let filter = null
//   if ( filterQuery ) {
//     for (  let fp in filterQuery ) { try {
//       let query = filterQuery[ fp ].replaceAll( '%20', ' ' ).trim()
//       if ( query != '' ) {
//         if ( ! filter ) { filter = {} }
//         filter[ fp ] = query
//       }
//     } catch ( exc ) { log.warn( 'extractFilter', exc ) }}
//   }
//   return filter
// }

// ----------------------------------------------------------------------------

function sendErr( res, err ) {
  log.warn( err )
  res.status( 400 ).send( )
}

function getRootScope( scopeId ) {
  if ( scopeId.indexOf('/') > -0 ) {
    let scopeArr = scopeId.split('/')
    return scopeArr[0]
  }
  return scopeId
}


async function checkApp( req, res ) {
  let appId = req.params.scopeId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  let tbl = null
  let entity = null
  let properties = null

  if ( ! app ) { 
    log.warn( 'api-adapter: app not found', appId )
    res.status( 400 ).send( )
    return { app: null }
  }
  if ( req.params.entityId  ) {
    if ( ! app.entity[ req.params.entityId ] ) { 
      log.warn( 'api-adapter: entity not found', appId )
      res.status( 400 ).send( )
      return { app: null } 
    }
    tbl = getRootScope( req.params.scopeId ) + req.params.entityId
    entity = app.entity[ req.params.entityId ]
    properties = entity.properties
  }
  return { app: app, tbl: tbl, entity: entity, properties: properties }
}

// ----------------------------------------------------------------------------
async function getStateModelById( req ) {
  let stateModelId = req.params.scopeId +'/'+ req.params.stateId
  let stateModel  = await dta.getDataById( 'state', stateModelId )
  return { stateModelId: stateModelId, stateModel: stateModel}
}

async function extractStateModel( req, res, entity ) {
  log.info( 'getStateModel', entity )
  let stateModelId = entity.stateModel
  if ( ! stateModelId ) { 
    sendErr( res, 'Get StateModel: entity has no state' ) 
    return { stateModelId: null, stateModel: null, stateDef: null, stateAction: null }
  }
  let stateModel = await dta.getDataById( 'state', req.params.scopeId +'/'+ stateModelId )
  if ( ! stateModel ) { 
    sendErr( res, 'Get StateMode: state model error' ) 
    return { stateModelId: null, stateModel: null, stateDef: null, stateAction: null }
  } // should not happen, but...
  let stateDef = stateModel.state[ req.params.state ]
  if ( ! stateDef ) { 
    sendErr( res, 'Get StateMode: state not found' )
    return { stateModelId: null, stateModel: null, stateDef: null, stateAction: null }
  }
  let stateAction = null
  if ( req.params.action ) {
    stateAction = stateDef.actions[ req.params.action ]
    if ( ! stateAction ) {
      sendErr( res, 'Get StateMode: state action not found' ) 
      return { stateModelId: null, stateModel: null, stateDef: null, stateAction: null }
    }
  }
  return { 
    stateModelId : stateModelId,
    stateModel   : stateModel,
    stateDef     : stateDef,
    stateAction  : stateAction
  }
}
// ----------------------------------------------------------------------------
function extractQuery( req ) {
  let qry = null
  try {
    if ( req.query.query ) {
      qry = JSON.parse( req.query.query )
    }      
  } catch ( exc ) {
    log.warn( 'extractQuery', exc.message )
    return "ERROR"
  }
  log.info( '>>>>>>>' , qry )
  return qry
}