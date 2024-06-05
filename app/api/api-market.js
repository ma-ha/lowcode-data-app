/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const helper     = require( '../helper/helper' )
const axios      = require( 'axios' )
const appImport  = require( './api-app-import' )
const stateImport= require( './api-models' )

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

  svc.get( '/market', getMarketAppList )
  svc.get( '/market/html', getMarketItemDetails )
  svc.get( '/market/prep-import', getMarketPrepImport )
  svc.get( '/market/import/html', getMarketImport )
  svc.get( '/market/howto/html', getMarketHowTo )
  svc.get( '/market/state-model/diagram', getMarketStateModel )

  setInterval( clearMarketListCache, 60*60*1000 )
}

// ============================================================================

async function getMarketAppList( req, res )  { 
  log.info( 'GET market', req.params.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  // log.info( 'user', user )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  if ( cfg.MARKETPLACE_SERVER ) {
    res.json( await getMarketAppLisFrmDB( req, res ) )
  } else {
    res.json( await getMarketAppListFrmURL( req, res ) )
  }
}


let marketList = null

function clearMarketListCache(){
  marketList = null
}

async function getMarketAppListFrmURL( req, res )  {
  log.info( 'getMarketAppListFrmURL', req.query )
  let marketListURL = cfg.MARKETPLACE_URL +'/market.json'
  let offers = []
  let { showApp, showSM, name, standard } = getFilter( req ) 

  try {
    log.debug( 'axios', marketListURL )
    if ( ! marketList ) {
      let result = await axios.get( marketListURL )
      log.info( 'axios', result.status )
      if ( result.status != 200 ) { 
        log.error( 'axios.get', marketListURL, result.status )
        return offers 
      }
       marketList = result.data
    }
    
    offers = []
    for ( let offer of marketList ) {
      
      if ( name &&  offer.title?.toLowerCase().indexOf( name ) == -1 ) { continue }
      if ( standard ) {
        if ( offer.standard ) {
          if ( offer.standard.toLowerCase().indexOf( standard ) == -1 ) { continue }
        } else {
          continue 
        }
      }
      let img = 'img/k8s-ww-conn.png'
      if ( offer.type =='StateModel' ) {
          if ( ! showSM ) { continue }
          img = 'img/state-model.png'
        } else {
          if ( ! showApp ) { continue }
        }
      // if ( ! offer.img ) {
      //   img = 'img/k8s-ww-conn.png'
      //   if ( offer.type =='StateModel' ) {
      //     if ( ! showSM ) { continue }
      //     img = 'img/state-model.png' // TODO
      //   } else {
      //     if ( ! showApp ) { continue }
      //   }
      // } else {
      //   img = encodeURI( offer.img )
      // }
      if ( offer.type =='StateModel' ) { 
        offer.img = '<a href="index.html?layout=MarketStateModelDetails-nonav&id='+offer.id+'">'+
        '<img src="'+img+'"></a>'
      } else {
        offer.img = '<a href="index.html?layout=MarketAppDetails-nonav&id='+offer.id+'">'+
        '<img src="'+img+'"></a>'
      }
      offers.push( offer )
    }
  
  } catch ( exc ) {
    log.error( 'getAppMarketList', marketListURL, exc.message )
  }
  return offers
}

