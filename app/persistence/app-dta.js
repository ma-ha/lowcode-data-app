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
  getStateModelMap,
  getStateModelById,
  saveStateModel,
  getData,
  getDataById: loadDataById,
  getDataObjX,
  isQueried,
  idExists,
  addDataObj,
  addDataObjNoEvent,
  delDataObj,
  delDataObjNoEvent,
  delCollection,
  delRootScope,
  getSubscriptions,
  subscribeEvt,
  unsubscribeEvt
}

// ============================================================================
let DB_DIR = null

const EH_SUB_TBL = 'event-subscriptions'
const SYNC_ALWAYS = true

let DB = null 

async function init( cfg ) {
  log.info( 'Init Persistence...')
  if ( cfg.PERSISTENCE ) { // EXTERNAL IMPLEMENTATION
    let extPersistenceOK = true

    const dbMethods = ['info','prepDB',
      'loadData','loadDataById','savedDataObj','delData'
    ]
    for ( let dbMethod of dbMethods ) {
      if ( ! cfg.PERSISTENCE[ dbMethod ] ) {
        log.error( "REQUIRED METHOD NOT FOUND:", dbMethod )
        extPersistenceOK = false
      }
    }
    const userMethods = ['getNextScopeId','loadScopes','saveScope','delScope',
      'loadUserArr','loadUserById','saveUser','delUser','loadUserScope','saveUserScope',
      'loadOidcSessions','saveOidcSessions'
    ]
    for ( let dbMethod of userMethods ) {
      if ( ! cfg.PERSISTENCE.USER[ dbMethod ] ) {
        log.error( "EXTERNAL PERSISTENCE: REQUIRED METHOD NOT FOUND:", dbMethod )
        extPersistenceOK = false
      }
    }
    if ( extPersistenceOK ) { 
      DB = cfg.PERSISTENCE
      log.info( 'USE:', DB.info() )

      DB.prepDB()

      userDB.init( cfg )
      return 
    } else {
      process.exit()
    }
  }

  log.info( 'USE JSON FILE DB' )

  DB_DIR  = cfg.DATA_DIR 
  if ( ! DB_DIR.endsWith( '/' ) ) { DB_DIR += '/' }

  await prepDB()

  userDB.init( cfg )
}

// ============================================================================

