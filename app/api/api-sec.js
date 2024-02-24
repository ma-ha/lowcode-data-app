/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log       = require( '../helper/log' ).logger
const jwtParser = require( 'jsonwebtoken' )
const dta       = require( '../persistence/app-dta' )
const userDta   = require( '../persistence/app-dta-user' )

exports: module.exports = { 
  init,
  userTenantAuthz,
  provisioningApiAppAuthz,
  apiAppAuthz,
  initJWTcheck,
  userAuthzForSvc
}

let gui = null
let cfg = null

function init( configs ) {
  log.info( 'Starting API/sec...', cfg )
  cfg = configs
}

function userTenantAuthz( theGUI ) {
  gui = theGUI
  // let clientID = cfg.CLIENT_ID
  // let audience = cfg.OICD.AUDIENCE
  // let issuer   = cfg.OICD.ISSUER

  let check = async (req, res, next) => {
    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( user ) { 
      // TODO check scopeId

      req.user = user
    } else {
      log.info( 'call is not authorized', req.headers )
      return next( new UnauthorizedError(
        'Not authorized', 
        { message: 'Not authorized' }
      ))
    }
    return next();
  }
  return check
}

// ----------------------------------------------------------------------------

function provisioningApiAppAuthz( ) {
  let check = async (req, res, next) => {
    let key = req.headers[ 'provisioning-key' ]
    if ( ! key || key != cfg.PROVISIONING_API_KEY ) { 
        log.warn( 'Provisioning API call is not authorized', req.method, req.originalUrl )
        return next( new UnauthorizedError(
          'Not authorized', 
          { message: 'Not authorized' }
        ))
    }
    log.debug( 'provisioningApiAppAuthz OK' )
    return next()
  }
  return check
}

// ----------------------------------------------------------------------------

function apiAppAuthz( theGUI ) {
  gui = theGUI
 
  let check = async (req, res, next) => {
    let appId = req.headers[ 'app-id' ]
    let appPw = req.headers[ 'app-secret' ]
    log.info( 'apiAppAuthz', appId, appPw )
    let appScopes = await userDta.getApiAppScopes( appId, appPw )
    log.info( 'apiAppAuthz appScopes', req.params.scopeId , appScopes )
    if ( appScopes ) { 
      if ( req.params.scopeId && appScopes.indexOf( req.params.scopeId ) == -1 ) {
        log.warn( 'call scope is not authorized', req.headers )
        return next( new UnauthorizedError(
          'Not authorized for scope', 
          { message: 'Not authorized for scope' }
        ))
      }
  
      req.appId     = appId
      req.appScopes = appScopes
  
    } else {
      log.warn( 'call is not authorized', req.headers )
      return next( new UnauthorizedError(
        'Not authorized', 
        { message: 'Not authorized' }
      ))
    }
    return next();
  }
  return check
}
// ----------------------------------------------------------------------------
// Authorization Checker

function initJWTcheck() {
  // let clientID = cfg.CLIENT_ID
  // let audience = cfg.OICD.AUDIENCE
  // let issuer   = cfg.OICD.ISSUER

  let check = (req, res, next) => {
    log.debug( 'JWTcheck', req.headers.authorization )
    if ( req.query.layout && req.query.layout == 'pb-nonav' && req.query.id ) {
      return next() // then do URL-token autz for static boards
    } 
    if ( ! req.headers.authorization ) {
      log.info( 'JWTcheck', 'API call is not authorized: Authorization header not found' )
      return next( new UnauthorizedError(
        'No Authorization header found', 
        { message: 'Format is "Authorization: Bearer [token]"' }
      ))
    }
    // log.info( 'JWTcheck',req.headers )
    // parse JWT
    let parts = req.headers.authorization.split( ' ' )
    if ( parts.length == 2  &&  parts[0] == 'Bearer' ) {
      let bearer = parts[1]
      req.bearerToken = bearer
      log.debug( 'JWTcheck Bearer token: ', bearer )
      if (  req.headers['id-jwt'] ) {
        let openIdUser = jwtParser.decode( req.headers['id-jwt'], { complete: true }) || {}
        log.debug( 'JWTcheck ID token: ', openIdUser )
        //log.debug( 'expires', new Date( openIdUser.payload.exp *1000 ) )
        req.openIdUser = openIdUser
      }

    } else {
      log.info( 'JWTcheck', 'API call is not authorized: No Bearer token found' )
      return next( new UnauthorizedError(
        'No Bearer token found', 
        { message: 'Format is Authorization: Bearer [token]' }
      ))
    }
    // OK, check passed
    log.debug( 'JWTcheck', 'API call is authorized' )
    return next();
  }
  return check
}


function UnauthorizedError (code, error) {
  this.name    = "UnauthorizedError"
  this.message = error.message
  Error.call( this, error.message )
  Error.captureStackTrace( this, this.constructor )
  this.code   = code
  this.status = 401
  this.inner  = error
}

UnauthorizedError.prototype = Object.create(Error.prototype);
UnauthorizedError.prototype.constructor = UnauthorizedError;

// ============================================================================

// let autzCache = {}

// let autzCacheCln = setInterval( ()=> {
//   for ( let cId in autzCache ) {
//     if ( autzCache[ cId ].expire < Date.now() ) {
//       log.debug( 'autz cache cln', cId )
//       delete autzCache[ cId ]
//     }
//   }
// }, 1000*60 )

async function userAuthzForSvc( svcId, req, res  ) {
  log.debug( 'userAuthzForSvc', svcId )


  // let cachSvc = autzCache[ svcId+'/'+req.bearerToken ]
  // if ( cachSvc ) { 
  //   log.debug( 'cachSvc OK' )
  //   return cachSvc.svc 
  // }
  // let user = await ekosys.checkBearerAtEkosys( req.bearerToken ) 
  // if ( user.error ) {
  //   log.warn( 'userAuthorizedForSvc bearer err', user.error )
  //   res.status( 401 ).send()
  //   return null
  // }
  // let svc = await ekosys.loadService( svcId, req.bearerToken ) // TODO check why svcId can be null
  // log.debug( 'svc', svc )
  // if ( svc.response.statusCode != 200 ) {
  //   log.warn( 'userAuthorizedForSvc svc err' )
  //   res.status( 401 ).send()
  //   return null
  // }
  // autzCache[ svcId+'/'+req.bearerToken ] = {
  //   expire : Date.now() + 1000*60 * 10, // in 10 min 
  //   svc : svc
  // }
  // log.debug( 'cachSvc new' )
  // svc.ekosysId = svcId
  // return svc
  return {}
}
