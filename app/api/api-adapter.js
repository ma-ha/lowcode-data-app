/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const helper     = require( '../helper/helper' )
const props      = require( '../data/propertyHandler' )

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

  //---------------------------------------------------------------------------
  const apiAuthz = apiSec.apiAppAuthz( app )
  const provisioningApiAppAuthz = apiSec.provisioningApiAppAuthz( )

  svc.post(   '/adapter/scope', provisioningApiAppAuthz, creRootScope )
  svc.get(    '/adapter/scope', provisioningApiAppAuthz, getRootScopes )
  svc.delete( '/adapter/scope', provisioningApiAppAuthz, delRootScope )
  svc.delete( '/adapter/user',  provisioningApiAppAuthz, delUser )

  svc.get(  '/adapter/scope/:scopeId', apiAuthz, getSubScopes )
  svc.post( '/adapter/scope/:scopeId', apiAuthz, addSubScope )
  
  svc.get(  '/adapter/app/:scopeId', apiAuthz, getAppList )
  svc.get(  '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, getApp )
  svc.post( '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, creApp )

  svc.get(  '/adapter/state/:scopeId/:stateId', apiAuthz, getStateModel )
  svc.post( '/adapter/state/:scopeId/:stateId', apiAuthz, creStateModel )

  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId',        apiAuthz, getDocArr )
  svc.get(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, getDoc )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, addDoc )
  svc.put(   '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId', apiAuthz, chgDoc )
  svc.post(  '/adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:state/:action', apiAuthz, changeDocStatus )
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
  let appId = req.params.scopeId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { log.warn( 'Not found', appId ); return res.status(400).send('Not found') }
  res.send( app )
}

// ----------------------------------------------------------------------------
async function creStateModel( req, res ) {
  log.info( 'creStateModel...')
  let stateModelId = req.params.scopeId +'/'+ req.params.stateId
  let stateModel  = await dta.getDataById( 'state', stateModelId )
  if ( stateModel ) {return sendErr( res, 'state model exists' ) }
  stateModel = req.body
  stateModel.scopeId = req.params.scopeId
  await dta.addDataObj( 'state', stateModelId, stateModel )
  res.send({status: 'OK'})
}


async function getStateModel( req, res ) {
  log.info( 'getStateModel...')
  let stateModelId = req.params.scopeId +'/'+ req.params.stateId
  let stateModel  = await dta.getDataById( 'state', stateModelId )
  if ( ! stateModel ) {return sendErr( res, 'state model not found' ) }
  res.send( stateModel )
}

// ----------------------------------------------------------------------------

