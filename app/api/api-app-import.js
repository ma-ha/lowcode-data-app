/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const helper     = require( '../helper/helper' )
const fileupload = require( 'express-fileupload' )

exports: module.exports = { 
  setupAPI,
  prepJsonUpload
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

  svc.post( '/app/swagger', fileupload(),guiAuthz, uploadAppSwagger )
  svc.get(  '/app/swagger/html', guiAuthz, getUploadSwaggerResult )
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
  delete appCopy.id
  delete appCopy.scopeId
  delete appCopy.enabled

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
let uploadResult = {}

async function uploadAppJSON( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'POST /app/json', user  ) // , req.files.file.data
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.files || Object.keys( req.files ).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  try {
    let newApps = JSON.parse( '' + req.files.file.data )
    let result = await prepJsonUpload( user.rootScopeId, newApps )
    uploadResult[ user.userId ] = result

    // let dbApps = await  dta.getAppList( user.scopeId, [], 'admin' )

    // let dbEntityMap = {}
    // for ( let appId in dbApps ) {
    //   for ( let entityId in dbApps[ appId ].entity ) {
    //     dbEntityMap[ entityId ] = { appId: appId }
    //   }
    // }

    // uploadResult = 'Parsed successfully'
    // uploadOK     = true
    // for ( let appId in newApps ) {
    //   if ( dbApps[ user.rootScopeId +'/'+ appId ] ) {
    //     uploadResult += '<p> ERROR, ALREADY EXISTS: App ID <b>' + appId + '</b>'
    //     uploadOK = false
    //     continue 
    //   } 
    //   let app = newApps[ appId ]
    //   uploadResult += '<p> App ID: <b>' + appId  + '</b>'
    //   for ( let requireAppId of app.require ) {
    //     if ( dbApps[ user.rootScopeId +'/'+ requireAppId ] ) {
    //       uploadResult += '<br> Dependency: ' +  user.rootScopeId +'/'+ requireAppId + ' ... already available'
    //     } else  if ( newApps[ requireAppId ] ) {
    //       uploadResult += '<br> Dependency uploaded: ' + requireAppId 
    //     } else {
    //       uploadResult += '<br> ERROR: Dependency: NOT FOUND'
    //       uploadOK = false
    //     }
    //   }

    //   for ( let entityId in app.entity ) {
    //     if ( dbEntityMap[ entityId ] ) {
    //       uploadResult += '<br> WARNING: Entity "'+entityId+'" already exists (in '+dbEntityMap[ entityId ].appId+')'
    //     }
    //   }
    // }

    // if ( uploadOK ) {
    //   for ( let appId in newApps ) {
    //     let importId = helper.uuidv4()
    //     let appImp = {
    //       apps    : newApps,
    //       _expire : Date.now() + 1000*60*60*24
    //     }
    //     await dta.addDataObjNoEvent( 'app-temp', importId, appImp )
    //     uploadResult += '<p> Click to <a href="app/import/'+importId+'">IMPORT</a>'
    //   }
    // } else {
    //   uploadResult += '<p> <b> UPLOAD FAILED! </b>'
    // }
   
  } catch ( exc ) {  
    log.warn( 'uploadAppJSON', exc )
    return res.status(400).send( 'Error' )
  }
  res.send( 'OK' )
}


