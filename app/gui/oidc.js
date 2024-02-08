/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log     = require( '../helper/log' ).logger

const bodyParser = require( 'body-parser' )
const userDta    = require( '../persistence/app-dta-user' )
const jwt        = require( 'jsonwebtoken' )

// const mailer     = require( '../mailer' )

exports: module.exports = { 
  init
}

let gui = null
let cfg = null

async function init ( app, oicdCfg ) {
  log.info( 'Init OpenID Login' )
  cfg = oicdCfg
  gui = app

  let oidctPg = gui.addPage( 'openid-login-nonav', 'Login' )
  oidctPg.setPageWidth( '1200px' )

  oidctPg.addView({ 
    id: 'Login', title: 'Login', 
    height: '450px', 
    type: 'pong-form',
    resourceURL: 'oidc/login' 
  })

  oidctPg.title = 'Login' 

  svc = gui.getExpress() 
  svc.get(  '/oidc/authorize', authorize ) 
  svc.get(  '/oidc/login/pong-form', loginForm )
  svc.post( '/oidc/token', bodyParser.urlencoded({ extended: false }), genToken ) 
  svc.get(  '/oidc/login/auto', autoLogin )
  svc.post( '/oidc/login', bodyParser.urlencoded({ extended: false }), login )
  svc.get(  '/oidc/logout', logout )


  gui.createToken          = createToken
  gui.getUserIdForToken    = getUserIdForToken
  gui.getUserNameForToken  = getUserNameForToken
  gui.deleteUserIdForToken = deleteUserIdForToken

  oidcSessions = await userDta.loadOidcSessions()
}


let oidcSessions = {}

async function createToken( uid ) { // TODO: cluster enable
  // log.info( 'createToken', uid )
  let token = gui.mkToken(32)
  oidcSessions[ token ] = {
    uid : uid
  }
  await userDta.saveOidcSessions( oidcSessions )
  // log.info( 'createToken', token )
  return  token 
}

async function getUserIdForToken( token ) {
  let session = oidcSessions[ token ]
  if ( ! session ) { return null }
  // log.info( 'getUserIdForToken', token, session )
  return session.uid
}

async function getUserNameForToken( token ) {
  let session = oidcSessions[ token ]
  if ( ! session ) { return null }
  // log.info( 'getUserIdForToken', token, session )
  return session.uid
}

async function deleteUserIdForToken( token ) {
  delete oidcSessions[ token ]
  await userDta.saveOidcSessions( oidcSessions )
}

// ----------------------------------------------------------------------------

async function authorize( req, res ) {
  log.info( 'GET /oidc/authorize' )
  try {
    let ctx = await getContextOrInfo( req )
    if ( ctx && ctx.userId ) {
      // console.log( "ctx", ctx )
      let redirectURL = req.query.redirect_uri 
      let user = await userDta.getUserInfo( ctx.userId )
      // console.log( "user", user  )
      let idToken =  await oidcGetIdToken( req, user.userId, req.query.client_id )
      let accessToken = await gui.createToken( user.userId )

      redirectURL += ( redirectURL.indexOf( '?' ) > 0 ? '&' : '?' ) + 'id_token='+ idToken+'&access_token=' + accessToken

      return res.redirect( redirectURL ) 
    } else {
      let loginURL = "../index.html?layout=openid-login-nonav"
      for ( let p in req.query ) { loginURL += `&${p}=${req.query[p]}` }
      log.info( 'GET /oidc/authorize append redirect ...' )
      return res.redirect( loginURL )
    }
  } catch (exc) {
    log.error( 'GET /oidc/authorize', exc  )
    let loginURL = "../index.html?layout=openid-login-nonav"
    for ( let p in req.query ) { loginURL += `&${p}=${req.query[p]}` }
    return res.redirect( loginURL )
  }
}
  
async function loginForm ( req, res ) {
  log.info( 'GET /oidc/login/pong-form' )
  // let prd  = null
  // if ( req.query.client_id ) {
  //   prd = await subDB.getProduct( helper.getTenant( req ), req.query.client_id )
  //   if ( ! prd ) {
  //     return res.status( 200 ).send( { id: 'oIdcLoginForm', fieldGroups: [ { columns: [ { formFields: [
  //       { id: 'err', type: 'text', label: 'ERROR', readonly: true, defaultVal:'Client ID not valid'  }
  //     ] } ] } ] }) 
  //   }
  // } else {
  //   return res.status( 200 ).send( { id: 'oIdcLoginForm', fieldGroups: [ { columns: [ { formFields: [
  //       { id: 'err', type: 'text', label: 'ERROR', readonly: true, defaultVal:'Client ID required'  }
  //     ] } ] } ] }) 
  // }
  let frm = { 
    id: 'oIdcLoginForm',
    fieldGroups: [ { columns: [
      { formFields: [
        { id: 'app', type: 'text', label: 'App', readonly: true, defaultVal: '5d380c06abc348168ba62ec6' }, 
        { id: 'client_id', type: 'text', hidden: true, value: req.query.client_id }, // refers subscription
        { id: 'scope', type: 'text', hidden: true, value: req.query.scope }, 
        { id: 'audience', type: 'text', hidden: true, value: req.query.audience }, 
        { id: 'redirect_uri', type: 'text',  hidden: true, value: req.query.redirect_uri  },
        { id: 'response_type', type: 'text', hidden: true, value: req.query.response_type }, 
        { id: 'email', type: 'text', label: 'Email' },
        { id: 'password', type: 'password',label: 'Password' }
      ] }
    ] } ],
    actions: [
      {
        id: 'oIdcLoginFormBtn',
        actionName: 'Login',
        actionURL: 'oidc/token',
        target: '_parent'
      }
    ]
  }
  res.send( frm )
}


