/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log       = require( '../helper/log' ).logger
const eh        = require( '../eh/even-hub' )
const userDB    = require( './app-dta-user' )
const fs        = require( 'fs' )
const { mkdir, writeFile, readFile, rename, rm, stat } = require( 'node:fs/promises' )

exports: module.exports = { 
  init,
  getAppList,
  getApp,
  getAppById,
  addApp,
  saveApp,
  getStateModelById,
  getData,
  getDataById,
  getDataObjX,
  idExists,
  addDataObj,
  delDataObj,
  delCollection,
  delRootScope
}

// ============================================================================
let DB_DIR = null
const APP_TBL = 'app' 
const STATE_TBL = 'state' 
const ERM_TBL = 'erm'
const EH_SUB_TBL = 'erm'

async function init( dbDir, fakeLogin ) {
  DB_DIR  = dbDir 
  if ( ! DB_DIR.endsWith( '/' ) ) { DB_DIR += '/' }

  await prepDB()

  userDB.init( DB_DIR, fakeLogin )

  data[ APP_TBL ] =  JSON.parse( await readFile( fileName( APP_TBL ) ) )

}

// ============================================================================

async function prepDB() {
  if ( ! fs.existsSync( DB_DIR ) ) {
    fs.mkdirSync( DB_DIR )
    let dbFile = 
    await writeFile( fileName( APP_TBL ), "{}" ) 
    const { createHash } = require( 'node:crypto' )
    let pwd = createHash('sha256').update('demo').digest('hex')

    await writeFile( fileName( 'user-auth' ), JSON.stringify({
      demo: {
        name: "Demo",
        role: {
          dev     : [ "1000" ],
          admin   : [ "1000" ],
          appUser : [ "1000" ],
          api     : []
        },
        password: pwd,
        expires: 2234567890000,
        lastLogin: 1707424667309
      }
    }, null, ' ' ))

    await writeFile( fileName( 'scope' ), JSON.stringify({
      1000: {
        name: "Test Tenant",
        tag: []
      }
    }, null, ' ' ))

  }
}

// ============================================================================
async function getAppList( scopeId, scopeTags, mode ) {
  log.debug( 'getAppList', scopeId, scopeTags )
  let rootScope = scopeId
  if ( scopeId.indexOf('/') > 0 ) {
    rootScope = scopeId.substring(0, scopeId.indexOf('/') )  
  }
  // log.info( 'getAppList rootScope', rootScope )

  await syncTbl( APP_TBL )

  let apps = {}
  for ( let appId in data[ APP_TBL ] ) {
    let app = data[ APP_TBL ][ appId ]
    let appInScope = false
    log.debug( 'getAppList >', app.scope,  app.scopeId )
    if ( mode == 'admin'  &&  appId.startsWith( rootScope ) ) {
      appInScope = true
    } else if ( app.scope[ scopeId ] || app.scopeId == scopeId ) {
      appInScope = true
    } else {
      for ( let tag of scopeTags ) {
        if ( app.scope[ '#'+tag ] ) {
          log.debug( 'getAppList > #',tag )
          appInScope = true
        }
      }
    }
    if ( appInScope ) {
      apps[ appId ] = app
    }
  }
  return apps
}

async function getApp( scopeId, appId ) {
  log.debug( 'getApp', scopeId, appId )
  await syncTbl( APP_TBL )
  if ( data.app[ scopeId +'/'+ appId ] ) {
    return data.app[  scopeId +'/'+ appId  ]
  }
  return null
}

async function getAppById( fullAppId ) {
  log.info( 'getApp',fullAppId )
  await syncTbl( APP_TBL )
  if ( data.app[fullAppId] ) {
    return data.app[  fullAppId ]
  }
  return null
}

async function addApp( fullAppId, app ) {
  log.info( 'getApp',fullAppId )
  await syncTbl( APP_TBL )
  data.app[ fullAppId ] = app
  await writeFile( fileName( APP_TBL ), JSON.stringify( data[ APP_TBL ], null, '  ' ) )
  eh.publishDataChgEvt( 'app.add', fullAppId, APP_TBL, app )
}

async function saveApp( fullAppId, app ) {
  log.info( 'saveApp',fullAppId )
  data.app[ fullAppId ] = app
  await writeFile( fileName( APP_TBL ), JSON.stringify( data[ APP_TBL ], null, '  ' ) )
  eh.publishDataChgEvt( 'app.chg', fullAppId, APP_TBL, app )
}

// ============================================================================

async function getStateModelById( rootScopeId, stateModelId ) {
  log.info( 'getStateModelById', rootScopeId, stateModelId  )
  await syncTbl( 'state', true )
  // log.info( 'data.state', data.state )
  if ( data.state[ rootScopeId +'/'+ stateModelId ] ) {
    return data.state[ rootScopeId +'/'+ stateModelId ]
  }
  return null
}
// ============================================================================

