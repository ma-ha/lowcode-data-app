/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log       = require( '../helper/log' ).logger
const helper    = require( '../helper/helper' )
const fs        = require( 'fs' )
const { mkdir, writeFile, readFile, rename, rm, stat } = require( 'node:fs/promises' )
const { createHash, randomBytes } = require( 'node:crypto' )

exports: module.exports = { 
  init,
  authenticate,
  creRootScope,
  getRootScopes,
  delRootScope,
  setSelScope,
  getSelScope,
  getSelScopeName,
  getUser,
  getUserInfo,
  getUserInfoFromReq,
  geScopeArr,
  getScopeName,
  getScopeList,
  addScope,
  addUser,
  updateUserPassword,
  updateUser,
  addUserAdmin,
  getUserArr,
  delUser,
  getApiAppScopes,
  loadOidcSessions,
  saveOidcSessions
}

// ============================================================================

let SCOPE_DB      = '../dta/scope.json'
let SCOPE_ID      = '../dta/scopeSeq.json'
let USER_AUTH_DB  = '../dta/user-auth.json'
let USER_SCOPE_DB = '../dta/user-scope.json'
let OIDC_SESSION_DB = '../dta/oidc-session.json'

let FAKE_LOGIN = false

let DB = null

async function init( cfg ) {
  if ( cfg.FAKE_LOGIN  ) { FAKE_LOGIN = cfg.FAKE_LOGIN  }

  if ( cfg.PERSISTENCE && cfg.PERSISTENCE.USER ) {
    DB = cfg.PERSISTENCE.USER
  }

  let dbDir = cfg.DATA_DIR 
  if ( ! dbDir.endsWith('/') ) { dbDir += '/' }
  log.info( 'user-data init', dbDir, FAKE_LOGIN )
  SCOPE_DB        = dbDir + 'scope.json'
  SCOPE_ID        = dbDir + 'scopeSeq.json'
  USER_AUTH_DB    = dbDir + 'user-auth.json'
  USER_SCOPE_DB   = dbDir + 'user-scope.json'
  OIDC_SESSION_DB = dbDir + 'oidc-session.json'
}

// ============================================================================

async function creRootScope( name, adminEmail, owner, tagArr, noCustomizing ) {
  let newId = await getNextScopeId()
  scope = {
    name       : name,
    tag        : ( tagArr ? tagArr : [] ),
    meta       : {},
    adminEmail : adminEmail,
    owner      : owner,
    _cre       : Date.now()
  }
  if ( noCustomizing ) {
    scopeTbl[ newId ].noCustomizing = true
  }
  await saveScope( newId, scope ) 
  return newId
}


async function getRootScopes() {
  let scopeTbl = await loadScopes()
  let scopeMap = {}
  for ( let tId in scopeTbl ) {
    if ( tId.indexOf('/') == -1 ) {
      scopeMap[ tId ] = scopeTbl[ tId ]
    }
  }
  return scopeMap
}

async function delRootScope( scopeId ) {
  log.info( 'AppDta delRootScope ...' )
  let scopeTbl = await loadScopes()
  let userMap = await loadUserArr() 

  // remove scope from user roles
  for ( let uid in userMap ) {
    let user = userMap[ uid ]
    removeScopeId( scopeId, user.role.admin )
    removeScopeId( scopeId, user.role.dev )
    removeScopeId( scopeId, user.role.appUser )
    removeScopeId( scopeId, user.role.api )
    await saveUser( uid, user ) 
  }

  // remove scope
  for ( let tId in scopeTbl ) {
    if ( tId.startsWith( scopeId ) ) {
     await delScope( tId )
    }
  }

  return 'OK'
}

function removeScopeId( scopeId, scopeArr ) {
  for ( let scId of scopeArr ) {
    if ( scId.startsWith( scopeId ) ) {
      scopeArr.splice( scopeArr.indexOf( scId ), 1 )
    }
  }
}

// ============================================================================

