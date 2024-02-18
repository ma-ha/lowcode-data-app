/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )

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

  const guiAuthz = apiSec.userTenantAuthz( gui )

  // --------------------------------------------------------------------------

  svc.get( '/erm', guiAuthz, getERM )
  svc.post('/erm', guiAuthz, saveERM )

  svc.get( '/state-model', guiAuthz, getStateModel )

  
}
// ============================================================================

async function getERM( req, res )  {
  log.info( 'GET erm' )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let appId = req.query.id
  if ( appId ) {
    let app = await dta.getAppById( appId )
    res.send( app )
  } else {
    let ermCfg = await dta.getDataById( 'erm', user.rootScopeId )
    if ( ! ermCfg ) { ermCfg = {} }
    let appMap = await dta.getAppList( user.scopeId, [], 'admin' )
    let erm = {
      entity: {}
    }
    let x = 100
    let y = 100
    let i = 0 
    let cols = [ 'k8s-bg-blue','k8s-bg-lblue', 'k8s-bg-gray','k8s-bg-tk', 'k8s-bg-redgr', 'k8s-bg-lblue2', 'k8s-bg-lblue3' ]
    for ( let appId in appMap ) { try {
      let app = appMap[ appId ]
      for ( let entityId in app.entity ) {
        let entity = app.entity [ entityId ]
        let xp = x
        let yp = y
        if ( ermCfg[ appId+'/'+entityId ] ) {
          xp = ermCfg[ appId+'/'+entityId ].x
          yp = ermCfg[ appId+'/'+entityId ].y
        } else {
          x += 150
          if ( x > 900 ) {
            x = 100
            y += 150
          }
        }
        let title =  entity.title
        if ( ! title || title == '' ) {
          title = entityId
        }
        if ( entity.stateModel ) {
          title += '\n<i>&lt;'+ entity.stateModel +'&gt;</i>'
        }
        let e = {
          appId    : appId,
          appName  : app.title,
          entityId : appId+'/'+entityId,
          id       : entityId,
          name     : title,
          x : xp,
          y : yp,
          color : cols[i],
          rel : {}
        }
        for ( let prpId in entity.properties ) {
          let prop = entity.properties[ prpId ]
          if ( prop.type == 'SelectRef' ) {
            e.rel[ prpId ] = {
              toEntity : prop.selectRef,
              mFrm     : 'n',
              mTo      : '1'
            }
          } else if ( prop.type == 'DocMap' ) {
            try {
              let p = prop.docMap.split('/') // this is scope/app/ver/ent/prop
              e.rel[ prpId ] = {
                toEntity : p[0] +'/'+ p[1] +'/'+ p[2]  +'/'+ p[3], // this is scope/app/ver
                mFrm     : '1',
                mTo      : 'n'
              }
            } catch ( exc ) { log.warn( 'ERM rel', exc ) }
          } else if ( prop.type == 'MultiSelectRef' ) {
            e.rel[ prpId ] = {
              toEntity : prop.multiSelectRef,
              mFrm     : 'n',
              mTo      : 'm'
            }
          }
        }

       
        erm.entity[ appId+'/'+entityId ] = e 
      }
    
      i++
      if ( i == cols.length ) { i = 0 }

    } catch ( exc ) { log.error( 'GET erm', exc)} }
    res.send( erm )
  }
}

async function saveERM( req, res ) {
  try {
    log.debug( 'POST erm' )
    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( ! user ) { return res.status(401).send( 'login required' ) }
    let ermCfg = {}
    for ( let e in req.body.entity ) {
      ermCfg[ e ] = {
        x : req.body.entity[ e ].x,
        y : req.body.entity[ e ].y
      }
    }
    await dta.addDataObj( 'erm', user.rootScopeId, ermCfg )
  } catch ( exc ) { log.error( 'POST erm', exc ) } 
  res.send( {} )
}

// ============================================================================


async function getStateModel( req, res )  {
  log.info( 'GET STM', req.query )
  let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
  if ( ! allOK ) { return }

  let stateModel = await dta.getStateModelById( user.rootScopeId, entity.stateModel )
  if ( ! stateModel ) { 
    log.warn( 'stateModel no found', stateModel, entity.stateModel )
    return res.status(400).send( 'not found required' ) 
  }
  
  let stm = { state: {} }
  
  let x = 100

  for ( let stateId in stateModel.state ) {
    let state = stateModel.state[ stateId ]
    stm.state[ stateId ] = {
      id    : stateId,
      name  : ( state.label ? state.label : stateId ),
      x     : ( state.x ? state.x : x ),
      y     : ( state.y ? state.y : 100 ), 
      color : 'k8s-bg-blue',
      rel : {}
    }
    if ( ! state.x ) { x += 150 }
    for ( let actionId in state.actions ) {
      let action = state.actions[ actionId ]
      stm.state[ stateId ].rel[ actionId ] = {
        to    : action.to,
        label : { txt: ( action.label ? action.label : actionId ) },
        line  : ( action.line ? action.line : [] )
      }
      if ( action.labelPos ) {
        stm.state[ stateId ].rel[ actionId ].label.pos = action.labelPos
      }
    }  
  }

  res.send( stm )
}

// ============================================================================

async function checkUserAppEntity( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'checkUserAppEntity no user')
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
    log.warn( 'checkUserAppEntity no appId')
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
