/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const express = require( 'express' )
const log     = require( '../helper/log' ).logger
const pjson   = require( '../package.json' )
const weblog  = require( './weblog' ) 

const content = require( './api-content' ) 

const entityGUI      = require( './gui-entity' ) 
const marketplaceGUI = require( './gui-marketplace' ) 
const appGUI         = require( './gui-app' ) 
const docuGUI        = require( './gui-docu' ) 
const userGUI        = require( './gui-user' ) 
const userCSS        = require( './gui-css' ) 

const dta     = require( '../persistence/app-dta' )
const userDta = require( '../persistence/app-dta-user' )

exports: module.exports = {
  init,
  initPages
}


const PRD_NAME = 'LowCode App'
let cfg = {}

function init( appConfig ) {
  cfg = appConfig
  log.info( 'Starting GUI...' )

  // api.initAPI( gui.getExpress() )
  gui.getExpress().use( '/ext-module', express.static( __dirname + '/ext-module' ) )

  // gui.getExpress().use( '/content', express.static( __dirname + '/serve-html' ) )
  // gui.getExpress().use( '/ext-module', express.static( __dirname + '/ext-module' ) )
  if ( cfg.IMG_PATH ) {
    gui.getExpress().use( '/img', express.static( cfg.IMG_PATH  ) )
  } else {
    gui.getExpress().use( '/img', express.static( __dirname + '/img' ) )
  }
  
  gui.express.use( weblog() )

  // gui.dynamicTitle( ( title, req, page ) => {
  //   return dynamicTitle( title, req, page )
  // })

  content.init( gui.getExpress(), cfg )

  return gui
}


async function initPages( ) {
  /** Initialize the framework and the default page */
  gui.init( PRD_NAME, cfg.PORT, cfg.URL_PATH )
  gui.pages['main'].title    = 'LoCode'
  gui.pages['main'].navLabel = "What's it"
  gui.pages['main'].setPageWidth( '90%' )

  gui.dynamicHeader( genPageHeader )
  gui.dynamicNav( genDynNav )
   
  if ( cfg.CSS_PATH ) {
    gui.getExpress().use( '/css-custom', express.static( cfg.CSS_PATH  ) )
  } else {
   await userCSS.init( gui, cfg )
    // gui.getExpress().use( '/css-custom', express.static( __dirname + '/css' ) )
  }

  // ..........................................................................
  /** Add an empty view to the default page. */
  gui.addView({ 
    id:'welcome', name:'',
    height:'auto', 
    resourceURL: 'content/welcome',
    decor: 'none'
  }) 

  // ..........................................................................

   gui.dynamicTitle( async ( title, req, page ) => {  return ( cfg.TITLE ? cfg.TITLE : 'Low Code App' ) } )

  // ..........................................................................

  addHtmlPage( gui, 'gtc-en', 'GTC', 'GTC' )
  addHtmlPage( gui, 'gtc-de', 'GTC', 'GTC' )
  addHtmlPage( gui, 'privacy-en', 'Privacy Policy', 'PRV' )
  addHtmlPage( gui, 'imprint-en', 'Imprint', 'IMP' )
  

  gui.pages['main'].footer.copyrightText = PRD_NAME + ' v'+pjson.version + ' &#169; ma-ha, 2023  ' 
    + '<a href="https://github.com/ma-ha/lowcode-data-app" target="_blank">GitHub</a> / '
    + '<a href="https://www.npmjs.com/package/lowcode-data-app" target="_blank">NPM</a>'
  gui.pages['main'].addFooterLink( 'Imprint',  getHtmlURL( 'imprint-en' )  )
  gui.pages['main'].addFooterLink( 'Privacy Policy',  getHtmlURL( 'privacy-en' ) ) 
  gui.pages['main'].addFooterLink( 'General Terms and Conditions',  getHtmlURL( 'gtc-en' ) )
 
  // --------------------------------------------------------------------------

  entityGUI.init()
  marketplaceGUI.init()
  appGUI.init()
  if ( cfg.HIDE_DOCU !== false ) {
    docuGUI.init()
  }
  userGUI.init()
}

// ==========================================================================++
 
