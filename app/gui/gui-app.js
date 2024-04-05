/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const log     = require( '../helper/log' ).logger
const pjson   = require( '../package.json' )

const dta     = require( '../persistence/app-dta' )

exports: module.exports = {
  init
}

async function init() {
  // App Overview
  let appPage = gui.addPage( 'Apps' ) 

  appPage.title    = 'Apps'
  appPage.navLabel = 'Apps'
  appPage.setPageWidth( '90%' )
  appPage.addView(
    { id:'Apps', type:'pong-icons', resourceURL:'gui/tenant/app/icons', height:'760px' }
  )
}