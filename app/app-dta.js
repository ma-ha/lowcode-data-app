/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log       = require( './helper/log' ).logger
const cfg       = require( 'config' )
const eh        = require( './even-hub' )
const fs        = require( 'fs' )
const { mkdir, writeFile, readFile, rename, rm, stat } = require( 'node:fs/promises' )

exports: module.exports = { 
  init,
  getAppList,
  getApp,
  getAppById,
  addApp,
  saveApp,
  getData,
  getDataById,
  getDataObjX,
  idExists,
  addDataObj
}

// ============================================================================
const DB_DIR = '../dta/'
const APP_TBL = DB_DIR + 'app.json' 

async function init() {
  data[ 'app' ] =  JSON.parse( await readFile( APP_TBL ) )
}

// ============================================================================
async function getAppList( scopeId, scopeTags ) {
  log.debug( 'getAppList', scopeId, scopeTags )
  let rootScope = scopeId
  if ( scopeId.indexOf('/') > 0 ) {
    rootScope = scopeId.substring(0, scopeId.indexOf('/') )  
  }
  // log.info( 'getAppList rootScope', rootScope )

  let appMap = await getData( 'app', rootScope )
  let apps = []
  // log.info( 'getAppList appMap', appMap )
  if ( appMap ) {
    for ( let appId in appMap ){
      let app = appMap[ appId ]
      // log.info( 'getAppList appId', appId,  app.scope )
      if ( app.scope[ scopeId ] ) {
        // log.info( '   >>> add' )
        apps.push({ 
          id: appId, 
          title: app.title,
          img   : ( app.img ? app.img : 'img/k8s-ww-conn.png' ),
          link  : appId,
          startPage : app.startPage
        })
      } else {
        for ( let tag of scopeTags ) {
          if ( app.scope[ '#'+tag ] ) {
            // log.info( '   >>> add #', tag )
            apps.push({ 
              id    : appId, 
              title : app.title,
              img   : ( app.img ? app.img : 'img/k8s-ww-conn.png' ),
              link  : appId,
              startPage : app.startPage
            })
            break
          }
        }
      }
    }
  } 
  return apps
}

async function getApp( scopeId, appId ) {
  log.debug( 'getApp', scopeId, appId )
  await syncTbl( 'app' )
  if ( data.app[ scopeId +'/'+ appId ] ) {
    return data.app[  scopeId +'/'+ appId  ]
  }
  return null
}

async function getAppById( fullAppId ) {
  log.debug( 'getApp',fullAppId )
  await syncTbl( 'app' )
  if ( data.app[fullAppId] ) {
    return data.app[  fullAppId ]
  }
  return null
}
async function addApp( fullAppId, app ) {
  log.info( 'getApp',fullAppId )
  await syncTbl( 'app' )
  data.app[ fullAppId ] = app
  await writeFile( APP_TBL, JSON.stringify( data[ 'app' ], null, '  ' ) )
}
async function saveApp( fullAppId, app ) {
  log.info( 'saveApp',fullAppId )
  data.app[ fullAppId ] = app
  await writeFile( APP_TBL, JSON.stringify( data[ 'app' ], null, '  ' ) )
}
// ============================================================================

// tbl param can be like "1000city" or "1000/region-mgr/1.0.0/city"
async function getData( tbl, scopeId ) {  
  log.debug( 'getData',  tbl, scopeId )
  let table = tbl
  let inheritData = false
  if ( tbl.indexOf('/') > 0 ) {
    let tlbComp = tbl.split('/')
    table = tlbComp[0] + tlbComp[3]
    log.debug( 'getData table',  table )
    let app = await getAppById(  tlbComp[0] +'/'+ tlbComp[1] +'/'+ tlbComp[2] )
    let entity = app.entity[ tlbComp[3] ]
    if ( entity.scope == 'inherit' || entity.scope == 'inherit-readonly' ) { 
      inheritData = true 
    }
  } else {

  }
  await syncTbl( table )
  let result = {}
  for ( let recId in data[ table ] ) {
    log.debug( 'getData dta', recId, inheritData  )
    if ( inheritData ) {
      if ( scopeId.indexOf( data[ table ][ recId ].scopeId ) >= 0 ) {
        result[ recId ] = data[ table ][ recId ]
      }
    } else {
      if ( data[ table ][ recId ].scopeId == scopeId ){
        result[ recId ] = data[ table ][ recId ]
      }
    }
  }
  return result
}


