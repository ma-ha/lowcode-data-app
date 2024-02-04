/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const log     = require( '../helper/log' ).logger
const cfg     = require( 'config' )
const pjson   = require( '../package.json' )

const dta     = require( '../app-dta' )

exports: module.exports = {
  init
}


function init( ) {
  addDocuPg( gui, 'get-started',  'Getting Started' ) 
  addDocuPg( gui, 'marketplace',  'Administration' ) 
  addDocuPg( gui, 'customize',    'Customize' ) 
}

// ==========================================================================++
 
function addDocuPg( gui, id, title ) {
  let docuPage = gui.addPage( 'Docu/'+id, title ) 
  docuPage.title    = 'K8s Mon Docu'
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