async function getDocArr( req, res ) {
  log.info( 'GET data array', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  if ( ! await checkApp( req, res ) ) { return }
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId
  let recs = await dta.getData( tbl, req.params.scopeId ) // TODO filter
  log.info( 'recs',recs)
  res.send( recs )
}


async function getDoc( req, res ) {
  log.info( 'GET data by id', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.recId )
  if ( ! await checkApp( req, res ) ) { return }
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId
  let rec = await dta.getDataById( tbl, req.params.recId )
  log.info( 'rec',rec )
  res.send( rec )
}


async function addDoc( req, res )  {
  log.info( 'Add data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let app = await checkApp( req, res )
  if ( ! app ) { return }
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId

  let rec = req.body
  let recId = req.params.recId 
  if ( ! recId ) {
    recId = helper.uuidv4()
    rec.id = recId
  }

  let properties = app.entity[ req.params.entityId ].properties
  // for ( let propId in req.body ) {
  //   if ( ! properties[ propId ] ) {
  //     log.warn( 'api-adapter: properties not defined', propId )
  //     return res.status( 400 ).send( )
  //   }
  // }
  for ( let propId in properties ) {
    if ( propId == 'id'  && properties.id == 'UUID'  && ! rec.id ) { 
      recId = helper.uuidv4()
      rec.id = recId
      continue
    }
    let p = rec[ propId ]
    if ( ! p ) {
      log.warn( 'api-adapter: properties missing', propId )
      return res.status( 400 ).send( )
    }
    let paramOK = props.validateParam( p, properties[ propId ].type ) 
    if ( ! paramOK ) {
      return  sendErr( res, 'api-adapter: body not valid: '+propId )
    }
  }
  rec.scopeId = req.params.scopeId
  let result = await dta.addDataObj( tbl, recId, rec )
  if ( result ) {
    res.send({ status: 'OK', id: recId })
  } else {
    res.send({ error: '?' })
  }
}


async function chgDoc( req, res )  {
  log.info( 'Upd data', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId )
  let app = await checkApp( req, res )
  if ( ! app ) { return }
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId
  let doc = await dta.getDataById( tbl, req.params.recId )
  if ( ! doc ) { return sendErr( res, 'Not found' ) }

  let updates = req.body
  for ( let propId in updates ) {
    if ( [ 'id', 'scopeId', '_state' ].includes( propId ) ) { continue }
    doc[ propId ] = updates[ propId ]
  }

  let result = await dta.addDataObj( tbl, req.params.recId, doc )
  if ( result ) {
    res.send({ status: 'OK', doc: doc })
  } else {
    res.send({ error: '?' })
  }
}


// ----------------------------------------------------------------------------
async function changeDocStatus( req, res )  {
  log.info( 'Change Status', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.state, req.params.action )
  log.debug( 'Change Status', req.body )
  let app = await checkApp( req, res )
  let properties = app.entity[ req.params.entityId ].properties
  if ( ! app ) { return }
  let stateModelId =  app.entity[ req.params.entityId ].stateModel
  if ( ! stateModelId ) { return sendErr( res, 'Change Status: entity has no state' ) }
  let stateModel = await dta.getDataById( 'state', req.params.scopeId +'/'+ stateModelId )
  if ( ! stateModel ) { return sendErr( res, 'Change Status: state model error' ) } // should not happen, but...
  let stateDef = stateModel.state[ req.params.state ]
  if ( ! stateDef ) { return sendErr( res, 'Change Status: state not found' ) } 
  let stateAction = stateDef.actions[ req.params.action ]
  if ( ! stateAction ) { return sendErr( res, 'Change Status: state action not found' ) }
  
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId

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

  let result = await dta.addDataObj( tbl, rec.id, rec )
  if ( result ) {
    res.send({ status: 'OK', id: rec.id, doc: rec  })
  } else {
    res.send({ error: '?' })
  }
}


async function getDocByStatus( req, res )  {
  log.info( 'Change Status', req.params.scopeId, req.params.appId, req.params.appVersion, req.params.entityId, req.params.state )
  log.debug( 'Change Status', req.body )
  let app = await checkApp( req, res )
  if ( ! app ) { return }
  let stateModelId =  app.entity[ req.params.entityId ].stateModel
  if ( ! stateModelId ) { return sendErr( res, 'Change Status: entity has no state' ) }
  let stateModel = await dta.getDataById( 'state', req.params.scopeId +'/'+ stateModelId )
  if ( ! stateModel ) { return sendErr( res, 'Change Status: state model error' ) } // should not happen, but...
  let stateDef = stateModel.state[ req.params.state ]
  if ( ! stateDef ) { return sendErr( res, 'Change Status: state not found' ) } 
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId
  
  let qry = { '_state': req.params.state }
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
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! await checkApp( req, res ) ) { return }
  let tbl = getRootScope( req.params.scopeId ) + req.params.entityId
  let result = await dta.delDataObj( tbl, req.params.recId )
  res.send( result )
}


async function delCollection( req, res )  {
  log.info( 'Del Collectinm', req.params.scopeId, req.params.entityId )
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
  if ( ! app ) { 
    log.warn( 'api-adapter: app not found', appId )
    res.status( 400 ).send( )
    return null 
  }
  if ( ! app.entity[ req.params.entityId ] ) { 
    log.warn( 'api-adapter: entity not found', appId )
    res.status( 400 ).send( )
    return null 
  }
  return app
}