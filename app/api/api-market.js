/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const helper     = require( '../helper/helper' )
const axios      = require( 'axios' )
const apiImport  = require( './api-app-import' )

exports: module.exports = { 
  setupAPI
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null
let cfg = null

async function setupAPI( app, appCfg ) {
  cfg = appCfg

  let svc = app.getExpress()
  gui = app

  const guiAuthz = apiSec.userTenantAuthz( gui )

  svc.get( '/market', guiAuthz, getMarketAppList )
  svc.get( '/market/html', guiAuthz, getMarketApp )
  svc.get( '/market/prep-import', guiAuthz, getMarketPrepImport )
  svc.get( '/market/import/html', guiAuthz, getMarketImport )
}

// ============================================================================

async function getMarketAppList( req, res )  { // export
  log.info( 'GET market', req.params.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'user', user )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let appListurl = cfg.MARKETPLACE_URL +'/apps.json'
  let apps = []

  try {
    log.info( 'axios', appListurl )
    let result = await axios.get( appListurl )
    log.info( 'axios', result.status )
    if ( result.status == 200 ) {
      apps = result.data
      for ( let app of apps ) {
        let img = app.img 
        if ( ! img ) {
          img = 'img/k8s-ww-conn.png'
          if ( app.type =='StateModel' ) {
            img = 'img/state-model.png' // TODO
          }
        }
        app.img = '<a href="index.html?layout=MarketApp-nonav&id='+app.id+'">'+
          '<img src="'+encodeURI(img)+'"></a>'
      }
    }
  } catch ( exc ) {
    log.error( 'getAppMarketList', appListurl, exc.message )
    
  }
  res.json( apps )
}

async function getMarketApp( req, res )  { // export
  log.info( 'GET market/html', req.params.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'user', user )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appUrl = cfg.MARKETPLACE_URL +'/'+req.query.id+'.json'

  let html =  ''
  try {
    log.info( 'axios', appUrl )
    let result = await axios.get( appUrl )
    // log.info( 'axios', result.data )
    if ( result.status == 200 ) {
      apps = result.data
      html += '<b>'+ req.query.id +'</b>: <a href="market/prep-import?id='+req.query.id+'">Check import apps and entity models</a>'

      for ( let appId in apps ) {
        let app = apps[ appId ]
        html += '<h2>App: '+ app.title +'</h2>'
        html +=  app.description.replaceAll('\n','<p>')
        for ( let entityId in app.entity ) {
          let entity = app.entity[ entityId ]
          log.debug( 'entity', entity )
          html += '<h3>Entity: '+ ( entity.title ? entity.title+' ('+entityId+')' : entityId ) +'</h3>'
          html += '<ul>'
          for ( let propId in entity.properties ) {
            let prp = entity.properties[ propId ]
            let tp = prp.type
            if ( tp == 'DocMap' ) {
              tp += ' -&gt; '+ prp.docMap
            } else if ( tp == 'SelectRef' ) {
              tp += ' -&gt; '+ prp.selectRef
            } else if ( tp == 'MultiSelectRef' ) {
              tp += ' -&gt; '+ prp.multiSelectRef
            } else 
            html += '<li>'+ propId + ' ('+ tp +')</li>'
          }
          html += '</ul>'
        }
        
      }
      
    }
  } catch ( exc ) {
    log.error( 'getMarketApp', appUrl, exc.message )
    
  }
  res.send( html )
}

let impResult = {}

async function getMarketPrepImport( req, res ) {
  log.info( 'GET market/prep-import', req.query.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'user', user )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appUrl = cfg.MARKETPLACE_URL +'/'+req.query.id+'.json'

  let html =  ''
  try {
    log.info( 'axios', appUrl )
    let result = await axios.get( appUrl )
    // log.info( 'axios', result.data )
    if ( result.status == 200 ) {
      let prepOut = await apiImport.prepJsonUpload( user.rootScopeId, result.data )
      impResult[ user.userId ] = prepOut
    }
  } catch ( exc ) {
    log.error( 'getMarketApp', appUrl, exc.message )
  }
  res.redirect( '../index.html?layout=MarketImport-nonav&id='+req.params.appId )
}

async function getMarketImport( req, res ) {
  log.info( 'GET market/prep-import', req.query.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'user', user )
  let html = impResult[ user.userId ]
  delete impResult[ user.userId ]
  res.send( html )
}