async function authenticate( userId, pwd ) {
  let idnty = await loadUserById( userId )
  if ( idnty && idnty.password == createHash('sha256').update( pwd ).digest('hex') ) {
    idnty.lastLogin = Date.now()
    await saveUser( userId, idnty )
    log.info( 'authenticate ok', userId  )
    return true
  }
  log.warn( 'authenticate failed', userId  )
  return false
}

async function setSelScope( userId, scopeId ) {
  let idnty = await loadUserById( userId )
  if ( ! idnty ) { return null }
  await saveUserScope( userId, scopeId ) 
}

async function getSelScope( userId ) {
  let idnty = await loadUserById( userId )
  if ( ! idnty ) { return null }
  let userScope = await loadUserScope( userId )
  if (  userScope ) {
    return userScope
  }
  await saveUserScope( userId, idnty.role.appUser[0] )
  return idnty.role.appUser[0]
}

async function getSelScopeName( userId ) {
  let idnty = await loadUserById( userId )
  if ( ! idnty ) { return '' }
  let userScope =await loadUserScope( userId )
  if (  userScope ) {
    return await getScopeName( userScope )
  }
  await saveUserScope( userId, idnty.role.appUser[0] )
  return await getScopeName( idnty.role.appUser[0] )
}


// ============================================================================

async function getScopeName( scopeId ) {
  let scopeTbl = await loadScopes() 
  if ( scopeTbl[ scopeId ] ) {
    return scopeTbl[ scopeId ].name
  }
  return ""
}

async function getScopeList( userId, role='appUser' ) {
  let idnty = await loadUserById( userId )
  if ( ! idnty ) { return null }
  let scopeTbl = await loadScopes() 

  let scopeIds = []
  for ( let aScope in scopeTbl ) {
    scopeIds.push( aScope )
  }
  
  let availableScopes = {}
  for ( let aScope of scopeIds ) {
    let scopeAuthorized = false
    for ( let userRootScope of idnty.role[ role ] ) {
      if ( aScope.startsWith( userRootScope ) ) {
        scopeAuthorized = true
        break
      }
    }
    if ( scopeAuthorized ) {
      availableScopes[ aScope ] = scopeTbl[ aScope ]
    }
  }
  return availableScopes
}

// ============================================================================

async function geScopeArr( rootScopeId ) {
  let scopeTbl = await loadScopes() 
  let scopeArr = []
  for ( let scopeId in scopeTbl ) {
    if ( scopeId.startsWith( rootScopeId ) ) {
      scopeArr.push({
        id     : scopeId,
        name   : scopeTbl[ scopeId ].name,
        tagArr : scopeTbl[ scopeId ].tag,
        meta   : scopeTbl[ scopeId ].meta
      })
    }
  }
  return scopeArr
}

async function addScope( id, name, tagArr, meta) {
  log.info( 'addScope', id, name, tagArr, meta )
  scope = {
    name : name,
    tag  : tagArr,
    meta : meta
  }
  saveScope( id, scope ) 
}

// ============================================================================

async function getUserInfoFromReq( gui, req ) {
  // log.info( 'getUserInfoFromReq' )
  let userId = await gui.getUserIdFromReq( req )
  if ( FAKE_LOGIN ) {  userId = FAKE_LOGIN  }
  if ( ! userId ) { return null }
  let user = await getUserInfo( userId )
  return user 
}

async function getUserInfo( userId ) {
  // log.info( 'getUserInfo', userId )
  let scopeId = await getSelScope( userId )
  let scopeTbl = await loadScopes() 
  let idnty = await loadUserById( userId )

  // log.info( 'getUserInfo userId', userId )
  // log.info( 'getUserInfo scopeId', scopeId )
  // log.info( 'getUserInfo idnty', idnty )
  // log.info( 'getUserInfo scopeTbl', scopeTbl )

  if ( ! scopeId ) { return null }
  let rootScope = scopeId
  if ( scopeId.indexOf('/') > 0 ) {
    rootScope = scopeId.substring(0, scopeId.indexOf('/') )  
  }
  let userInfo = {
    userId      : userId,
    name        : idnty.name,
    scopeId     : scopeId,
    rootScopeId : rootScope,
    scopeTags   : scopeTbl[ scopeId ].tag,
    role        : idnty.role,
    lastLogin   : idnty.lastLogin
  }
  if ( scopeTbl[ rootScope ].noCustomizing ) {
    userInfo.role.dev = []  // dev not allowed
  }
  return userInfo
}


