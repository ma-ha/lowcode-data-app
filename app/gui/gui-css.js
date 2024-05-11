/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const fs  = require( 'fs' )
const log = require( '../helper/log' ).logger
const dta = require( '../persistence/app-dta' )
const sec = require( '../api/api-sec' )
const userDta = require( '../persistence/app-dta-user' )

exports: module.exports = {
  init
}

let STATIC_CSS_D = ''
let STATIC_CSS_M = ''
let STATIC_CSS_T = ''

const colors = [
  { id: "theme-color", label: 'Theme Color', default: '#01699b', cat: 'Main' },
  { id: "main-bg-color", label: 'Main Background Color', default: '#ffffff', cat: 'MainBg' },
  { id: "main-color", label: 'Main Font Color', default: '#405466', cat: 'Main' },
  { id: "link-color", label: 'Link Color', default: '#444444', cat: 'Main' },
  { id: "link-active-color", label: 'Link Active Color', default: '#000000', cat: 'Main' },
  { id: "content-h-bg-color", label: 'Highlight Background Color', default: '#81c3e8', cat: 'MainBg' },
  { id: "header-bg-color", label: 'Header Background Color', default: '#222222', cat: 'Header' },
  { id: "invalid-color", label: 'Invalid Color', default: '#2082ba', cat: 'Main' },
  { id: "menu-bg-color", label: 'Menu Background Color', default: '#444444', cat: 'Header' },
  { id: "menu-color",  label: 'Menu Font Color', default: '#ffffff', cat: 'Header' },
  { id: "menu-bg-active-color", label: 'Menu Background Active Color', default: '#01699b', cat: 'Header' },
  { id: "menu-bg-hover-color", label: 'Menu Background Hover Color', default: '#81c3e8', cat: 'Header' },
  { id: "footer-bg-color", label: 'Footer Background Color', default: '#222222', cat: 'Footer' },
  { id: "footer-color",label: 'Footer Font Color', type:'color', default: '#d5d5d5', cat: 'Footer'  },
  { id: "footer-link-color", label: 'Footer Link Color', default: '#d5d5d5', cat: 'Footer'  },
  { id: "footer-link-active-color", label: 'Footer Link Active Color', default: '#81c3e8', cat: 'Footer' }
]

let cssRoot = ''

//-----------------------------------------------------------------------------
let gui = null

