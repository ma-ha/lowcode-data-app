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

async function setupAPI( app ) {
  let svc = app.getExpress()
  gui = app

  const myJWTcheck = apiSec.initJWTcheck()
  const userTenantAutz = apiSec.userTenantAuthz( gui )

  // --------------------------------------------------------------------------
  svc.post( '/user', userTenantAutz, addUser )
  svc.get(  '/user', userTenantAutz, getUser )
  svc.post( '/user/lock',  userTenantAutz, lockUser )
  svc.post( '/user/reset', userTenantAutz, resetUser )
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

    let userRec = {
      name : req.body.name,
      role : {
        dev     : [],
        admin   : [],
        appUser : [ user.scopeId ],
        api     : [] 
      },
      password : 'secret',
      expires  : getExpireDate( req.body.expire )
    }
    if ( req.body.dev   ) { userRec.role.dev.push( user.scopeId ) }
    if ( req.body.admin ) { userRec.role.admin.push( user.scopeId ) }
    if ( req.body.dev   ) { userRec.role.dev.push( user.scopeId ) }


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
      password : 'secret',
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
  log.info( 'GET /user' )
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
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test( String( email ).toLowerCase() )
}