/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const helper     = require( '../helper/helper' )
const fileupload = require( 'express-fileupload' )

exports: module.exports = { 
  setupAPI
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null

async function setupAPI( app ) {
  let svc = app.getExpress()
  gui = app

  const guiAuthz = apiSec.userTenantAuthz( gui )

  svc.get(  '/app/json/:scope/:id', guiAuthz, getAppJSON ) // export
  svc.post( '/app/json', fileupload(),guiAuthz, uploadAppJSON )
  svc.get(  '/app/json/html', guiAuthz, getUploadAppResult )
  svc.get(  '/app/import/:uid', guiAuthz, importApp )
}

// ============================================================================

async function getAppJSON( req, res )  { // export
  log.info( 'GET app/json', req.params.id )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.params.scope ) { return res.status(400).send( 'scope required' ) }
  if ( ! req.params.id ) { return res.status(400).send( 'id required' ) }

  let appId = req.params.id.replaceAll( '_', '/' )
  let app = await dta.getAppById( req.params.scope +'/'+ appId )

  if ( ! app ) { return res.status(400).send( 'for found' ) }

  let appCopy = JSON.parse( JSON.stringify( app ) )
  appCopy.require = []
  for ( let entityId in appCopy.entity ) {
    let entity = appCopy.entity[ entityId ]
    for ( propId in entity.properties ) {
      let prop = entity.properties[ propId ]
      switch ( prop.type ) {
        case 'DocMap' : 
          prop.docMap = stripScopeFrmId( prop.docMap )
          addRefApp( appCopy.require, prop.docMap )
          break
        case 'SelectRef' : 
          prop.selectRef = stripScopeFrmId( prop.selectRef )
          addRefApp( appCopy.require, prop.selectRef )
          break
        case 'MultiSelectRef' : 
          prop.multiSelectRef = stripScopeFrmId( prop.multiSelectRef )
          addRefApp( appCopy.require, prop.multiSelectRef )
          break
        default: break
      }
    }
  }

  let exportApp = {}
  exportApp[ appId ] = appCopy
  res.json( exportApp )
}

function stripScopeFrmId( refId ) { 
  return refId.substring( refId.indexOf('/') +1 )
}
function addRefApp( requireArr, refId ) { 
  let appId = refId.substring( 0, refId.lastIndexOf('/') )
  if ( requireArr.indexOf( appId ) == -1 ) { 
    requireArr.push( appId )
  }
}

// ============================================================================
let uploadResult = '... '

async function uploadAppJSON( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'POST /app/json', user  ) // , req.files.file.data
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.files || Object.keys( req.files ).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  try {
    let newApps = JSON.parse( '' + req.files.file.data )
    let dbApps = await  dta.getAppList( user.scopeId, [], 'admin' )

    let dbEntityMap = {}
    for ( let appId in dbApps ) {
      for ( let entityId in dbApps[ appId ].entity ) {
        dbEntityMap[ entityId ] = { appId: appId }
      }
    }

    uploadResult = 'Parsed successfully'
    uploadOK     = true
    for ( let appId in newApps ) {
      if ( dbApps[ user.rootScopeId +'/'+ appId ] ) {
        uploadResult += '<p> ERROR, ALREADY EXISTS: App ID <b>' + appId + '</b>'
        uploadOK = false
        continue 
      } 
      let app = newApps[ appId ]
      uploadResult += '<p> App ID: <b>' + appId  + '</b>'
      for ( let requireAppId of app.require ) {
        if ( dbApps[ user.rootScopeId +'/'+ requireAppId ] ) {
          uploadResult += '<br> Dependency: ' +  user.rootScopeId +'/'+ requireAppId + ' ... already available'
        } else  if ( newApps[ requireAppId ] ) {
          uploadResult += '<br> Dependency uploaded: ' + requireAppId 
        } else {
          uploadResult += '<br> ERROR: Dependency: NOT FOUND'
          uploadOK = false
        }
      }

      for ( let entityId in app.entity ) {
        if ( dbEntityMap[ entityId ] ) {
          uploadResult += '<br> WARNING: Entity "'+entityId+'" already exists (in '+dbEntityMap[ entityId ].appId+')'
        }
      }
    }

    if ( uploadOK ) {
      for ( let appId in newApps ) {
        let importId = helper.uuidv4()
        let appImp = {
          apps    : newApps,
          _expire : Date.now() + 1000*60*60*24
        }
        await dta.addDataObjNoEvent( 'app-temp', importId, appImp )
        uploadResult += '<p> Click to <a href="app/import/'+importId+'">IMPORT</a>'
      }
    } else {
      uploadResult += '<p> <b> UPLOAD FAILED! </b>'
    }
   
  } catch ( exc ) {  
    log.warn( 'uploadAppJSON', exc )
    return res.status(400).send( 'Error' )
  }
  res.send( 'OK' )
}


async function getUploadAppResult( req, res ) {
  log.info( 'GET /app/json/html'  ) // , req.files.file.data
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  res.send( uploadResult )
  uploadResult = '... '
}


async function importApp( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'GET /app/import', req.params.uid  ) 
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.params.uid ) { return res.status(400).send( 'id required' ) }

  let impDta = await dta.getDataById( 'app-temp', req.params.uid ) 
  if ( ! impDta ) { return res.status(400).send( 'not found' ) }

  for ( let appId in impDta.apps ) {
    log.info( 'GET /app/import IMPORT >>', appId  ) 
    await dta.addApp( user.rootScopeId +'/'+ appId, impDta.apps[ appId] )
  }
  await dta.delDataObjNoEvent( 'app-temp', req.params.uid )

  res.redirect( '../../index.html?layout=Customize' ) 
}