async function prepDB() {
  if ( ! fs.existsSync( DB_DIR ) ) {
    fs.mkdirSync( DB_DIR )
    //let dbFile = 
  }


  if ( ! fs.existsSync(  fileName( 'scope' ) ) ) {
    await writeFile( fileName( 'scope' ), JSON.stringify({
      1000: {
        name: "Test Tenant",
        tag: []
      }
    }, null, ' ' ))
  }

  // migrate old "app" table to "<scopeId>_app" table
  let appMap = {}
  if ( fs.existsSync( fileName( 'app' ) ) ) {
    appMap = await syncTbl( 'app', SYNC_ALWAYS )
  }
  let scopeMap = await syncTbl( 'scope', SYNC_ALWAYS )
  for ( let scopeId in scopeMap ) {
    if ( scopeId.indexOf('/') == -1 ) { //root scope
      if ( ! fs.existsSync( fileName( appTblName( scopeId ) ) ) ) {
        let scopeAppMap = {}
        for ( let appId in appMap ) {
          if ( appId.startsWith( scopeId ) ) {
            scopeAppMap[ appId ] = appMap[ appId ]
          }
        }
        await writeFile( 
          fileName( appTblName( scopeId ) ),
          JSON.stringify( scopeAppMap, null, '  ' )
        )
      } 
    }
  }
  if ( fs.existsSync( fileName( 'app' ) ) ) {
    await rm( fileName( 'app' ) )
  }

  // migrate old "state" table to "<scopeId>_state" table
  let stateMap = {}
  if ( fs.existsSync( fileName( 'state' ) ) ) {
    stateMap = await syncTbl( 'state', SYNC_ALWAYS )
  }
  for ( let scopeId in scopeMap ) {
    if ( scopeId.indexOf('/') == -1 ) { //root scope
      if ( ! fs.existsSync( fileName( stateTblName( scopeId ) ) ) ) {
        let scopeStateMap = {}
        for ( let stateId in stateMap ) {
          if ( stateId.startsWith( scopeId ) ) {
          scopeStateMap[ stateId ] = stateMap[ stateId ]
          }
        }
        await writeFile( 
          fileName( stateTblName( scopeId ) ),
          JSON.stringify( scopeStateMap, null, '  ' )
        )
      } 
    }
  }
  if ( fs.existsSync( fileName( 'state' ) ) ) {
    await rm( fileName( 'state' ) )
  }

  // migrate old "erm" table to "<scopeId>_erm" table
  let ermMap = {}
  if ( fs.existsSync( fileName( 'erm' ) ) ) {
    ermMap = await syncTbl( 'erm', SYNC_ALWAYS )
  }
  for ( let scopeId in scopeMap ) {
    if ( scopeId.indexOf('/') == -1 ) { //root scope
      if ( ! fs.existsSync( ermTblName( scopeId ) ) ) {
        let scopeErmMap = {}
        for ( let ermId in ermMap ) {
          if ( ermId.startsWith( scopeId ) ) {
            scopeErmMap[ ermId ] = ermMap[ ermId ]
          }
        }
        await writeFile( 
          fileName( ermTblName( scopeId ) ),
          JSON.stringify( scopeErmMap, null, '  ' )
        )
      } 
    }
  }
  if ( fs.existsSync( fileName( 'erm' ) ) ) {
    await rm( fileName( 'erm' ) )
  }


  // initialiye empty DB with 1st tenant
  if ( ! fs.existsSync( fileName( 'user-auth' )) ) {
    const { createHash } = require( 'node:crypto' )
    let pwd = createHash('sha256').update('demo').digest('hex')

    await writeFile( fileName( 'user-auth' ), JSON.stringify({
      demo: {
        userId : 'demo',
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
  }

  // migrate dashboards for v0.30.0
  for ( let scopeId in scopeMap ) try {
    if ( fs.existsSync( fileName( scopeId + '_dashboard' ) ) ) {
      let dashboard = await syncTbl( scopeId + '_dashboard', SYNC_ALWAYS )
      let needSave = false
      for ( let panelId in dashboard ) {
        let panel = dashboard[ panelId ] 
        if ( ! panel.appId ) {
          panel.boardId = 'Dashboard'
          let appMap = await getAppList( scopeId, null, 'admin' )
          for ( let appId in appMap ) {
            let app =  appMap[ appId ]
            if ( app.title.replaceAll(' ','') == panel.Board.replaceAll('_','') ) {
              log.warn( 'MIGRATE ',  scopeId + '_dashboard', panelId )
              panel.appId = appId
              needSave = true
              continue
            }
          }
        }
      }
      if ( needSave ) {
        await writeFile( fileName( scopeId + '_dashboard' ), JSON.stringify( dashboard, null, '  ' ) )
      }

    }
  } catch ( exc ) { log.error('Dashboard migration failed:', exc ) }
}

function appTblName( scopeId ) {
  return scopeId +'_app'
}

function stateTblName( scopeId ) {
  return scopeId + '_state'
}

function ermTblName( scopeId ) {
  return scopeId +'_erm'
}

// ============================================================================
async function getAppList( scopeId, scopeTags, mode ) {
  log.debug( 'getAppList', scopeId, scopeTags )
  let rootScope = scopeId
  if ( scopeId.indexOf('/') > 0 ) {
    rootScope = scopeId.substring(0, scopeId.indexOf('/') )  
  }
  log.info( 'getAppList rootScope', rootScope, scopeId, scopeTags, mode )

  let apps = {}
  let appMap = await loadData( appTblName( rootScope ) )
  for ( let appId in appMap ) {
    if ( ! appId.startsWith( rootScope ) ) { continue }
    let app = appMap[ appId ]
    let appInScope = false
    log.debug( 'getAppList >', app.scope,  app.scopeId )
    if ( mode == 'marketplace' ) {
      appInScope = app.marketplace
    } else if ( mode == 'admin'  &&  appId.startsWith( rootScope ) ) {
      appInScope = true
    } else if ( app.scope[ scopeId ] || app.scopeId == scopeId ) {
      appInScope = true
    } else if ( ! app.scopeId && JSON.stringify( app.scope ) == '{}' ) { // all scopes
      log.debug( '>>>', appId, ' >> all scopes')
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
  return getAppById( scopeId +'/'+ appId ) 
}

async function getAppById( fullAppId ) {
  log.debug( 'getAppById',fullAppId )
  let { scopeId } = splitAppId( fullAppId )
  log.debug( 'getAppById',fullAppId, scopeId )
  return await loadDataById( appTblName( scopeId ), fullAppId )
}

async function addApp( fullAppId, app ) {
  log.debug( 'getApp',fullAppId )
  let { scopeId } = splitAppId( fullAppId )
  await addDataObjNoEvent( appTblName( scopeId ), fullAppId, app )
  let uri = '/adapter/app/' + fullAppId
  eh.publishDataChgEvt( 'app.add', fullAppId, uri, 'app', app )
}

async function saveApp( fullAppId, app ) {
  log.info( 'saveApp',fullAppId )
  let { scopeId } = splitAppId( fullAppId )
  await addDataObjNoEvent( appTblName( scopeId ), fullAppId, app )
  let uri = '/adapter/app/' + fullAppId
  eh.publishDataChgEvt( 'app.chg', fullAppId, uri, 'app', app )
}

function splitAppId( fullAppId ) {
  let idPart = fullAppId.split( '/' )
  return {
    scopeId : idPart[0],
    appName : idPart[1],
    appVer  : idPart[2]
  }
}

// ============================================================================

async function getStateModelMap( rootScopeId ) {
  log.debug( 'getStateModelMap', rootScopeId  )
  let stateModeMap = await syncTbl( rootScopeId+'_state' )
  return stateModeMap
}

async function getStateModelById( stateModelId ) {
  let rootScopeId = stateModelId.split('/')[0]
  log.debug( 'getStateModelById', rootScopeId, stateModelId  )
  let stateModel = await loadDataById( rootScopeId+'_state', stateModelId )
  log.debug( 'getStateModelById', stateModel  )
  return stateModel
}

async function saveStateModel( stateModelId, stateModel ) {
  let rootScopeId = stateModel.scopeId
  if ( stateModelId.indexOf('/') != -1 ) {
    let part = stateModelId.split('/')
    rootScopeId = part[0]
  }
  await addDataObjNoEvent( rootScopeId+'_state', stateModelId, stateModel )
}

// ============================================================================

// tbl param can be like "1000city" or "1000/region-mgr/1.0.0/city"
async function getData( tbl, scopeId, admin, qry ) {
  log.debug( 'getData',  tbl, scopeId )
  let table = tbl
  await syncTbl( tbl )
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
  let dtaMap = await loadData( table, qry )
  let result = {}
  for ( let recId in dtaMap ) {
    let rec = dtaMap[ recId ]
    if ( ! isQueried( rec, qry ) ) { continue }
    log.debug( 'getData dta:', inheritData, recId, scopeId, rec.scopeId  )
    if ( admin ) {
      result[ recId ] = rec
    } else  if ( inheritData ) {
      if ( scopeId.indexOf( rec.scopeId ) >= 0 ) {
      // if ( rec.scopeId.startsWith( scopeId ) ) {
        result[ recId ] = rec
      }
    } else {
      if ( rec.scopeId == scopeId ){
        result[ recId ] = rec
      }
    }
  }
  return result
}

function isQueried( doc, qry ) {
  log.debug( 'QRY', qry )
  if ( ! qry ) { return true }
  for ( let q in qry ) {
    if ( ! doc[q]  ||  doc[q] != qry[q] ) { return false }
  }
  return true
}

async function scopeInherited( rootScopeId, appId, appVersion, entityId ) {
  let inherit = false
  try {
    let appIdx = rootScopeId +'/'+ appId +'/'+ appVersion
    let app = await getAppById( appIdx )
    let entity = app.entity[ entityId ]
    if ( entity.scope == 'inherit' || entity.scope == 'inherit-readonly' ) { 
      inherit = true 
    }
  } catch ( exc ) { log.error( 'scopeInherited', rootScopeId, appId, appVersion, entityId, exc ) }
  
  return inherit
}

async function idExists( tbl, id  ) {
  log.info( 'idExists', tbl, id )
  let rec = await loadDataById( tbl, id )
  return rec
}

async function getDataObjX( rootScopeId, appId, appVersion, entityId, userScopeId, id, filterParams ) {
  log.debug( 'getDataObjX', rootScopeId, appId, appVersion, entityId, userScopeId, id, filterParams )
  let tbl = rootScopeId + entityId
  await syncTbl( tbl )
  let inherit = await scopeInherited( rootScopeId, appId, appVersion, entityId )
  let result = null
  if ( id  ) { 
    // single rec by id
    let rec = await loadDataById ( tbl, id )
    log.debug( 'getDataObjX rec', rec )
    if ( rec && scopeOK( userScopeId, rec.scopeId  , inherit ) ) {
      result = rec
    }
  
  } else {
    // array of data fo scope
    result = []
    let dtaMap = await loadData( tbl, filterParams )
    for ( let recId in dtaMap ) {
      let rec = dtaMap[ recId ]
      if ( scopeOK( userScopeId, rec.scopeId, inherit ) ) {
        if ( filterParams ) {  // only not null if there are params set
          let hit = false
          for ( let f in filterParams ) {
            if ( f.indexOf('_') > 0 ) { // search in JSON
              let jsonId = f.split('_')[0]
              let subId  = f.split('_')[1]
              if ( rec[jsonId] && rec[jsonId][subId] && rec[jsonId][subId].indexOf( filterParams[f] ) >= 0 ) {
                hit = true
                break
              }
            } else if ( rec[f] && rec[f].indexOf( filterParams[f] ) >= 0 ) { // normal search
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


async function addDataObj( tbl, id, obj, uri, evt, entity ) {
  log.debug( 'addDataObj',  tbl, id, obj, uri, evt, entity  )
  let dtaEvt = await addDataObjNoEvent( tbl, id, obj )
  let objCopy = await embedRefObjects( obj, entity )
  eh.publishDataChgEvt( ( evt ? evt : dtaEvt ), id, uri, tbl, objCopy )
  return true
}

async function addDataObjNoEvent( tbl, id, obj ) {
  log.debug( 'addDataObjNoEvent', tbl, id )
  await saveData( tbl, id, obj )
  return true
}


async function embedRefObjects( origDta, entity ) {
  log.debug('embedRefObjects e', origDta, entity )
  if ( ! entity ) { return origDta }
  let dta = JSON.parse( JSON.stringify( origDta ) )
  try {
    for ( let propId in entity.properties ) {
      if ( dta[ propId ] ) { // only care if opr is really present
        let prp = entity.properties[ propId ]
        // log.info( '>>>',  propId, prp.type)
        if ( prp.type == 'SelectRef' ) {
          let ref = prp.selectRef.split('/')
          let app = await getAppById( ref[0]+'/'+ref[1]+'/'+ref[2] )
          let entity = app.entity[ ref[3 ] ]
          let refTbl = ref[0] + ref[3]
          let refDta = await loadDataById( refTbl, dta[ propId ] )
          if ( refDta ) {
            let uri =  '/adapter/entity/'+ref[0]+'/'+ref[1]+'/'+ref[2]+'/'+ref[3]+'/'+dta[ propId ]
            dta[ propId ] = getApiRec( refDta, entity ) //JSON.parse( JSON.stringify( refDta ))
            dta[ propId ]._uri = uri
          } else {
            log.warn( 'embedRefObjects NOT FOUND', propId, dta[ propId ] )
          }
        } else if ( prp.type == 'MultiSelectRef' ) {
          let ref = prp.multiSelectRef.split('/')
          let app = await getAppById( ref[0]+'/'+ref[1]+'/'+ref[2] )
          let entity = app.entity[ ref[3 ] ]
          let refTbl = ref[0] + ref[3]
          let refObArr = []
          for ( let refId of dta[ propId ] ) {
            let refDta = await loadDataById( refTbl, refId )
            if ( refDta ) {
              let refCpy = getApiRec( refDta, entity ) // JSON.parse( JSON.stringify( refDta ))
              refCpy._uri =  '/adapter/entity/'+ref[0]+'/'+ref[1]+'/'+ref[2]+'/'+ref[3]+'/'+refId
              refObArr.push( refCpy )
            } else {
              refObArr.push({ id: refId })
              log.warn( 'embedRefObjects NOT FOUND', propId, refId )
            }
          }
          dta[ propId ] = refObArr // replace array
        }
      } else if ( entity.properties[ propId ].type == 'API static string' ) {
        dta[ propId ] = entity.properties[ propId ].apiString
      }
    }
  } catch ( exc ) { log.warn( 'embedRefObjects', exc ) }
  log.debug( 'embedRefObjects', dta )
  return dta
}

function getApiRec( rec, entity ) {
  let recCpy = JSON.parse( JSON.stringify( rec ) )
  if ( ! entity ) { return recCpy }
  for ( let propId in entity.properties ) {
    if ( entity.properties[ propId ].type == 'API static string' ) {
      recCpy[ propId ] = entity.properties[ propId ].apiString
    }
  }
  return recCpy
}

async function delDataObj( tbl, id, entity ) {
  log.info( 'delDataObj', tbl, id )
  let dta = await loadDataById( tbl, id )
  await delData( tbl, id )
  let uri = null
  eh.publishDataChgEvt( 'dta.del', id, uri, tbl, dta )
  return "Deleted"
}

async function delDataObjNoEvent( tbl, id ) {
  log.info( 'delDataObj', tbl, id )
  await delData( tbl, id )
  return "Deleted"
}

// ============================================================================

async function getSubscriptions() {
  return await loadData(  EH_SUB_TBL )
}


async function subscribeEvt( app, name, scopeId, webHook, filter, since ) {
  let subscriptions = loadDataById(  EH_SUB_TBL, scopeId )
  if ( ! subscriptions ) {
    subscriptions = {}
  }
  subscriptions[ name ] = {
    webHook : webHook,
    app     : app,
    filter  : ( filter ? filter : {} ),
    creDt   : Date.now()
  }
  saveData( EH_SUB_TBL, scopeId, subscriptions )
}

async function unsubscribeEvt( scopeId, name ) {
  let subscriptions = loadDataById( EH_SUB_TBL, scopeId )
  delete  subscriptions[ name ]
  saveData( EH_SUB_TBL, scopeId, subscriptions )
}

// ============================================================================


async function loadData( tbl, qry ) {
  log.debug( 'loadData', tbl, qry  )
  if ( DB ) { return await DB.loadData( tbl, qry ) }
  // --- JSON file DB ---
  await syncTbl( tbl )
  return data[ tbl ]
}

async function loadDataById( tbl, id ) {
  log.debug( 'getDataById',tbl, id  )
  if ( DB ) { return await DB.loadDataById( tbl, id ) }
  // --- JSON file DB ---
  await syncTbl( tbl )
  if ( data[ tbl ] && data[ tbl ][ id ] ) {
    return data[ tbl ][ id ] 
  }
  return null
}

async function saveData( tbl, id, obj ) {
  log.debug( 'addDataObjNoEvent', tbl, id )
  if ( DB ) { return await DB.savedDataObj( tbl, id, obj ) }
  // --- JSON file DB ---
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
  return dtaEvt
}


async function delData( tbl, id ) {
  log.info( 'delDataObj', tbl, id )
  if ( DB ) { return await DB.delData( tbl, id ) }
  // --- JSON file DB ---
  await syncTbl( tbl )
  let idT = id.trim() 
  if ( ! data[ tbl ]  ||  ! data[ tbl ][ idT ] ) { return "Not found" }
  log.info( 'delDataObj', tbl, data[ tbl ][ idT ] )
  let cpyDta = JSON.parse( JSON.stringify( data[ tbl ][ idT ] ) )
  delete  data[ tbl ][ idT ]
  let dbFile = fileName( tbl )
  await writeFile( dbFile, JSON.stringify( data[ tbl ], null, '  ' ) )
  return "Deleted"
}

// ============================================================================
async function delCollection( scopeId, entityId ) {
  log.info( 'delCollection', scopeId, entityId )
  if ( DB ) { return await DB.delCollection( scopeId, entityId ) }
  // --- JSON file DB ---
  let dbFile = fileName( scopeId + entityId )
  if ( fs.existsSync( dbFile ) ) {
    await rm( dbFile )
  }
}

async function delRootScope( scopeId ) {
  log.info( 'delRootScope', scopeId  )
  if ( fs.existsSync( appTblName( scopeId ) ) ) {
    await rm( appTblName( scopeId ) )
  }
  if ( fs.existsSync( stateTblName( scopeId ) ) ) {
    await rm( stateTblName( scopeId ) )
  }
  if ( fs.existsSync( ermTblName( scopeId ) ) ) {
    await rm( ermTblName( scopeId ) )
  }
  cleanUpScopeInTbl( EH_SUB_TBL, scopeId )
  return 'OK'
}

async function cleanUpScopeInTbl( tbl, scopeId ) {
  log.info( 'cleanUpScopeInTbl', tbl, scopeId  )
  if ( DB ) { return await DB.cleanUpScopeInTbl( tbl, scopeId ) }
  // --- JSON file DB ---
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
  if ( ! data[ tbl ]  || always || process.env.LC_DB_SYNC_ALWAYS == 'y' ) {
    log.debug('>> readFile', dbFile )
    data[ tbl ] =  JSON.parse( await readFile( dbFile ) )
  } 
  return data[ tbl ]
}

async function writeTbl( tbl ) {
  let dbFile = fileName( tbl )
  await writeFile( dbFile, JSON.stringify( data[ tbl ], null, '  ' ) )
}


function fileName( tbl ) {
  return DB_DIR + tbl + '.json'

}


let data = {
 
}