async function prepJsonUpload( rootScopeId, newApps ) {
  let result = ''
  try {
    let dbApps = await  dta.getAppList( rootScopeId, [], 'admin' )

    let dbEntityMap = {}
    for ( let appId in dbApps ) {
      for ( let entityId in dbApps[ appId ].entity ) {
        dbEntityMap[ entityId ] = { appId: appId }
      }
    }

    result = 'Parsed successfully'
    uploadOK     = true
    for ( let appId in newApps ) {
      if ( dbApps[ rootScopeId +'/'+ appId ] ) {
        result += '<p> ERROR, ALREADY EXISTS: App ID <b>' + appId + '</b>'
        uploadOK = false
        continue 
      } 
      let app = newApps[ appId ]
      result += '<p> App ID: <b>' + appId  + '</b>'
      for ( let requireAppId of app.require ) {
        if ( dbApps[ rootScopeId +'/'+ requireAppId ] ) {
          result += '<br> Dependency: ' +  rootScopeId +'/'+ requireAppId + ' ... already available'
        } else  if ( newApps[ requireAppId ] ) {
          result += '<br> Dependency uploaded: ' + requireAppId 
        } else {
          result += '<br> ERROR: Dependency: NOT FOUND'
          uploadOK = false
        }
      }

      for ( let entityId in app.entity ) {
        if ( dbEntityMap[ entityId ] ) {
          result += '<br> WARNING: Entity "'+entityId+'" already exists (in '+dbEntityMap[ entityId ].appId+')'
        }
        for ( let propId in app.entity[ entityId ].properties ) {
          let prop = app.entity[ entityId ].properties[ propId ]
          switch ( prop.type ) {
            case 'DocMap':
              prop.docMap = rootScopeId +'/'+ prop.docMap
              break
            case 'SelectRef':
              prop.selectRef = rootScopeId +'/'+ prop.selectRef
              break
            case 'MultiSelectRef':
              prop.multiSelectRef = rootScopeId +'/'+ prop.multiSelectRef
              break
            default: break
          }
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
        result += '<p> Click to <a href="app/import/'+importId+'">IMPORT</a>'
      }
    } else {
      result += '<p> <b> UPLOAD FAILED! </b>'
    }
   
  } catch ( exc ) {  
    log.warn( 'uploadAppJSON', exc )
    return res.status(400).send( 'Error' )
  }
  // log.info( 'result', result )
  return result
}


async function getUploadAppResult( req, res ) {
  log.info( 'GET /app/json/html'  ) // , req.files.file.data
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  res.send( uploadResult[ user.userId ] )
  delete uploadResult[ user.userId ]
}


async function importApp( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'GET /app/import', req.params.uid  ) 
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.params.uid ) { return res.status(400).send( 'id required' ) }

  let impDta = await dta.getDataById( 'app-temp', req.params.uid ) 
  if ( ! impDta ) { return res.status(400).send( 'not found' ) }

  if ( impDta.appId && impDta.entity ) { // swagger

    let app = await dta.getAppById( impDta.appId )
    for ( let entityId in impDta.entity ) {
      app.entity[ entityId ] = impDta.entity[ entityId ]
    }
    await dta.addApp( impDta.appId, app )


  } else {

    for ( let appId in impDta.apps ) {
      log.info( 'GET /app/import IMPORT >>', appId  ) 
      await dta.addApp( user.rootScopeId +'/'+ appId, impDta.apps[ appId] )
    }

  }

  await dta.delDataObjNoEvent( 'app-temp', req.params.uid )

  res.redirect( '../../index.html?layout=Customize' ) 
}

// ----------------------------------------------------------------------------

async function uploadAppSwagger( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'POST /app/swagger', req.body  ) // , req.files.file.data
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.files || Object.keys( req.files ).length === 0) {
    return res.status(400).send( 'No files were uploaded.' )
  }
  if ( ! req.body.appId.startsWith( user.rootScopeId )) { 
    return res.status(400).send( 'App Id Not allowed' )
  }
  let app = await dta.getAppById( req.body.appId )
  if ( ! app ) { return res.status(400).send( 'App Id not valid' ) }

  try {
    let result = await prepSwaggerUpload( req.body.appId, req.body.prefix, '' + req.files.file.data )
    uploadResult[ user.userId + 'swagger' ] = result

  } catch ( exc ) {  
    log.warn( 'uploadAppSwagger', exc )
    return res.status(400).send( 'Error' )
  }
  res.send( 'OK' )
}