async function getMarketAppLisFrmDB( req, res )  { 
  let offers = []  
  let { showApp, showSM, name, standard } = getFilter( req ) 

  if ( showApp ) {
    let dbApps = await dta.getAppList( cfg.MARKETPLACE_SCOPE, [], 'marketplace' )
    for ( let appId in dbApps ) {
      let app = dbApps[ appId ]
      let id = appId.split('/')[1]
      if ( name &&  app.title?.toLowerCase().indexOf( name ) == -1 ) { continue }
      if ( standard ) {
        if ( app.standard ) {
          if ( app.standard.toLowerCase().indexOf( standard ) == -1 ) { continue }
        } else {
          continue 
        }
      }
      offers.push({
        id     : id,
        title  : app.title,
        standard  : app.standard,
        license  : app.license,
        author : ( app.by ? app.by : 'NN' ),
        type   : 'App',
        img    : '<a href="index.html?layout=MarketAppDetails-nonav&id=App/'+appId+'">'+ 
                 '<img src="img/k8s-ww-conn.png"></a>'
      })
    }
  }

  if ( showSM ) {
    let dbSM = await dta.getStateModelMap( cfg.MARKETPLACE_SCOPE )
    for ( let smId in dbSM ) {
      let stateModel = dbSM[ smId ]
      let id = smId.split('/')[1]
      if ( name ) { 
        if ( stateModel.title ) {
          if ( stateModel.title.toLowerCase().indexOf( name ) == -1 ) { continue }
        } else if ( id.indexOf( name ) == -1 ) { continue }
      }
      if ( standard ) {
        if ( stateModel.standard ) {
          if ( stateModel.standard.toLowerCase().indexOf( standard ) == -1 ) { continue }
        } else {
          continue 
        }
      }
      offers.push({
        id     : id,
        title  : ( stateModel.title ? stateModel.title : id ),
        author : ( stateModel.by ? stateModel.by : 'NN'),
        type   : 'StateModel',
        img    : '<a href="index.html?layout=MarketStateModelDetails-nonav&id=StateModel/'+smId+'">'+
                 '<img src="img/state-model.png"></a>'
      })
    }
  }

  offers.sort( (a,b) => { if ( a.title < b.title ) { return 1 } else { return -1 }} )

  return offers
}

function getFilter( req ) {
  log.info( 'getFilter', req.query.dataFilter )
  let showApp = true
  let showSM  = true
  let name    = false
  let standard = false
  if ( req.query.dataFilter ) {
    if ( req.query.dataFilter.type == 'App' ) { showSM = false }
    if ( req.query.dataFilter.type == 'StateModel' ) { showApp = false }
    if ( req.query.dataFilter.name != '' ) {
      name = req.query.dataFilter.name.toLowerCase()
    }
    if ( req.query.dataFilter.standard != '*' ) { 
      standard = req.query.dataFilter.standard.toLowerCase()
    }
  }
  return { showApp: showApp, showSM: showSM, name: name, standard:standard }
}

// ============================================================================

async function getMarketItemDetails( req, res )  { 
  log.info( 'GET market/html', req.query.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  // log.info( 'user', user )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( cfg.MARKETPLACE_SERVER ) {
    res.json( await getMarketItemDetailsFromDB( req.query.id ) )
  } else {
    res.send( await getMarketItemDetailsFromURL( req.query.id ) )
  }
}


async function getMarketItemDetailsFromURL( id )  {
  let importUrl = cfg.MARKETPLACE_URL +'/'+id+'.json'

  let html =  ''
  try {
    log.debug( 'axios', importUrl )
    let result = await axios.get( importUrl )
    log.debug( 'axios', result.data )
    if ( result.status == 200 ) {
      if ( result.data.state ) {
        html = await preStateImport( id, result.data )
      } else {
        html = await prepAppImport( id, result.data )
      }  
    }
  } catch ( exc ) {
    log.error( 'getMarketApp', importUrl, exc.message )
    
  }
  return html
}

async function getMarketItemDetailsFromDB( id )  {
  let html =  ''
  if ( id.startsWith( 'App' ) ) {
    let appId = id.substring( 4 )
    let app = await dta.getAppById( appId )
    html = await prepAppImport( id, { appId: app } )
  } else if ( id.startsWith( 'StateModel' ) ) {
    let smId = id.substring( 11 )
    let sm = await dta.getStateModelById( smId )
    html = await preStateImport( id, sm )
  }

  return html
}

async function getMarketStateModel( req, res )  {
  log.info( 'getMarketStateModel', req.query.id )
  if ( ! cfg.MARKETPLACE_SERVER ) {
    try {
      log.debug( 'axios', cfg.MARKETPLACE_URL +'/'+req.query.id+'.json' )
      let result = await axios.get( cfg.MARKETPLACE_URL +'/'+req.query.id+'.json' )
      log.debug( 'axios', result.data )
      if ( result.status == 200 ) {
        // if ( result.data.state ) {
          return await stateImport.getStateModel( req, res, result.data )
        // }
      }
    } catch ( exc ) {
      log.warn( 'getMarketStateModel', cfg.MARKETPLACE_URL +'/'+req.query.id+'.json', exc.message ) 
    }
    res.send({})
  } else {
    await stateImport.getStateModel( req, res )
  }
}