function genDynNav ( navType, oldNavTabs, req ) {
  return new Promise( async ( resolve, reject ) => {
    try {
      if ( navType === 'nav' ) { // can also be 'nav-embed' and 'nav-embed-sub'
        log.debug( 'dynamicNav', oldNavTabs )
        let menu = JSON.parse( JSON.stringify( oldNavTabs ) )
        let user = await userDta.getUserInfoFromReq( gui, req )
        // log.info( 'dynamicNav', user )

        if ( user ) {
          menu = [{ "layout": "Apps",  "label": "Apps" }]

          // check if user needs admin menu
          for ( let adminScopeId of user.role.admin ) {
            // log.info( 'dynamicNav admin', adminScopeId )
            if ( user.scopeId.indexOf( adminScopeId ) == 0) {
              menu.push({ layout: 'Scope', label: 'Scopes' })
              menu.push({ layout: 'Users', label: 'Users' })
              break                
            }
          }
          // check if user needs dev menu
          for ( let devScopeId of user.role.dev ) {
            log.debug( 'dynamicNav dev', user )
            if ( user.scopeId.indexOf( devScopeId ) == 0 ) {
              menu.push({ layout: 'Customize', label: 'Customize' })
              menu.push({ layout: 'Marketplace', label: 'App Marketplace' })
              break                
            }
          }
          
          if ( oldNavTabs ) {
            for ( let nav of oldNavTabs ) {
              log.debug( 'nav', nav )
              if ( nav.label == 'Docu' ) {
                menu.push( nav )
              }
            }
          }

        } else {
          log.debug( 'menu', menu )
        }

        resolve( menu )

      } else {
        resolve( oldNavTabs )
      }
    } catch ( e ) { 
      log.error('dynamicNav', e)
      resolve( oldNavTabs )
    }
  })
}

// ==========================================================================++


async function genPageHeader ( pgHeader, req, page ) {
  // return new Promise( ( resolve, reject ) => {
    // log.info( 'genPageHeader', pgHeader )
    if ( page == 'openid-login-nonav' ) {
      return {
        logo: { text: "Login" },
        frameWarning: "true",
        modules: []
      }
    }

    let user = await userDta.getUserInfoFromReq( gui, req )
    // log.info( 'genPageHeader', user )
    if ( user ) { 
      pgHeader.logo = { text: '<a href="index.html">'+await userDta.getScopeName( user.rootScopeId ) +'</a>' }

      if ( user.rootScopeId != user.scopeId ) {
        pgHeader.logo.text += '<br/><span class="header-logo-tenant">'+ await userDta.getScopeName( user.scopeId ) + '</span>'
      }
    
      let scopeTbl = await userDta.getScopeList( user.userId )
      let menuItems = []
      for ( let scope in scopeTbl ) {
        let ident = ''
        let deepth = (scope.match(/\//g) || []).length
        for ( let i = 0; i < deepth; i++ ) { ident += '&nbsp;&nbsp;'} 
        if ( page == 'AppEntity-nonav' ) {
          if ( req.query.id ) {
            page += '&app='+ req.query.id
          }
        }
        menuItems.push({ html: ident + '<a href="setscope?id='+scope+'&layout='+page+'">'+scopeTbl[ scope ].name+'</a>', id: scope })
      }

      menuItems.sort( ( a, b ) => {
        if ( a.id > b.id ) { return 1 }
        return -1
      })

      let actScope = await userDta.getSelScopeName( user.userId )
      pgHeader.modules.push({ 
        id    : "ScopeSel", 
        type  : "pong-pulldown", 
        moduleConfig : {
          title: 'Scope: '+actScope,
          menuItems : menuItems
        }
      })
    }
    // log.info( pgHeader )
    // resolve( pgHeader )
    return pgHeader
}

// ==========================================================================
// helper 

function errorView( txt ) {
  return [{ 
    id: 'error', 
    title: 'Error: '+txt,
    height: '100px', decor: 'decor',
    resourceURL: 'none'
  }]
}

function getHtmlURL( id ) {
  return  cfg.GUI_URL+'/index.html?layout='+id+'-nonav'
}

function addHtmlPage( gui, id, title, cssId, contentId ) {
  log.info( 'addHtmlPage',  id + '-nonav' )
  let gtcPage = gui.addPage( id + '-nonav', title )
  gtcPage.title = 'LowCode APp'
  gtcPage.setPageWidth( '90%' )
  /** Add an empty view to the default page. */
  gtcPage.addView({ 
    id: cssId, name:'',
    height:'auto', 
    resourceURL: 'content/'+id,
    decor: 'none'
  }) 
}


