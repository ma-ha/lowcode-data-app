/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log      = require( './log' ).logger
const pjson    = require( './package.json' )
log.info( `Starting ${pjson.name} v${pjson.version} NODE_ENV=${process.env.NODE_ENV}` )

// const db       = require( './db' )
const appGUI    = require( './gui' )
const appSec    = require( './app-sec' )
const appData   = require( './app-dta' )
const appAPI    = require( './api-entity' )
const userAPI   = require( './api-user' )

const appMgrGUI = require( './gui-appmgr' )
const appMgrAPI = require( './api-appmgr' )

const oidc      =  require( './oidc.js' )

// const job      = require( './job' )

const eh = require( './even-hub.js' )

async function start() {
  // await db.init( )

  let app = appGUI.init( )
  await appData.init()
  await eh.init( app )

  await appGUI.initPages()

  await appMgrGUI.init()
  appSec.init( app )

  oidc.init( app )  
  
  await appAPI.setupAPI( app )
  await appMgrAPI.setupAPI( app )
  await userAPI.setupAPI( app )

}

start()