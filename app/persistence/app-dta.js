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
const APP_TBL = 'app' 
const STATE_TBL = 'state' 
const ERM_TBL = 'erm'
const EH_SUB_TBL = 'event-subscriptions'

async function init( cfg ) {
  if ( cfg.PERSISTENCE ) { // EXTERNAL IMPLEMENTATION
    
    const dbMethods = ['prepDB',
      'getAppList','getApp','getAppById','addApp','saveApp',
      'getStateModelById','getData','getDataById','getDataObjX','isQueried','idExists',
      'addDataObj','addDataObjNoEvent','delDataObj','delDataObjNoEvent','delCollection',
      'delRootScope','getSubscriptions','subscribeEvt','unsubscribeEvt']
    
      const dbUserMethods = ['getNextScopeId',
        'writeScope','loadScopes','saveScope','delScope',
        'loadUserArr','loadUserById','saveUser','delUser',
        'loadUserScope','saveUserScope','writeUserScope',
        'loadOidcSessions','saveOidcSessions']

  } else { // USE FILES
    
    DB_DIR  = cfg.DATA_DIR 
    if ( ! DB_DIR.endsWith( '/' ) ) { DB_DIR += '/' }
  
    await prepDB()
  
    userDB.init( cfg )
  
    data[ APP_TBL ] =  JSON.parse( await readFile( fileName( APP_TBL ) ) )  
  }
}

// ============================================================================

async function prepDB() {
  if ( ! fs.existsSync( DB_DIR ) ) {
    fs.mkdirSync( DB_DIR )
    //let dbFile = 
  }

  if ( ! fs.existsSync( fileName( APP_TBL ) ) ) {
    await writeFile( fileName( APP_TBL ), "{}" ) 
  } else {
    await syncTbl( APP_TBL )
    for ( let appId in data[ APP_TBL ] ) {
      let app = data[ APP_TBL ][ appId ]
      if ( ! app.hasOwnProperty( 'enabled' ) ) {
        app.enabled = true
      }
      if ( app.scopeId == '' ) { app.scopeId = null }
    }
    await writeFile( fileName( APP_TBL ), JSON.stringify( data[ APP_TBL ], null, '  ' ) )
  }
  if ( ! fs.existsSync( fileName( 'user-auth' )) ) {
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
  }

  if ( ! fs.existsSync(  fileName( 'user-auth' ) ) ) {
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

  let apps = {}
  let appMap = await loadData( APP_TBL )
  for ( let appId in appMap ) {
    if ( ! appId.startsWith( rootScope ) ) { continue }
    let app = appMap[ appId ]
    let appInScope = false
    log.debug( 'getAppList >', app.scope,  app.scopeId )
    if ( mode == 'admin'  &&  appId.startsWith( rootScope ) ) {
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
  return await loadDataById( APP_TBL, fullAppId )
}

async function addApp( fullAppId, app ) {
  log.debug( 'getApp',fullAppId )
  await addDataObjNoEvent( APP_TBL, fullAppId, app )
  let uri = '/adapter/app/' + fullAppId
  eh.publishDataChgEvt( 'app.add', fullAppId, uri, APP_TBL, app )
}

async function saveApp( fullAppId, app ) {
  log.info( 'saveApp',fullAppId )
  await addDataObjNoEvent( APP_TBL, fullAppId, app )
  let uri = '/adapter/app/' + fullAppId
  eh.publishDataChgEvt( 'app.chg', fullAppId, uri, APP_TBL, app )
}

// ============================================================================

async function getStateModelById( rootScopeId, stateModelId ) {
  log.debug( 'getStateModelById', rootScopeId, stateModelId  )
  let stateModel = await loadDataById( 'state', rootScopeId +'/'+ stateModelId )
  return stateModel
}
// ============================================================================

// tbl param can be like "1000city" or "1000/region-mgr/1.0.0/city"
async function getData( tbl, scopeId, admin, qry ) {  
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
  let dtaMap = await loadData( table, qry )
  let result = {}
  for ( let recId in dtaMap ) {
    let rec = dtaMap[ recId ]
    if ( !  isQueried( rec, qry ) ) { continue }
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
  } catch ( exc ) { log.error( '', exc ) }
  
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
  // await syncTbl( tbl )
  let inherit = await scopeInherited( rootScopeId, appId, appVersion, entityId )
  let result = null
  if ( id  ) { 
    // single rec by id
    let rec = await getDataById( tbl, id )
    log.debug( 'getDataObjX rec', rec )
    if ( rec && scopeOK( userScopeId, rec.scopeId  , inherit ) ) {
      result = rec
    }
  
  } else {
    // array of data fo scope
    result = []
    let dtaMap = await loadData( tbl )
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
  log.info( 'addDataObj',  tbl, id, obj, uri, evt, entity  )
  let dtaEvt = await addDataObjNoEvent( tbl, id, obj )
  let objCopy = await embedRefObjects( obj, entity )
  eh.publishDataChgEvt( ( evt ? evt : dtaEvt ), id, uri, tbl, objCopy )
  return true
}

async function addDataObjNoEvent( tbl, id, obj ) {
  log.info( 'addDataObjNoEvent', tbl, id )
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
          let refTbl = ref[0] + ref[3]
          let refDta = await loadDataById( refTbl, dta[ propId ] )
          if ( refDta ) {
            let uri =  '/adapter/entity/'+ref[0]+'/'+ref[1]+'/'+ref[2]+'/'+ref[3]+'/'+dta[ propId ]
            dta[ propId ] = JSON.parse( JSON.stringify( refDta ))
            dta[ propId ]._uri = uri
          } else {
            log.warn( 'embedRefObjects NOT FOUND', propId, dta[ propId ] )
          }
        } else if ( prp.type == 'MultiSelectRef' ) {
          let ref = prp.multiSelectRef.split('/')
          let refTbl = ref[0] + ref[3]
          let refObArr = []
          for ( let refId of dta[ propId ] ) {
            let refDta = await loadDataById( refTbl, refId )
            if ( refDta ) {
              let refCpy = JSON.parse( JSON.stringify( refDta ))
              refCpy._uri =  '/adapter/entity/'+ref[0]+'/'+ref[1]+'/'+ref[2]+'/'+ref[3]+'/'+refId
              refObArr.push( refCpy )
            } else {
              refObArr.push({ id: refId })
              log.warn( 'embedRefObjects NOT FOUND', propId, refId )
            }
          }
          dta[ propId ] = refObArr // replace array
        }
      }
    }
  } catch ( exc ) { log.warn( 'embedRefObjects', exc ) }
  log.debug( 'embedRefObjects', dta )
  return dta
}


async function delDataObj( tbl, id, entity ) {
  log.info( 'delDataObj', tbl, id )
  await delData( tbl, id )
  let uri = null
  eh.publishDataChgEvt( 'dta.del', id, uri, tbl, cpyDta )
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
  await syncTbl( tbl )
  return data[ tbl ]
}

async function loadDataById( tbl, id ) {
  log.debug( 'getDataById',tbl, id  )
  await syncTbl( tbl )
  if ( data[ tbl ] && data[ tbl ][ id ] ) {
    return data[ tbl ][ id ] 
  }
  return null
}

async function saveData( tbl, id, obj ) {
  log.info( 'addDataObjNoEvent', tbl, id )
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