// tbl param can be like "1000city" or "1000/region-mgr/1.0.0/city"
async function getData( tbl, scopeId, admin ) {  
  log.info( 'getData',  tbl, scopeId )
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
    // nothing
  }
  await syncTbl( table )
  let result = {}
  for ( let recId in data[ table ] ) {
    log.info( 'getData dta:',inheritData,  recId, scopeId, data[ table ][ recId ].scopeId  )
    if ( admin ) {
      result[ recId ] = data[ table ][ recId ]
    } else  if ( inheritData ) {
      // if ( scopeId.indexOf( data[ table ][ recId ].scopeId ) >= 0 ) {
      if ( data[ table ][ recId ].scopeId.startsWith( scopeId ) ) {
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

async function getDataObjX( rootScopeId, appId, appVersion, entityId, userScopeId, id, filterParams ) {
  log.info( 'getDataObjX', rootScopeId, appId, appVersion, entityId, userScopeId, id, filterParams )
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
        if ( filterParams ) {  // only not null if there are params set
          let hit = false
          for ( let f in filterParams ) {
            if ( rec[f] && rec[f].indexOf( filterParams[f] ) >= 0 ) {
              hit = true
              break
            }
          }
          if ( hit ) {
            result.push( rec )  
          }
        } else {
          result.push( rec )  
        }
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


async function addDataObj( tbl, id, obj, evt ) {
  log.info( 'addDataObj', tbl, id )
  await syncTbl( tbl )
  let cre = null
  let dtaEvt = 'dta.add'
  if ( data[ tbl ][ id.trim() ] ) {
    cre = data[ tbl ][ id.trim() ]._cre 
    dtaEvt = 'dta.update'
  }
  data[ tbl ][ id.trim() ] = obj
  data[ tbl ][ id.trim() ].id  = id.trim()
  if ( cre ) {
    data[ tbl ][ id.trim() ]._cre = cre
  } else {
    data[ tbl ][ id.trim() ]._cre = Date.now()
  }
  data[ tbl ][ id.trim() ]._upd = Date.now()
  let dbFile = fileName( tbl )
  await writeFile( dbFile, JSON.stringify( data[ tbl ], null, '  ' ) )
  
  eh.publishDataChgEvt( ( evt ? evt : dtaEvt ), id, tbl, obj )
  return true
}


async function delDataObj( tbl, id, ) {
  log.info( 'delDataObj', tbl, id )
  await syncTbl( tbl )
  let idT = id.trim() 
  if ( ! data[ tbl ]  ||  ! data[ tbl ][ idT ] ) { return "Not found" }
  log.info( 'delDataObj', tbl, data[ tbl ][ idT ] )
  delete  data[ tbl ][ idT ]
  let dbFile = fileName( tbl )
  await writeFile( dbFile, JSON.stringify( data[ tbl ], null, '  ' ) )

  eh.publishDataChgEvt( 'dta.del', id, tbl )
  return "Deleted"
}

// ============================================================================
async function delCollection( scopeId, entityId ) {
  let dbFile = fileName( scopeId + entityId )
  if ( fs.existsSync( dbFile ) ) {
    await rm( dbFile )
  }
}

async function delRootScope( scopeId ) {
  cleanUpScopeInTbl( APP_TBL, scopeId )
  cleanUpScopeInTbl( STATE_TBL, scopeId )
  cleanUpScopeInTbl( ERM_TBL, scopeId )
  cleanUpScopeInTbl( EH_SUB_TBL, scopeId )
   return 'OK'
}

async function cleanUpScopeInTbl( tbl, scopeId ) {
  await syncTbl( tbl )
  for ( let id in data[ tbl ] ) {
    if ( id.startsWith( scopeId ) ) {
      log.info( 'cleanUpScopeInTbl delete:', scopeId, tbl, id )
      delete data[ tbl ][ id ]
    }
  }
  await writeFile( fileName( tbl ), JSON.stringify( data[ tbl ], null, '  ' ) )
}
// ============================================================================

async function syncTbl( tbl, always ) {
  log.debug( 'syncTbl', tbl )
  let dbFile = fileName( tbl )
  if ( ! fs.existsSync( dbFile ) ) {
    await writeFile( dbFile, '{}' )
  }
  if ( ! data[ tbl ]  || always ) {
    log.info('>> readFile', dbFile )
    data[ tbl ] =  JSON.parse( await readFile( dbFile ) )
  } 
}


function fileName( tbl ) {
  return DB_DIR + tbl + '.json'

}


let data = {
 
}