async function getDataById( tbl, id ) {
  log.debug( 'getDataById',tbl, id  )
  await syncTbl( tbl )
  if ( data[ tbl ] && data[ tbl ][ id ] ) {
    return data[ tbl ][ id ] 
  }
  return null
}

async function scopeInherited( rootScopeId, appId, appVersion, entityId ) {
  let inherit = false
  try {
    let appIdx = rootScopeId +'/'+ appId +'/'+ appVersion
    let app = data.app[ appIdx ]
    let entity = app.entity[ entityId ]
    if ( entity.scope == 'inherit' || entity.scope == 'inherit-readonly' ) { 
      inherit = true 
    }
  } catch ( exc ) { log.error( '', exc ) }
  
  return inherit
}

async function idExists( tbl, id  ) {
  log.info( 'idExists', tbl, id )
  await syncTbl( tbl )
  if ( data[ tbl ][ id ] ) {
    return data[ tbl ][ id ] 
  }
  return null
}

async function getDataObjX( rootScopeId, appId, appVersion, entityId, userScopeId, id  ) {
  log.debug( 'getDataObjX', rootScopeId, appId, appVersion, entityId, userScopeId, id )
  let tbl = rootScopeId + entityId
  await syncTbl( tbl )
  let inherit = await scopeInherited( rootScopeId, appId, appVersion, entityId )
  let result = null
  if ( id  ) { 
    // single rec by id
    let rec = data[ tbl ][ id ] 
    log.debug( 'getDataObjX rec', rec )
    if ( rec && scopeOK( userScopeId, rec.scopeId  , inherit ) ) {
      result = rec
    }
  
  } else {
    // array of data fo scope
    result = []
    for ( let recId in data[ tbl ] ) {
      let rec = data[ tbl ][ recId ]
      if ( scopeOK( userScopeId, rec.scopeId, inherit ) ) {
        result.push( rec )  
      }
    }
  }
  return result
}

function scopeOK( userScope, recScope, inherit ) {
  log.debug( 'scopeOK',userScope, recScope, inherit )
  let ok = false
  if ( inherit ) { 
    if ( userScope.startsWith( recScope ) ) {
      ok = true 
    }
  } else if ( userScope == recScope ) {
    ok = true 
  }
  return ok
}


async function addDataObj( tbl, id, obj ) {
  log.debug( 'addDataObj', tbl, id, obj)
  await syncTbl( tbl )
  let cre = null
  if ( data[ tbl ][ id.trim() ] ) { cre = data[ tbl ][ id.trim() ]._cre }
  data[ tbl ][ id.trim() ] = obj
  data[ tbl ][ id.trim() ].id  = id.trim()
  if ( cre ) {
    data[ tbl ][ id.trim() ]._cre = cre
  } else {
    data[ tbl ][ id.trim() ]._cre = Date.now()
  }
  data[ tbl ][ id.trim() ]._upd = Date.now()
  let dbFile = DB_DIR + tbl + '.json'
  await writeFile( dbFile, JSON.stringify( data[ tbl ], null, '  ' ) )
  
  eh.publishDataChgEvt( 'add', obj.scopeId+'/'+id, tbl, obj )
  return true
}

async function syncTbl( tbl ) {
  log.debug( 'syncTbl', tbl )
  let dbFile = DB_DIR + tbl + '.json'
  if ( ! fs.existsSync( dbFile ) ) {
    await writeFile( dbFile, '{}' )
  }
  if ( ! data[ tbl ] ) {
    log.info('>> readFile', dbFile)
    data[ tbl ] =  JSON.parse( await readFile( dbFile ) )
  } 
}


let data = {
 
}