async function addUser( id, newUser ) {
  let idnty = await loadUserById( id )
  if ( id && idnty ) { return 'ERROR: ID exists' }
  if ( id && newUser.sp ) {
    if ( ! newUser.password ) {
       newUser.password = helper.uuidv4()
    }
    await saveUser( id, newUser )
    return 'API account added'
  } else  if ( id ) { // add user
    let result = 'User added'
    if ( newUser.password ) {
      newUser.password = createHash('sha256').update( newUser.password ).digest('hex')
    } else {
      let pwd = randomBytes(5).toString('hex')
      newUser.password = createHash('sha256').update( pwd ).digest('hex')
      result = 'User added, password is "'+pwd+'"'
    }
    await saveUser( id, newUser )
    return result
  } else { // add API account
    let spId = helper.uuidv4()
    newUser.password = helper.uuidv4()
    await saveUser( spId, newUser )
    return 'API account "'+spId+'" added'
  } 
} 

async function addUserAdmin( uid, scopeId ) {
  let user = await loadUserById( uid )
  if ( ! user ) { return 'not found' }
  user.role.appUser.push( scopeId )
  user.role.admin.push( scopeId )
  user.role.dev.push( scopeId )
  await saveUser( uid, user )
}

async function getUser( uid, scopeId ) {
  log.info( 'getUser..' )

  if ( uid == 'empty' ) {
    return {
      email  : '',
      name   : '',
      dev    : '',
      admin  : '',
      expire : '1y'
    }
  } else if ( uid == 'empty_sp' ) {
    return {
      sp_name   : '',
      sp_expire : '1y',
      sp_id     : ''
    }
  }

  let idnty = await loadUserById( uid )

  let ret = {
    mode   : 'update'
  }

  if ( idnty.sp ) {
    ret.sp_id     = uid
    ret.sp_name   = idnty.name
    ret.sp_expire = '1y'
  } else {
    ret.uid    = uid
    ret.email  = uid
    ret.name   = idnty.name
    ret.dev    = inScope( scopeId, idnty.role.dev )
    ret.admin  = inScope( scopeId, idnty.role.admin )
    ret.expire = '1y'
  }
  return ret
}

async function updateUserPassword( uid, newPassword ) {
  log.info( 'updateUserPassword..', uid )
  let user = await loadUserById( uid )
  if ( ! user ) { return 'not found' }
  user.password = createHash('sha256').update( newPassword ).digest('hex')
  await saveUser( uid, user )
  return 'OK, changed'
}

async function updateUser( uid, newEmail, user, scopeId, action ) {
  log.info( 'updateUser..', uid, user )
  let idnty = await loadUserById( uid )
  if ( ! idnty ) { return 'not found' }

  if ( action == 'lock' ) {

    idnty.password = null
    await saveUser( uid, idnty )
    return 'User login disabled!'

  } else if ( action == 'reset' ) {

    let pwd = randomBytes(5).toString('hex')
    idnty.password = createHash('sha256').update( pwd ).digest('hex')
    await saveUser( uid, idnty )
    return 'User login reset! New password: '+ pwd
  }
  
  roleSync( idnty.role.dev,   user.role.dev )
  roleSync( idnty.role.admin, user.role.admin )

  function roleSync( isRoles, roleAct ) {
    log.info( 'roleSync', isRoles, roleAct )
    if ( roleAct.length == 1 && isRoles.indexOf( roleAct[0] ) == -1 ) {
      log.info( 'roleSync add' )
      isRoles.push( roleAct[0] )
    } else if ( roleAct.length == 0 && isRoles.indexOf( scopeId ) >= 0 ) {
      log.info( 'roleSync del' )
      isRoles.splice(  isRoles.indexOf( scopeId ), 1 )
    }
  }

  idnty.name    = user.name
  idnty.expires = user.expires
  
  if ( idnty.sp ) {
    // TODO ?
  } else { 
    // TODO ?
  }

  await saveUser( uid, idnty )
  return 'OK'
}