async function init( app, cfg ) {
  gui = app

  await readStaticCSS()

  cssRoot = ':root {'
  for ( let c of colors ) {
    cssRoot += '\n  --' + c.id + ': ' + c.default +';'
  }
  cssRoot += '\n}'

  const adminAuthz = sec.adminAuthz( app )
  let svc = app.getExpress()


  svc.get(  '/css-custom/:css', serveCss )
  svc.get(  '/css/colors', adminAuthz, getCssColors )
  svc.post( '/css/colors', adminAuthz, saveCssColors )
  svc.get(  '/css/custom/:device', adminAuthz, getCustomCss )
  svc.post( '/css/custom/:device', adminAuthz, saveCustomCss )

  let cssPage = app.addPage( 'css-edit-nonav' ) 
  cssPage.title    = 'Customize CSS'
  cssPage.setPageWidth( '90%' )

  let fsMain = []
  let fsMainBg = []
  let fsHeader = []
  let fsFooter = []
  let col = [
    
  ]
  let i = 0
  for ( let c of colors ) {
    let inp = { id: c.id, name: c.id, label: c.label, type:'color' }
    if ( c.cat == 'Main' ) {
      fsMain.push( inp )
    } else if ( c.cat == 'MainBg' ) {
      fsMainBg.push( inp )
    } else  if ( c.cat == 'Header' ) {
      fsHeader.push( inp )
    } else  if ( c.cat == 'Footer' ) {
      fsFooter.push( inp )
    }  
  }
  cssPage.addView(
    { id: 'StyleColors', title: 'Color Scheme', 
      height: '360px',
      resourceURL: 'css/colors',
      type: 'pong-form'
    },
    { 
      fieldGroups: [{ 
        columns: [
          { fieldset: 'Main Colors',   formFields: fsMain },
          { fieldset: 'Main Background Colors', formFields: fsMainBg },
          { fieldset: 'Header Colors', formFields: fsHeader },
          { fieldset: 'Footer Colors', formFields: fsFooter }
        ] 
      }],
      actions : [ 
        { id: 'Init', onInit: { load: 'css' }, actionURL: 'css/colors' },
        { id: 'Save', actionName: 'Save', actionURL: 'css/colors', target: 'modal'  }
      ]
    }
  )

  var cssTabs = cssPage.addTabContainer( { id:'cssTabs', height:'400px'} )
  cssTabs.addView(
    { id: 'CssDesktop', title: 'Desktop CSS', 
      height: '370px', resourceURL: 'css/custom/desktop',
      type: 'pong-form' },
    { fieldGroups: [{ columns: [{  formFields: [
        { id: 'css', name: 'css', label: '', type:'text', rows: 14 }
      ]} ]} ],
      actions : [ 
        { id: 'Init', onInit: { load: 'css' }, actionURL: 'css/custom/desktop' },
        { id: 'Save', actionName: 'Save', actionURL: 'css/custom/desktop', target: 'modal' }
      ]
    }
  )
  cssTabs.addView(
    { id: 'CssTablet', title: 'Tablet CSS', 
      height: '360px', resourceURL: 'css/custom/tablet',
      type: 'pong-form' },
    { fieldGroups: [{ columns: [{  formFields: [
      { id: 'css', name: 'css', label: '', type:'text', rows: 14 }
    ]} ]} ],
      actions : [ 
        { id: 'Init', onInit: { load: 'css' }, actionURL: 'css/custom/tablet' },
        { id: 'Save', actionName: 'Save', actionURL: 'css/custom/tablet', target: 'modal' }
      ]
    }
  )
  cssTabs.addView(
    { id: 'CssMobile', title: 'Mobile CSS', 
      height: '360px', resourceURL: 'css/custom/mobile',
      type: 'pong-form' },
    { fieldGroups: [{ columns: [{  formFields: [
      { id: 'css', name: 'css', label: '', type:'text', rows: 14 }
    ]} ]} ],
      actions : [ 
        { id: 'Init', onInit: { load: 'css' }, actionURL: 'css/custom/mobile' },
        { id: 'Save', actionName: 'Save', actionURL: 'css/custom/mobile', target: 'modal' }
      ]
    }
  )
}

//-----------------------------------------------------------------------------
async function getCssColors( req, res ) {
  log.info( 'getCssColors' )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'Login required' ) }
  let cssCfg = await dta.getDataById( 'scopeCss', user.rootScopeId )
  if ( ! cssCfg || ! cssCfg.defaultColors ) {
    let defaultColors = {}
    for ( let c of colors ) {
      defaultColors[ c.id ] = c.default
    }
    log.info( 'getCssColors', defaultColors )
    return res.send( defaultColors )
  }
  log.info( 'getCssColors ... from db' )
  res.send( cssCfg.defaultColors )
}

//-----------------------------------------------------------------------------
async function saveCssColors( req, res ) {
  log.info( 'saveCssColors', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'Login required' ) }
  let cssCfg = await dta.getDataById( 'scopeCss', user.rootScopeId )
  if ( ! cssCfg ) {
    cssCfg = {
      defaultColors: req.body,
      css: {
        desktop : '',
        mobile  : '',
        tablet  : ''
      }
    }
  } else {
    cssCfg.defaultColors = req.body
  }
  await dta.addDataObjNoEvent( 'scopeCss', user.rootScopeId, cssCfg )
  if ( cssCache[ user.rootScopeId ] ) { delete cssCache[ user.rootScopeId ] }
  res.send( 'OK' )
}

