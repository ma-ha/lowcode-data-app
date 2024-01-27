/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( './log' ).logger
const cfg        = require( 'config' )
const apiSec     = require( './api-sec' )
const userDta    = require( './app-dta-user' )
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
}

// ============================================================================

async function addUser( req, res ) {
  log.info( 'POST /user', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  if ( req.body.email ) {

    let newUser = {
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
    if ( req.body.dev ) { newUser.role.dev.push( user.scopeId ) }
    if ( req.body.admin ) { newUser.role.admin.push( user.scopeId ) }
    if ( req.body.dev ) { newUser.role.dev.push( user.scopeId ) }

    let result = await userDta.addUser( req.body.email, newUser )
    res.send( result ) 

  } else if (  req.body.name ) {

    let newSP = {
      name : req.body.name,
      role : {
        dev     : [],
        admin   : [],
        appUser : [],
        api     : [ user.scopeId ] 
      },
      password : 'secret',
      expires  : getExpireDate( req.body.expire )
    }

    let result = await userDta.addUser( null, newSP )
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
      expireDates = Date.now() + 1000*60*60*24*356
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

  let scopeArr = await userDta.getUserArr( user.scopeId )
  // let result = []
  // for ( let scope of scopeArr ) {
  //   let rec = {
  //     id : scope.id,
  //     name : scope.name,
  //     tagStr : scope.tagArr.join()
  //   }
  //   result.push( rec )
  // }
  res.send( scopeArr ) 
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