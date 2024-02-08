/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const log     = require( '../helper/log' ).logger
const pjson   = require( '../package.json' )

const dta     = require( '../persistence/app-dta' )

exports: module.exports = {
  init
}

async function init( ) {
  let marketPage = gui.addPage( 'Marketplace' ) 
  marketPage.title    = 'App Marketplace'
  marketPage.navLabel = 'Marketplace'
  marketPage.setPageWidth( '90%' )

  marketPage.addView({ 
    id: 'AppMarketplace', title: 'App Marketplace',  height: '600px', 
    resourceURL: 'svc/product/stat' 
  })

}