//-----------------------------------------------------------------------------
async function getCustomCss( req, res ) {
  log.info( 'getCustomCss',req.params )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.send( '' ) }
  let cssCfg = await dta.getDataById( 'scopeCss', user.rootScopeId )
  if ( ! cssCfg || ! cssCfg.css[ req.params.device ] ) { return res.send( '' ) }
  res.send( { css: cssCfg.css[ req.params.device ] } )
}

//-----------------------------------------------------------------------------
async function saveCustomCss( req, res ) {
  log.info( 'saveCustomCss', req.body, req.params )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'Login required' ) }
  // if ( ! req.body.css || ! req.params.device ) { return res.status(400).send( 'Parameter required' ) }
  let cssCfg = await dta.getDataById( 'scopeCss', user.rootScopeId )
  if ( ! cssCfg ) {
    let defaultColors = {}
    for ( let c of colors ) {
      defaultColors[ c.id ] = c.default
    }
    cssCfg = {
      defaultColors: defaultColors,
      css: {
        desktop : '',
        mobile  : '',
        tablet  : ''
      }
    }
  }
  cssCfg.css[ req.params.device ] = req.body.css
  await dta.addDataObjNoEvent( 'scopeCss', user.rootScopeId, cssCfg )
  if ( cssCache[ user.rootScopeId ] ) { delete cssCache[ user.rootScopeId ] }
  res.send( 'OK' )
}


//-----------------------------------------------------------------------------
async function serveCss( req, res ) {
  log.info( '>>>>>>>>>>>>', req.params )
  let css = ''
  let user = await userDta.getUserInfoFromReq( gui, req )
  let { rootCol, tenantCss } = await geStyle( user )
  if ( req.params.css == 'custom.css' ) {
    css = rootCol +'\n'+ STATIC_CSS_D +'\n'+ tenantCss.desktop
    log.info( '>>>>>>>>>>>>',rootCol)

  } else if ( req.params.css == 'custom-t.css' ) {
    css = STATIC_CSS_T + '\n' + tenantCss.tablet
  } else if ( req.params.css == 'custom-m.css' ) {
    css = STATIC_CSS_M + '\n' + tenantCss.mobile
  } 
  res.setHeader( 'content-type', 'text/css; charset=UTF-8' )
  res.send( css )
}

//-----------------------------------------------------------------------------
let cssCache = {}

async function geStyle( user ) {
  if ( ! user ) {
    log.info( '>>>>>>>>>>>> default', cssRoot )
    return { rootCol: cssRoot, tenantCss: { desktop: '', mobile: '', tablet: '' } }
  }
  if ( user ) {
    if ( cssCache[ user.rootScopeId ] ) {
      log.info( '>>>>>>>>>>>> from cssCache' )
      return  { rootCol: cssCache[ user.rootScopeId ].colors, tenantCss: cssCache[ user.rootScopeId ].css } 
    } else {
      let cssCfg = await dta.getDataById( 'scopeCss', user.rootScopeId )
      if ( cssCfg && cssCfg.defaultColors ) {
        let tenantColors = ':root {'
        for ( let colId in cssCfg.defaultColors  ) {
          tenantColors += '\n  --' +colId + ': ' + cssCfg.defaultColors[ colId ] +';'
        }
        tenantColors += '\n}\n'
        cssCache[ user.rootScopeId ] = {
          colors : tenantColors,
          css    : cssCfg.css
        }
        log.info( '>>>>>>>>>>>> from DB' )
        return { rootCol: tenantColors, tenantCss: cssCfg.css }
      } else {
        log.info( '>>>>>>>>>>>> default 2', cssRoot )
        return { rootCol: cssRoot, tenantCss: { desktop: '', mobile: '', tablet: '' } }
      }
    }
  }
}

//-----------------------------------------------------------------------------
async function readStaticCSS() {
  STATIC_CSS_D = fs.readFileSync( __dirname +'/css/custom.css', 'utf8' )
  STATIC_CSS_T = fs.readFileSync( __dirname +'/css/custom-t.css', 'utf8' )
  STATIC_CSS_M = fs.readFileSync( __dirname +'/css/custom-m.css', 'utf8' )
}