async function getUserArr( scopeId ) {
  log.debug( 'getUserArr...' )
  let userArr = await  loadUserArr()

  let result = []
  for ( let uid in userArr ) {
    let idnty = userArr[ uid ]
    let isInScope  = false
    let userScope  = inScope( scopeId, idnty.role.appUser )
    let devScope   = inScope( scopeId, idnty.role.dev )
    let adminScope = inScope( scopeId, idnty.role.admin )
    let apiScope   =  inScope( scopeId, idnty.role.api )
    if ( userScope || devScope || adminScope || apiScope ) { 
      isInScope = true
    }
    let type   = 'User'
    let secret = ''
    let subs   = ''
    if ( apiScope ) {
      type   = 'API Account'
      secret = '<a href="javascript:alert(\'API Secret:\\n'+idnty.password+'\')">API-Secret</a>'
      userScope = apiScope
      subs = '<a href="index.html?layout=AppSubscription-nonav&id='+uid+'">Subscriptions</a>'
    }
    let expireStr = ''
    if ( idnty.password === null ){
      expireStr = '<span style="color:red">BLOCKED</span>'
    } else if ( idnty.expires === null ) {
      expireStr = 'unlimited'
    } else {
      expireStr = ( new Date( idnty.expires ) ).toISOString().substring(0,10).replace('T',' ')
    }
    let lastLoginStr = '-'
    if ( idnty.lastLogin ) { try {
      lastLoginStr = ( new Date( idnty.lastLogin ) ).toISOString().substring(0,16).replace('T',' ')
    } catch ( exc ) { log.warn( 'getUserArr lastLoginStr', exc ) } }
    if ( isInScope ) {
      result.push({
        id      : uid,
        type    : type,
        name    : idnty.name,
        lastLogin : lastLoginStr,
        expires : expireStr,
        scope   : userScope,
        dev     : devScope,
        admin   : adminScope,
        secret  : secret,
        subs    : subs
      })
    }
  }
  return result
}


async function getApiAppScopes( appId, appSecret ) {
  let sp = await loadUserById( appId )
  // let hash = createHash('sha256').update( appSecret ).digest('hex')
  let hash = appSecret // TODO
  log.debug( 'getApiAppScopes', hash, sp )
  if ( sp && sp.password == hash ) {
    return sp.role.api
  } else {
    return null
  }
}


function inScope( scopeId, scopeArr ) {
  if ( ! scopeArr ) { return null }
  for ( aScopeId of scopeArr ) {
    if ( scopeId.startsWith( aScopeId ) ) {
      return aScopeId
    }
  }
}


// ============================================================================
// ============================================================================
let scopeCache = {}
let userScopeCache = {}
let authTblCache = {}

// ============================================================================
// DB methods

async function getNextScopeId() {
  log.debug( 'getNextScopeId' )
  if ( DB ) { return await DB.getNextScopeId() }
  // --- JSON file DB ---
  let scopeSeq = { ID: 1000 }
  if ( fs.existsSync( SCOPE_ID  ) ) {
    scopeSeq = JSON.parse( await readFile( SCOPE_ID ) )
  }
  scopeSeq.ID ++
  let newId = scopeSeq.ID + ''
  await writeFile( SCOPE_ID, JSON.stringify( scopeSeq, null, '  ' ) )
  return newId
}

async function writeScope() {
  await writeFile( SCOPE_DB, JSON.stringify( scopeCache, null, '  ' ) )
}


async function loadScopes() {
  log.debug( 'loadScopes' )
  if ( DB ) { return await DB.loadScopes() }
  // --- JSON file DB ---
  if ( fs.existsSync( SCOPE_DB  ) ) {
    scopeCache = JSON.parse( await readFile( SCOPE_DB ) )
  } else {
    scopeCache = {}
  }
  return scopeCache
}

