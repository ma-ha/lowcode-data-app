/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log       = require( './helper/log' ).logger
const config    = require( 'config' )
const pjson     = require( './package.json' )
log.info( `Starting ${pjson.name} v${pjson.version} NODE_ENV=${process.env.NODE_ENV}` )

const path      = require( 'path' )
const appGUI    = require( './gui/gui' )
const appSec    = require( './gui/app-sec' )
const appData   = require( './persistence/app-dta' )
const appAPI    = require( './api/api-entity' )
const appAdapter= require( './api/api-adapter' )
const apiSec    = require( './api/api-sec' )
const adminAPI  = require( './api/api-admin' )
const appMgrAPI = require( './api/api-appmgr' )
const appMgrGUI = require( './gui/gui-appmgr' )
const marketAPI = require( './api/api-market' )
const oidc      = require( './gui/oidc' )
const eh        = require( './eh/even-hub' )


exports: module.exports = {
  init
}

async function init( lowCodeConfig ) {
  let cfg = checkConfig( lowCodeConfig )

  apiSec.init( cfg )
  let app = appGUI.init( cfg )
  await appData.init( cfg )
  await eh.init( app, appData )

  await appGUI.initPages()

  await appMgrGUI.init()
  appSec.init( app, cfg )

  if ( cfg.OIDC_SERVER )  {
   oidc.init( app, cfg.OIDC )
  }

  await appAPI.setupAPI( app, cfg)
  await appAdapter.setupAPI( app, cfg )
  await appMgrAPI.setupAPI( app )
  await adminAPI.setupAPI( app, cfg )
  await marketAPI.setupAPI( app, cfg )
  
  return app
}


// ============================================================================
// helper to check config params

function checkConfig( cfg ) {
  if ( ! cfg ) {  cfg = {} } 
  
  checkCfgParam( cfg, 'PROVISIONING_API_KEY', 'CHANGE_ME' )
  checkCfgParam( cfg, 'SUPER_TENANT_ADMIN', '' )

  checkCfgParam( cfg, 'DATA_DIR', '../dta/' )
  cfg.DATA_DIR = path.resolve( cfg.DATA_DIR ) 
  
  checkCfgParam( cfg, 'URL_PATH', '/' )
  checkCfgParam( cfg, 'PORT', 8888 )
  checkCfgParam( cfg, 'HOST', 'localhost' )
  checkCfgParam( cfg, 'GUI_URL','http://'+ cfg.HOST +':' + cfg.PORT + cfg.PATH )
  
  checkCfgParam( cfg, 'MARKETPLACE_URL', 'http://localhost/mh/lowcode-app-market' )
  
  checkOidcParams( cfg )
  log.debug( 'CONFIG', cfg )
  return cfg
}

// ----------------------------------------------------------------------------
function checkCfgParam( cfg, paramName, defaultVal ) {
  if ( config[ paramName ] ) {
    cfg[ paramName ] = config[ paramName ]
    log.debug( 'Low Code App Init: ',paramName, defaultVal ) 
  } else if ( ! cfg[ paramName ]  || ! typeof cfg[ paramName ] === 'string' ) { 
    log.warn( 'Low Code App Init: Use default '+paramName+'="'+defaultVal+'"' ) 
    cfg[ paramName ] = defaultVal
  }  
}

function checkOidcParams( cfg ) {
  if ( ! cfg.OIDC ) {
    cfg.OIDC = {
      OPENID_SEC_KEY: '_______change_me_______',
      CLIENT_ID: 'a0000a0000a0000a0000a000',
      ISSUER: 'https://localhost/',
      JWKS_URI: 'https://localhost/.well-known/jwks.json',
      AUDIENCE: 'http://localhost:8888/',
      AUTH_DOMAIN: 'localhost',
      AUTH_SCOPE: 'read:all',
      LOGIN_URL:  'oidc/authorize',
      LOGOUT_URL: 'oidc/logout',
      CHANGE_PWD_URL: 'index.html?layout=change-password-nonav',
      REGISTER_URL: 'http://localhost:8888/index.html?layout=product-nonav&id=5d380c06abc348168ba62ec6',
      PWD_RESET_URL: 'http://localhost:8888/index.html?layout=main',
  
      LOGIN_REDIRECT: 'http://localhost:8888/app/index.html',
      LOGOUT_REDIRECT: 'http://localhost:8888/app/index.html',
      userSessionExpireMin : 60
    }
  }
}
