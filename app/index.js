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

  let app = appGUI.init( )
  await appData.init( cfg.DATA_DIR )
  await eh.init( app )

  await appGUI.initPages()

  await appMgrGUI.init()
  appSec.init( app )

  oidc.init( app )  
  
  await appAPI.setupAPI( app )
  await appMgrAPI.setupAPI( app )
  await userAPI.setupAPI( app )

}


// ============================================================================
// helper to check config params

function checkConfig( cfg ) {
  if ( ! cfg ) {  cfg = {} } 
  
  checkCfgParam( cfg, 'DATA_DIR', '../dta/' )
  cfg.DATA_DIR = path.resolve( cfg.DATA_DIR ) 

  
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