async function saveScope( id, scope ) {
  log.debug( 'saveScope', id, scope )
  if ( DB ) { return await DB.saveScope( id, scope ) }
  // --- JSON file DB ---
  let scopeTbl = await loadScopes() 
  scopeTbl[ id ] = scope
  await writeScope()
}

async function delScope( id ) {
  log.debug( 'delScope', id )
  if ( DB ) { return await DB.delScope( id ) }
  // --- JSON file DB ---
  let scopeTbl = await loadScopes() 
  delete scopeTbl[ id ] 
  await writeScope() 
}

//-----------------------------------------------------------------------------

async function loadUserArr() {
  log.debug( 'loadUserArr' )
  if ( DB ) { return await DB.loadUserArr() }
  // --- JSON file DB ---
  let authTbl = await getAuthTbl()
  return authTbl
}

async function loadUserById( uid ) {
  log.debug( 'loadUserById' )
  if ( DB ) { return await DB.loadUserById( uid ) }
  // --- JSON file DB ---
  let authTbl = await getAuthTbl()
  let idnty = authTbl[ uid ]
  return idnty
}

async function saveUser( uid, user ) {
  log.debug( 'saveUser' )
  if ( DB ) { return await DB.saveUser( uid, user ) }
  // --- JSON file DB ---
  let authTbl = await getAuthTbl()
  authTbl[ uid ] = user
  await writeAuthTbl()
}

async function delUser( uid ) {
  log.debug( 'delUser' )
  if ( DB ) { return await DB.delUser( uid ) }
  // --- JSON file DB ---
  let authTbl = await getAuthTbl()
  if ( authTbl[ uid ]) {
    delete authTbl[ uid ]
    await writeAuthTbl()
    return 'OK'
  }
  return 'Not found'
}


async function getAuthTbl() { // internal
  // if ( ! authTblCache ) {
    if ( fs.existsSync( USER_AUTH_DB  ) ) {
      authTblCache = JSON.parse( await readFile( USER_AUTH_DB ) )
    } else {
      // authTblCache = {}
    }
  // } 
  return authTblCache
}

async function writeAuthTbl() { // internal
  await writeFile( USER_AUTH_DB, JSON.stringify( authTblCache, null, '  ' ) )
}

//-----------------------------------------------------------------------------

async function loadUserScope( userId ) {
  log.debug( 'loadUserScope' )
  if ( DB ) { return await DB.loadUserScope( userId ) }
  // --- JSON file DB ---
  if ( fs.existsSync( USER_SCOPE_DB  ) ) {
    userScopeCache = JSON.parse( await readFile( USER_SCOPE_DB ) )
  }  
  return userScopeCache[ userId ]
}

async function saveUserScope( uid, scopeId ) {
  log.debug( 'saveUserScope' )
  if ( DB ) { return await DB.saveUserScope( uid, scopeId ) }
  // --- JSON file DB ---
  if ( fs.existsSync( USER_SCOPE_DB  ) ) {
    userScopeCache = JSON.parse( await readFile( USER_SCOPE_DB ) )
  }
  userScopeCache[ uid ] = scopeId
  await  writeUserScope()
}

async function writeUserScope() {
  await writeFile( USER_SCOPE_DB, JSON.stringify( userScopeCache, null, '  ' ) )
}

//-----------------------------------------------------------------------------

async function loadOidcSessions() { 
  log.debug( 'loadOidcSessions' )
  if ( DB ) { return await DB.loadOidcSessions() }
  // --- JSON file DB ---
  let oidcSessions = {}
  if ( fs.existsSync( OIDC_SESSION_DB ) ) {
    oidcSessions = JSON.parse( await readFile( OIDC_SESSION_DB ) )
  }
  return oidcSessions
}

async function saveOidcSessions( oidcSessions ) {
  log.debug( 'saveOidcSessions' )
  if ( DB ) { return await DB.saveOidcSessions( oidcSessions ) }
  // --- JSON file DB ---
  await writeFile( OIDC_SESSION_DB, JSON.stringify( oidcSessions, null, '  ' ) )
}