async function prepSwaggerUpload( appId, prefix, swaggerFile ) {
  let htmlOut = '<h2>'+appId+'</h2>'
  try {
    let swagger = JSON.parse( swaggerFile )
    let app = await dta.getAppById( appId )
    // log.info( 'swagger',swagger )
    htmlOut += '<h3>Entities</h3>'
    let d = swagger.definitions
    let entity = {}
    for ( let defId in d ) {
      let sE = d[ defId ]
      if ( sE.type != 'object' ) {
        htmlOut += '<b>skipping</b>'  + sE.type + ': ' 
        continue
      }
      htmlOut += prefix + defId
      if ( app.entity[  prefix + defId ] ) {
        htmlOut += ' <b>WARNING: Overwriting existing!!</b>' 
      }
      htmlOut += '<br>'
      let title = defId.replace( /([A-Z])/g, ' $1' )
      title = title.charAt(0).toUpperCase() + title.slice( 1 )
      let nE = {
        title : title,
        scope : 'inherit',
        maintainer: [ "appUser" ],
        properties: { },
        description : sE.description,
        colWidth: "M"
      }
      entity[ prefix + defId ] = nE
      for ( let pId in sE.properties ) {
        let sP = sE.properties[ pId ]
        let label = pId.replace( /([A-Z])/g, ' $1' )
        label = label.charAt(0).toUpperCase() + label.slice( 1 )
        let prp = {
          type : 'String',
          label : label,
          description : sP.description
        }
        if ( sE.required?.includes( pId ) ) {
          prp.notNull = true
        }
        if ( pId.startsWith('@') ) {
          prp.type = 'API static string'
          prp.apiString = ''
          prp.noTable = true

        } else if ( sP.type == 'string' && sP.enum ) {
          prp.type = 'Select'
          prp.options = sP.enum
        } else if ( sP.type == 'boolean' ) {
          prp.type = 'Boolean'
        } else if ( sP.type == 'array' ) {
          prp.type = 'MultiSelectRef'
          let refX =  sP.items[ '$ref' ].split('/')
          let ref = refX[ refX.length -1 ]
          prp.multiSelectRef = appId + '/' +prefix + ref
          prp.noTable = true
        } else if ( sP[ '$ref' ] ) {
          let refX =  sP[ '$ref' ].split('/')
          let ref = refX[ refX.length -1 ]
          if ( d[ ref ]?.type == 'string' ) {
            if ( d[ ref ].enum ) {
              prp.type = 'Select'
              prp.options =  d[ ref ].enum
            }
          } else {
            prp.type = 'SelectRef'
            prp.selectRef = appId + '/' +prefix + ref  
          }
        }
        if ( pId == 'name' ) {
          prp.refLbl = true
        }
        nE.properties[ pId ] = prp
      }
      if ( ! nE.properties.id ) {
        nE.properties.id = {
          type     : "UUID",
          noDelete : true,
          noEdit   : true,
          noTable  : true
        }
      } else {
        nE.properties.id.type = "UUID"
        nE.properties.id.noEdit = true
        nE.properties.id.description = 'TODO type changed\n' +  nE.properties.id.description
      }
    }
    // htmlOut += '<h3>App JSON</h3>'
    // let appE = JSON.stringify( entity, null, '  ' )
    // htmlOut += appE.replaceAll( '  ', '&nbsp;&nbsp' ).replaceAll( '\n', '<br>' )
    
    log.info( 'swagger', entity )
    
    let importId = helper.uuidv4()
    let appImp = {
      appId   : appId,
      entity  : entity,
      _expire : Date.now() + 1000*60*60*24
    }
    await dta.addDataObjNoEvent( 'app-temp', importId, appImp )
    htmlOut += '<p> Click to <a href="app/import/'+importId+'">IMPORT</a>'

  } catch ( exc ) {
    log.warn( 'prepSwaggerUpload', exc )
    htmlOut += '<span class="error">'+exc.message+'</span>'
  }
  return htmlOut
}


async function getUploadSwaggerResult( req, res ) {
  log.info( 'GET /app/swagger/html'  ) // , req.files.file.data
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  res.send( uploadResult[ user.userId + 'swagger' ] )
  delete uploadResult[ user.userId + 'swagger']
}