// ============================================================================

async function prepAppImport( id, apps ) {
  let html = ''
  try {
    for ( let appId in apps ) {
      let app = apps[ appId ]
      html += '<h2>App: '+ ( app.standard ? app.standard + ' ' : '' ) + app.title +'</h2>'
      html += 'License: '+ ( app.license ? app.license : 'unknown' ) + '<br>'
      html +=  app.description.replaceAll('\n','<p>')
      html += '<p><b>'+ id +'</b>: <a href="market/prep-import?id='+id+'">Check import apps and entity models</a>'
      for ( let entityId in app.entity ) {
        let entity = app.entity[ entityId ]
        log.debug( 'entity', entity )
        html += '<h3>Entity: '+ ( entity.title ? entity.title+' ('+entityId+')' : entityId ) +'</h3>'
        if ( entity.stateModel ) {
          html += 'State Model: '+ entity.stateModel
          let sm = await dta.getStateModelById( entity.stateModel )
          if ( ! sm ) {
            html += '<span class="error"> Warning: Not present! Import or create model first!</span>'
          }
          html += '<br>'
        }

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
  } catch (exc) {
    log.error( '', exc.message )
    html = exc.message
  }
  return html
}


async function preStateImport( id, state ) {
  let html = ''
  try {
    let sm = await dta.getStateModelById( id )
    if ( sm ) {
      html += '<span class="error"> Error: State model ='+id+' exists!</span>'
    } else {
      html += '<b>'+ id +'</b>: <a href="market/prep-import?id='+id+'">Check import state models</a>'
      if (  state.description ) {
        html += '<h2>'+ ( state.title ? state.title : id ) +'</h2>'
        html += state.description
      }
     

    }
  } catch (exc) {
    html = exc.message
  }
  return html
}


let impResult = {}

async function getMarketPrepImport( req, res ) {
  log.info( 'GET market/prep-import', req.query.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  // log.info( 'user', user )
  if ( ! user ) { return res.status(401).send( 'login required' ) }


  if ( cfg.MARKETPLACE_SERVER ) {

    let id = req.query.id
    if ( id.startsWith( 'App' ) ) {

      let appId = id.substring( 4 )
      let app = await dta.getAppById( appId )
      let apps = {}
      let idp = appId.split('/')
      apps[ idp[1]+'/'+idp[2] ] = app
      let prepOut = await appImport.prepJsonUpload( user.rootScopeId, apps )
      impResult[ user.userId ] = prepOut

    } else if ( id.startsWith( 'StateModel' ) ) {

      let smId = id.substring( 11 )
      let sm = await dta.getStateModelById( smId )
      let prepOut = await stateImport.prepJsonStateUpload( user.rootScopeId, smId, sm )
      impResult[ user.userId ] = prepOut

    }

  } else {

    let appUrl = cfg.MARKETPLACE_URL +'/'+req.query.id+'.json'
    try {
      log.debug( 'axios', appUrl )
      let result = await axios.get( appUrl )
      // log.info( 'axios', result.data )
      if ( result.status == 200 ) {
        if ( result.data.state ) {
          let prepOut = await stateImport.prepJsonStateUpload( user.rootScopeId, req.query.id, result.data )
          impResult[ user.userId ] = prepOut
        } else {
          let prepOut = await appImport.prepJsonUpload( user.rootScopeId, result.data )
          impResult[ user.userId ] = prepOut
        }
      }
    } catch ( exc ) {
      log.error( 'getMarketApp', appUrl, exc.message )
    }
  }

  res.redirect( '../index.html?layout=MarketImport-nonav&id='+req.params.appId )
}

async function getMarketImport( req, res ) {
  log.info( 'GET market/prep-import', req.query.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  let html = impResult[ user.userId ]
  delete impResult[ user.userId ]
  res.send( html )
}

async function getMarketHowTo( req, res ) {
  if ( cfg.MARKETPLACE_HOWTO_CONTRIBUTE ) {
    res.send( cfg.MARKETPLACE_HOWTO_CONTRIBUTE )
  } else {
    res.send( 'No contributions!' )
  }
}
