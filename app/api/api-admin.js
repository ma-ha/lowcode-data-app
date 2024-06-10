/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )

exports: module.exports = { 
  setupAPI,
  // test only:
  // getDummyEkosysSvc
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null
let cfg = {}

async function setupAPI( app, config ) {
  let svc = app.getExpress()
  gui = app
  cfg = config

  // const myJWTcheck = apiSec.initJWTcheck()
  const adminAuthz = apiSec.adminAuthz( gui )
  const guiAuthz = apiSec.userTenantAuthz( gui )


  // --------------------------------------------------------------------------
  svc.post( '/scope',  adminAuthz, addScope )
  svc.get(  '/scope',  adminAuthz, getScope )
  svc.get(  '/scope/options',    guiAuthz, getScopeOpts )
  svc.get(  '/scope/pong-table', adminAuthz, getScopeTbl )

  svc.post( '/user',       adminAuthz, addUser )
  svc.get(  '/user',       adminAuthz, getUser )
  svc.post( '/user/lock',  adminAuthz, lockUser )
  svc.post( '/user/reset', adminAuthz, resetUser )
 
}

// ============================================================================

async function addScope( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  if ( req.body.scopeId == '#' ) { // oups, new root scope requested
    log.info('SUPER_TENANT_ADMIN', cfg.SUPER_TENANT_ADMIN )
    if ( ! cfg.SUPER_TENANT_ADMIN ) { return res.status(401).send('not authorized') }
    let tenantAdmins = cfg.SUPER_TENANT_ADMIN.split(',')
    if ( tenantAdmins.indexOf( user.userId ) == -1 ) { return res.status(401).send('user not authorized') }
    
    let name = req.body.name.trim()
    if ( name == '' ) { name = 'New Tenant' }
    
    let scopeId = await userDta.creRootScope( 
      name,
      user.userId,
      user.name,
      ( req.body.tags ?  req.body.tags.split(',') : [] )
    )
    
    await userDta.addUserAdmin( user.userId, scopeId )
    
    return res.send( 'OK' ) 
  }

  if ( ! req.body.scopeId || ! req.body.scopeId.startsWith( user.scopeId ) || ! isScopeId( req.body.scopeId ) ) {
    log.warn( 'POST scope: id invalid', req.body.scopeId )
    return res.status(400).send('Scope ID invalid') 
  }
  let scopes = await userDta.geScopeArr( user.rootScopeId )
  let resultTxt = 'Scope added'
  for ( let scope of scopes ) {
    if ( scope.id == req.body.scopeId ) {
      log.info( 'POST scope: id exists', req.body.scopeId )
      resultTxt = 'Scope updated'
    }
  }
  let name = ( req.body.name ? req.body.name : req.body.scopeId )
  let tags = ( req.body.tags ?  req.body.tags.split(',') : [] )
  let meta = {}
  if ( req.body.metaJSON &&  req.body.metaJSON.trim().startsWith('{') ) { try {
      meta = JSON.parse( req.body.metaJSON )
  } catch ( exc ) { res.status(400).send('Meta Data not a valid JSON')  } }
  await userDta.addScope( req.body.scopeId, name, tags, meta )
  res.send( resultTxt ) 
}

async function getScope( req, res ) {
  log.debug( 'getScope', req.query )
  let user = await userDta.getUserInfoFromReq(gui,  req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let scopeArr = await userDta.geScopeArr( user.scopeId )

  if ( req.query.id ) { // get by id 

    for ( let scope of scopeArr ) {
      if ( scope.id == req.query.id ) {
        log.info('sc',scope )
        let resultScope = {
          scopeId  : scope.id,
          name     : scope.name,
          tags     : scope.tagArr,
          metaJSON : ( scope.meta ? JSON.stringify( scope.meta, null, ' ' )  : '' )
        }
        return res.send( resultScope )
      }
    }
    return res.send( null ) // id not in scopes
 
  } else { // get all related scopes

    let scopeTbl = []
    for ( let scope of scopeArr ) {
      let rec = {
        id : scope.id,
        name : scope.name,
        tagStr : scope.tagArr.join()
      }
      for ( let tag of scope.tagArr ) {
        rec[ "tag"+tag ] = true
      }
      scopeTbl.push( rec )
    }
    res.send( scopeTbl )   
  }
}

async function getScopeOpts( req, res ) {
  log.debug( 'getScopeOpts' )
  let user = await userDta.getUserInfoFromReq(gui,  req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let scopeArr = await userDta.geScopeArr( user.scopeId )
  let scopeTbl = []
  // log.info( 'getScopeOpts', user )

  if ( user.scopeId == user.rootScopeId ) {
    scopeTbl.push(  {
      id   : '-',
      name : 'all'
    } )  
  }
  for ( let scope of scopeArr ) { 
    scopeTbl.push({
      id   : scope.id,
      name : scope.name
    })
  }
  
  scopeTbl.sort( ( a, b ) => { 
    if ( a.id > b.id ) { return 1 }
    return -1
  })
  log.debug( 'getScopeOpts', scopeTbl )
  res.send( scopeTbl )
}

async function  getScopeTbl( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let tbl = {
    dataURL: "",
    rowId: "id",
    cols: [
      { id: 'Edit', label: "&nbsp;", cellType: "button", width :'5%', icon: 'ui-icon-pencil', 
        method: "GET", setData: [ { resId : 'AddScope' } ] } ,
      { id: "id",    label: "Id",   width: "20%", cellType: "text" },
      { id: "name",  label: "Name", width: "20%", cellType: "text" },
      // { id: "tag",   label: "Tags", width: "20%", cellType: "text" },
    ]
  }
  let scopeArr = await userDta.geScopeArr( user.scopeId )
  let tags = getAllTags( scopeArr )
  for ( let aTag of tags ) {
    tbl.cols.push({ id: 'tag'+aTag, label: aTag, width: "5%", cellType: "checkbox" })
  }
  res.send( tbl )
}


// ============================================================================

async function addUser( req, res ) {
  log.info( 'POST /user', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  if ( req.body.email ) {

    if ( ! isValidEmail( req.body.email ) ) {
      return res.status(401).send( 'Email not valid' )
    }

    // adding an existing user to a scope w/o knowing he is a user
    if ( req.body.mode != 'update' ) {
      let userExists = await userDta.loadUserById( req.body.email )
      if ( userExists ) {
        if ( ! userExists.role.appUser.includes( user.scopeId ) ) {
          userExists.role.appUser.push( user.scopeIdr )
        }
        if ( req.body.dev ) { 
          if ( ! userExists.role.dev.includes( user.scopeId ) ) {
            userExists.role.dev.push( user.scopeId )
          }
        }
        if ( req.body.admin ) { 
          if ( ! userExists.role.admin.includes( user.scopeId ) ) {
            userExists.role.admin.push( user.scopeId )
          } 
        }
        await userDta.saveUser( req.body.email, userExists )
        return res.send( 'User invited to scope!' ) 
      }
    }

    let userRec = {
      name : req.body.name,
      role : {
        dev     : [],
        admin   : [],
        appUser : [ user.scopeId ],
        api     : [] 
      },
      password : null,
      expires  : getExpireDate( req.body.expire )
    }
    if ( req.body.dev   ) { userRec.role.dev.push( user.scopeId ) }
    if ( req.body.admin ) { userRec.role.admin.push( user.scopeId ) }

    let result = ''
    if ( req.body.mode == 'update' ) {
      result = await userDta.updateUser( req.body.uid, req.body.email, userRec, user.scopeId  )
    } else {
      result = await userDta.addUser( req.body.email, userRec )
    }
     
    res.send( result ) 

  } else if (  req.body.sp_name ) {

    let newSP = {
      name : req.body.sp_name,
      sp   : true,
      role : {
        dev     : [],
        admin   : [],
        appUser : [],
        api     : [ user.scopeId ] 
      },
      password : null,
      expires  : getExpireDate( req.body.sp_expire )
    }

    let result = ''
    if ( req.body.mode == 'update' ) {
      result = await userDta.updateUser( req.body.sp_id, null, newSP, user.scopeId  )
    } else {
      result = await userDta.addUser( null, newSP )
    }
    res.send( result ) 

  } else {
    res.status(400).send( 'User or app required' ) 
  }
}


function getExpireDate( expire ) {
  let expireDate = null
  switch ( expire ) {
    case '3m':
      expireDate = Date.now() + 1000*60*60*24*90
      break;
    case '6m':
      expireDate = Date.now() + 1000*60*60*24*180
      break;
    case '1y':
      expireDate = Date.now() + 1000*60*60*24*356
      break;
      
    default:
      break;
  }
  return expireDate
}

async function getUser( req, res ) {
  log.debug( 'GET /user' )
  let user = await userDta.getUserInfoFromReq( gui,  req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  if ( req.query.id ) {

    let userRec = await userDta.getUser( req.query.id, user.scopeId )
    res.send( userRec ) 

  } else {
    let userArr = await userDta.getUserArr( user.scopeId )
    res.send( userArr ) 

  }

}

// --------------------------------------------------------------------------

async function lockUser( req, res ) {
  log.info( 'POST /user/lock', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.body.id ) { return res.status( 400 ).send( 'id required' ) }
  let result = await userDta.updateUser( req.body.id, null, null, user.scopeId, "lock" )
  res.send( result ) 
}


async function resetUser( req, res ) {
  log.info( 'POST /user/reset', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.body.id ) { return res.status( 400 ).send( 'id required' ) }
  let result = await userDta.updateUser( req.body.id, null, null, user.scopeId, "reset" )
  res.send( result ) 
}

// --------------------------------------------------------------------------

function isValidId( str ) {
  return /^[a-zA-Z]+[a-zA-Z0-9]+$/.test( str )
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

function isValidEmail( email ) {
  if ( email == 'demo' ) { return true }
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test( String( email ).toLowerCase() )
}