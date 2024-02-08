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
const apiSec    = require( './api/api-sec' )
const userAPI   = require( './api/api-user' )
const appMgrAPI = require( './api/api-appmgr' )
const appMgrGUI = require( './gui/gui-appmgr' )
const oidc      = require( './gui/oidc.js' )
const eh        = require( './eh/even-hub.js' )


exports: module.exports = {
  init
}

async function init( lowCodeConfig ) {
  let cfg = checkConfig( lowCodeConfig )

  apiSec.init( cfg.OICD )
  let app = appGUI.init( cfg )
  await appData.init( cfg.DATA_DIR, cfg.FAKE_LOGIN )
  await eh.init( app )

  await appGUI.initPages()

  await appMgrGUI.init()
  appSec.init( app, cfg.OICD )

  if ( cfg.OIDC_SERVER )  {
   oidc.init( app, cfg.OICD )
  }

  await appAPI.setupAPI( app, cfg.OICD )
  await appMgrAPI.setupAPI( app )
  await userAPI.setupAPI( app )

}


// ============================================================================
// helper to check config params

function checkConfig( cfg ) {
  if ( ! cfg ) {  cfg = {} } 
  
  checkCfgParam( cfg, 'DATA_DIR', '../dta/' )
  cfg.DATA_DIR = path.resolve( cfg.DATA_DIR ) 
  
  checkCfgParam( cfg, 'URL_PATH', '/' )
  checkCfgParam( cfg, 'PORT', 8888 )
  checkCfgParam( cfg, 'GUI_URL','http://localhost:' + cfg.PORT + cfg.PATH )

  checkOicdParams( cfg )
  log.debug( 'CONFIG', cfg )
  return cfg
}

// ----------------------------------------------------------------------------
function checkCfgParam( cfg, paramName, defaultVal ) {
  if ( config[ paramName ] ) {
    cfg[ paramName ] = config[ paramName ]
    log.debug( 'Low Code App Init: ',paramName, defaultVal ) 
  } else if ( ! cfg[ paramName ]  || ! typeof myVar === 'string' ) { 
    log.warn( 'Low Code App Init: Use default '+paramName+'="'+defaultVal+'"' ) 
    cfg[ paramName ] = defaultVal
  }  
}

function checkOicdParams( cfg ) {
  if ( ! cfg.OICD ) {
    cfg.OICD = {
      OPENID_SEC_KEY: '_______change_me_______',
      CLIENT_ID: 'a0000a0000a0000a0000a000',
      ISSUER: 'https://localhost/',
      JWKS_URI: 'https://localhost/.well-known/jwks.json',
      AUDIENCE: 'http://localhost:8888/',
      AUTH_DOMAIN: 'localhost',
      AUTH_SCOPE: 'read:all',
      LOGIN_URL:  'oidc/authorize',
      LOGOUT_URL: 'oidc/logout',
      CHANGE_PWD_URL: 'http://localhost:8888/index.html?layout=main',
      REGISTER_URL: 'http://localhost:8888/index.html?layout=product-nonav&id=5d380c06abc348168ba62ec6',
      PWD_RESET_URL: 'http://localhost:8888/index.html?layout=main',
  
      LOGIN_REDIRECT: 'http://localhost:8888/app/index.html',
      LOGOUT_REDIRECT: 'http://localhost:8888/app/index.html',
      userSessionExpireMin : 60
    }
  }
}
