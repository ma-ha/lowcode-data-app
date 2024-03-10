/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const log     = require( '../helper/log' ).logger
const pjson   = require( '../package.json' )

const dta     = require( '../persistence/app-dta' )

exports: module.exports = {
  init
}


function init( ) {
  addDocuPg( gui, 'get-started',    'Getting Started' ) 
  // addDocuPg( gui, 'administration', 'Administration' ) 
  // addDocuPg( gui, 'customize',      'Customize' ) 
  addDocuPg( gui, 'API-Data',              'Data API' ) 
  addDocuPg( gui, 'API-EventSubscription', 'Event Subscription API' ) 
  addDocuPg( gui, 'API-Provisioning',      'Provisioning API' ) 
}

// ==========================================================================++
 
function addDocuPg( gui, id, title ) {
  let docuPage = gui.addPage( 'Docu/'+id, title ) 
  docuPage.title    = 'LowCode App Docu'
  docuPage.navLabel = title
  docuPage.setPageWidth( '90%' )

  docuPage.addView({ 
    id:'docuhead', name:'',
    height:'230', 
    resourceURL: 'docuhead/'+title,
    decor: 'none'
  }) 

  docuPage.addView({
    id    : 'docu',
    title : 'Documentation',
    type  : 'pong-markdown',
    resourceURL : 'md/',
    height: 'auto',
    decor: 'none'
  },
  {
    page  : '${lang}/${page}',
    start : id,
    edit  : false
  }) 
}