async function genToken( req, res ) {
  log.info( 'POST /oidc/token' )
  try {
    if ( req.body.client_id &&  req.body.redirect_uri &&
          req.body.email && req.body.password ) { 
      
      if ( await userDta.authenticate( req.body.email, req.body.password ) ) {

        let accessToken = await gui.createToken( req.body.email )
        res.cookie( 'pong-security', accessToken, { httpOnly: true, path: gui.appRoot } )

        let idToken = await oidcGetIdToken( req )

        let redURL = req.body.redirect_uri
        redURL+= ( redURL.indexOf( '?' ) > 0 ? '&' : '?' ) + 'id_token='+ idToken+'&access_token=' + accessToken;

        res.send( redURL )

        // } else {
        //   res.status( 400 ).send( 'Not Authorized' )
        // }
      } else {
        return res.status( 401 ).send( 'Failed' )
      }

    } else {
      res.status( 400 ).send( 'Parameter Error' )
    }
  } catch ( e ) {
    log.error( 'POST /oidct/token', e )
    res.status( 500 ).send( [] )
  }
}


async function autoLogin( req, res ) {
  log.info( 'GET /oidc/login/auto', req.query )
  if ( req.query.client_id && req.query.email && req.query.t && req.query.redirect_uri ) { 
    let accessToken = await gui.createToken( req.query.email )
    res.cookie( 'pong-security', accessToken, { httpOnly: true, path: gui.appRoot } )

    let idToken = await oidcGetIdToken( req, req.query.email, req.query.client_id )

    let redURL = req.query.redirect_uri
    redURL+= ( redURL.indexOf( '?' ) > 0 ? '&' : '?' ) + 'id_token='+ idToken+'&access_token=' + accessToken;

    res.redirect( redURL )

  } else {
    res.status( 400 ).send( 'Parameter Error' )
  }
}


async function login( req, res ) {
  try {
    log.info( 'GET /oidct/login', req.body )
    if ( req.body.client_id && req.body.email && req.body.password ) { 
      
      if ( userDta.authenticate( req.body.email ) ) {
        log.info( 'oicd login', err, loginOK )
        let accessToken = await gui.createToken( req.body.email )
        res.cookie( 'pong-security', accessToken, { httpOnly: true, path: gui.appRoot } )

        // let idToken = await oidcGetIdToken( req )

        res.send( accessToken )

        // } else {
        //   res.status( 400 ).send( 'Not Authorized' )
        // }
      } else {
        return res.status( 401 ).send( 'Failed' )
      }

    } else {
      res.status( 400 ).send( 'Parameter Error' )
    }
  } catch ( e ) {
    log.error( '/oidct/login', e )
    res.status( 500 ).send( 'Error' )
  }
}

function logout(req, res) {
  log.info( 'GET /oidc/logout' )
  var token = req.cookies[ 'pong-security' ]
  res.redirect( req.query.return_to )
  gui.deleteUserIdForToken( token )
}


async function oidcGetIdToken( req, email, cltId ) {
  //console.log(  'oidcGetIdToken', email, cltId ) 
  try {
    let uid = ( email ? email : req.body.email )
    let clt = ( cltId ? cltId : req.body.client_id )
    let user = await userDta.getUserInfo( uid )
    // log.info( 'oidcGetIdToken', uid, user )
    if ( ! user ) { return null }
    let userID = user.userId + ''
    //if ( sub.user.indexOf( userID ) >= 0 ) { TODO

      let idToken = jwt.sign({
        iss   : 'EkoSys',
        aud   : clt,
        email : uid,
        name  : user.name,
        sub   : userID,
        exp   : Math.round( Date.now() / 1000 +  cfg.userSessionExpireMin * 60 )
        //TODO?
      }, cfg.OPENID_SEC_KEY );
      // log.info( 'token', idToken )
      return idToken
  } catch ( exc ) { 
    log.error( 'oidcGetIdToken', exc )
    return null
  }
}


async function getContextOrInfo( req ) {
  let result = { 
    tenantDN : '', 
    userId   : null 
  }
  result.userId  = await gui.getUserIdFromReq( req )
  return result
}