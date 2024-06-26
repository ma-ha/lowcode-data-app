/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const bodyParser = require( 'body-parser' )
const helper     = require( '../helper/helper' )
const propHandler = require( '../data/propertyHandler' )
const { appRoot } = require( 'easy-web-app' )
const fileupload = require( 'express-fileupload' )

exports: module.exports = { 
  setupAPI  
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null
let cfg = {}

async function setupAPI( app, config ) {
  log.info( 'Starting API...' )
  cfg = config
  
  let svc = app.getExpress()
  gui = app

  svc.use( bodyParser.urlencoded({  limit: "20mb", extended: false }) )
  svc.use( bodyParser.json({ limit: "20mb" }) )

  //const myJWTcheck = apiSec.initJWTcheck()
  const guiAuthz = apiSec.userTenantAuthz( gui )
 
  // --------------------------------------------------------------------------
  svc.get( '/setscope',  guiAuthz,  setScope )
  svc.get( '/gui/tenant/app/icons', guiAuthz, getAppIcons )
  svc.get( '/app/:tenantId/:appId/:appVersion/:view', guiAuthz, getAppView )

  svc.get(  '/guiapp/:tenantId/entity', guiAuthz, getEntitiesOfTenant )

  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity', guiAuthz, getDocArr )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, getDoc )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity-filtered/:entityId/:filter', guiAuthz, getDoc )
  svc.post( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, addDoc )
  svc.post( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/:recId/:actionId', guiAuthz, docStateChange )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/:recId/:event', guiAuthz, docEvent )
  svc.delete( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, delDoc )

  svc.post( '/guiapp/csv/:tenantId/:appId/:appVersion/:entityId', fileupload(),guiAuthz, uploadCsvData )
  svc.post( '/guiapp/csv/:tenantId/:appId/:appVersion/:entityId/:actionId', fileupload(),guiAuthz, uploadCsvData )
  svc.get(  '/guiapp/csv/html', guiAuthz, getUploadCsvResult )
  svc.get(  '/guiapp/csv/import/:uid', guiAuthz, importCsvData )

  svc.get(  '/dashboard/panel', guiAuthz, getDashboardPanels )

}

// --------------------------------------------------------------------------

async function setScope ( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( req.query.id && user ) { 
    log.debug( 'SET SCOPE', user.userId, req.query.id )
    let scopeTbl = await userDta.getScopeList( user.userId )
    if ( scopeTbl[ req.query.id+'' ] ) {
      await userDta.setSelScope( user.userId, req.query.id+'' )
    }
  } else {
    log.info( 'ERR: SET SCOPE', user.userId, req.query.id )
  }
  log.info( 'set scope', req.query )
  let layout = req.query.layout 
  let app = ''
  if ( ! layout ) { 
    layout = 'Apps'
  } else if ( layout == 'AppEntity-nonav' ) {
    let user = await userDta.getUserInfoFromReq( gui, req )
    let appMap = await dta.getAppList( user.scopeId, user.scopeTags )
    // log.info( '>>>>>>>>>>>>>', req.query.app, appMap )
    if ( appMap[ req.query.app ] ) {
      app = ( req.query.app ? '&id='+req.query.app : '' ) 
    } else {
      layout = 'Apps'
    }

  }
  res.redirect( 'index.html?layout='+layout + app ) 
}


async function getAppIcons( req, res ) {
  // log.info( 'GET apps', req.user )
  let appMap = await dta.getAppList( req.user.scopeId, req.user.scopeTags )
  let icons = []
  for ( let appId in appMap ) {
    let app = appMap[ appId ]
    if ( app.role == [] ) { continue }
    if ( ! app.enabled ) { continue }
    icons.push({
      id     : appId,
      layout : 'AppEntity-nonav&id=' + appId,
      label  : app.title,
      img    : ( app.img ? app.img : 'img/k8s-ww-conn.png' )
    })
  }
  // log.info( 'GET apps', appArr )
  res.send({ icons: icons, update: "60" } )
}


async function getAppView( req, res ) {
  // log.info( 'GET apps', req.user )
  let appArr = await dta.getAppList( req.user.scopeId, req.user.scopeTags )
  // log.info( 'GET apps', appArr )
  res.send( appArr )
}


async function getDocArr( req, res ) {
  log.debug( 'GET entities', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )

  // let data = await dta.getDocById(  req.params.entityId, user.scopeId )
  // log.info( 'GET entity data', data )
  if ( ! app ) { log.warn('GET entity: app not found'); return res.status(400).send([]) }
  let entityArr = []
  for ( let entityId in app.entity ) {
    let entity = app.entity[ entityId ]
    entityArr.push({
      id : entityId,
      title : entity.title,
      scope : entity.scope,
      maintainer : entity.maintainer.join(),
      properties :'<a href="index.html?layout=AppEntityProperty-nonav&id='+appId+','+entityId+'">Manage</a>'
    })
  }
  res.send( entityArr )
}


async function getDoc( req, res ) {
  log.debug( 'GET entity', req.params, req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { log.warn('GET data: app not found'); return res.status(400).send([]) }
  if ( ! app.entity[ req.params.entityId ] ) { log.warn('GET data: app entity not found'); return res.status(400).send([]) }
  let entity = app.entity[ req.params.entityId ]

  if ( req.query.recId ) { // single doc by id
    log.debug( 'GET entity q/id', req.query.recId )

    if ( req.query._recId == '_empty' ) {
      return res.send( propHandler.genEmptyDataReturn( entity ) )
    }

    let doc = await dta.getDataObjX( 
      user.rootScopeId,  
      req.params.appId, 
      req.params.appVersion,
      req.params.entityId,
      user.scopeId, 
      req.query.recId
    )
    log.debug( 'GET entity doc', doc )
    let result = JSON.parse( JSON.stringify( doc ) )
    propHandler.reformatDataReturn( entity, result )

    result.recId =  req.query.recId
    log.debug( 'GET entity q/id', result )
    return  res.send( result )
  }

  // else doc array
  let filter = extractFilter( req.query.dataFilter )
  if ( req.params.filter ) {
    if ( ! filter ) { filter = {} }
    let f = req.params.filter.split('=')
    filter[ f[0] ] = f[1]
  }
  log.debug( 'filter', filter )

  let dataArr = await dta.getDataObjX( user.rootScopeId,  req.params.appId, req.params.appVersion, req.params.entityId, user.scopeId, null, filter )
  let stateModel = null
  if ( entity.stateModel ) {
    stateModel = await dta.getStateModelById( user.rootScopeId +'/'+ entity.stateModel )
  }
  log.debug( 'dataArr', dataArr )

  let result = []
  for ( let rec of dataArr ) {
    let p =  req.params 
    let url =  'guiapp/'+p.tenantId+'/'+p.appId+'/'+p.appVersion+'/entity/'+p.entityId+'/'+rec.id
    result.push( await propHandler.reformatDataTableReturn( entity, rec, url, stateModel )  )
  }
  // log.info( 'GET entity data', result )
  res.send( result )
}


async function addDoc( req, res )  {
  log.info( 'Add entity', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId, req.body.id  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { return res.send( 'ERROR: App not found') }
  let entity = app.entity[ req.params.entityId ]
  if ( ! entity ) { return res.send( 'ERROR: Entity not found') }

  let dtaColl = user.rootScopeId + req.params.entityId
  
  // let existRec = await dta.idExists( dtaColl, req.body.id )  
  // if ( existRec && existRec.scopeId != user.scopeId ) {
  //   return  res.send( 'ID '+  req.body.id +' already used in scope'+  existRec.scopeId )
  // }
  let rec = req.body
  log.debug( 'Add entity', rec )
  
  let parse = propHandler.reformatDataUpdateInput( entity, rec )
  if ( parse.err ) {
    return res.status(400).send( parse.err )
  }
  
  // complete data set with property data from DB
  let dbRec = await  dta.getDataById( dtaColl, rec.id ) 
  if ( dbRec ) {
    for ( let propId in dbRec ) {
      if ( ! rec[ propId ] || ( entity.properties[ propId ] && entity.properties[ propId ].apiManaged ) ) {
        if ( entity.properties[ propId ] && entity.properties[ propId ].type == 'Boolean' ) {
          if ( rec[ propId ] === false ) {
          } else {
            rec[ propId ] = dbRec[ propId ]
          }
        } else {
          rec[ propId ] = dbRec[ propId ]
        }
      }
    }
  } else {
    if ( entity.stateModel && ! rec[ '_state' ]  ) {
      return res.send( 'ERROR: Create not allowed' ) 
    }
  }
  if ( ! rec.scopeId ) {
    rec.scopeId = user.scopeId
  }

  for ( let propId in entity.properties ) {
    // check not null required
    if ( entity.properties[ propId ].notNull ) {
      if ( ! rec[ propId ] || rec[ propId ].trim() == '' ) {
        return res.status(401).send( propId + ' required' ) 
      }
    }
  }
  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'+rec.id
  let result = await dta.addDataObj( dtaColl, rec.id, rec, uri, null, entity )
  // TODO check entity
  res.send( 'OK' )
}


async function docStateChange( req, res ) {
  log.info( 'Add entity', req.params.tenantId, req.params.entityId, req.params.actionId, req.body.id  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { return res.send( 'ERROR: App not found') }
  let entity = app.entity[ req.params.entityId ]
  if ( ! entity ) { return res.send( 'ERROR: Entity not found') }

  let rec = req.body
  let parse = propHandler.reformatDataUpdateInput( entity, rec )
  if ( parse.err ) {
    return res.status(400).send( parse.err )
  }
  // TODO: check condition OK: entity.stateTransition

  let dtaColl = user.rootScopeId + req.params.entityId
  let dbRec = await  dta.getDataById( dtaColl, rec.id ) 
  if ( ! dbRec ) { return res.send( 'ERROR: Data not found') }
  for ( let propId in dbRec ) { // don't "forget" hidden properties
    if ( ! rec[ propId ] ) {
      rec[ propId ] = dbRec[ propId ]
    }
  }

  let rp = req.params
  let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'+rec.id
  await dta.addDataObj( dtaColl, rec.id, rec, uri, 'dta.stateUpdate', entity )

  let appIdX = appId.replaceAll('-','').replaceAll('.','').replaceAll('/','')

  let tabSel = '&Tabs'+ appIdX +'=Tab'+ req.params.entityId
  let id = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  res.send( 'index.html?layout=AppEntity-nonav&id=' + id + tabSel )
}

async function delDoc( req, res )  {
  log.info( 'Del entity', req.params, req.query  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.query.recId ) { return res.send( 'ERROR: id required') }
  
  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { return res.send( 'ERROR: App not found') }
  let entity = app.entity[ req.params.entityId ]

  let dtaColl = user.rootScopeId + req.params.entityId
  let result = await dta.delDataObj( dtaColl, req.query.recId, entity )
  res.send( result )
}


async function getEntitiesOfTenant( req, res ) {
  let app = await dta.getApp( req.params.tenantId )
  let entityTbl = []
  for ( let entityId in app.entity ) {
    let id = req.params.tenantId +'/'+ entityId
    entityTbl.push({
      id    : id,
      title : app.entity[ entityId ].title,
      scope : app.entity[ entityId ].scope,
      maintainer : app.entity[ entityId ].maintainer.join()
    })
  }
  res.send( entityTbl )
}


async function docEvent( req, res )  {
  log.info( 'Entity Event', req.params, req.query  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let p = req.params

  let rec = await dta.getDataObjX( user.rootScopeId, p.appId, p.appVersion, p.entityId, user.scopeId, p.recId )
  if ( rec ) {
    if ( ! rec.eventArr ) { rec.eventArr = [] }
    if ( rec.eventArr.indexOf( p.event ) == -1 ) {
      rec.eventArr.push( p.event )
      let rp = req.params
      let uri = '/adapter/entity/'+rp.scopeId+'/'+rp.appId+'/'+rp.appVersion+'/'+rp.entityId+'/'+rec.id
      await dta.addDataObj( user.rootScopeId+p.entityId,  p.recId, rec, uri )
    } 
  }
  res.redirect( '../../../../../../../index.html?layout=AppEntity-nonav&id='+p.tenantId+'/'+p.appId+'/'+p.appVersion )
}


function extractFilter( filterQuery ){
  let filter = null
  if ( filterQuery ) {
    for (  let fp in filterQuery ) { try {
      let query = filterQuery[ fp ].replaceAll( '%20', ' ' ).trim()
      if ( query != '' ) {
        if ( ! filter ) { filter = {} }
        filter[ fp ] = query
      }
    } catch ( exc ) { log.warn( 'extractFilter', exc ) }}
  }
  return filter
}

// ============================================================================
let uploadCsvResult = {}

async function uploadCsvData( req, res ) {
  log.info( 'uploadCsvData',  req.params )
  try {
    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( ! user ) { return res.status(401).send( 'login required' ) }
    if ( ! req.files || Object.keys( req.files ).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
    let app = await dta.getAppById( appId )
    if ( ! app ) { return res.send( 'ERROR: App not found') }
    let entityId = req.params.entityId
    let entity = app.entity[ entityId ]
    if ( ! entity ) { return res.send( 'ERROR: Entity not found') }
    let actionId = ( req.params.actionId ? req.params.actionId : null ) 
    let toState = null
    if ( entity.stateModel ) {
      let stateModel = await dta.getStateModelById( user.rootScopeId +'/'+ entity.stateModel )
      if ( ! stateModel ) { return res.send( 'ERROR: StateModel not found') }
      if ( ! actionId ){ return res.send( 'ERROR: Action required') }
      toState = stateModel.state['null'].actions[ actionId ]
      if ( ! toState ){ return res.send( 'ERROR: Action not valid') }
    }
    let indexKey = propHandler.getIndex( entity )


    let separator = ( req.body.separator ? req.body.separator : ';' )
    log.info( 'uploadCsvData separator', separator )

    let html = 'App Id: '+ appId
    html += '<br>Entity Id: '+ entityId
    if ( actionId ) { html += '<br>Action Id: '+ actionId }
    let recs = []
    let csvRow = ( '' + req.files.file.data ).split('\n')
    if ( csvRow.length < 2 ) { return res.send( 'ERROR: CSV contains no data') }
    let hr = csvRow[ 0 ].split( separator ) // should be headline with field names
    csvRow.shift()

    // check upload data
    let uploadOK = true
    if ( actionId ) { // State "Create"
      for ( let propId in entity.properties ) {
        let prop = entity.properties[ propId ]
        if ( prop.stateTransition && prop.stateTransition[ 'null_'+ actionId ] ) { // required field
          if ( ! hr.includes( propId ) ) {
            uploadOK = false
            html += '<p>ERROR: Column "'+propId+'" required for "'+actionId+'"!' 
          }
        } else if ( hr.includes( propId ) ) { // not allowed field
          uploadOK = false
          html += '<p>ERROR: Column "'+propId+'" not allowed for "'+actionId+'"!' 
        }
      }
    } else { // normal data w/o state
      for ( let propId in entity.properties ) {
        if ( ! hr.includes( propId ) ) {
          uploadOK = false
          html += '<p>ERROR: Column "'+propId+'" required!' 
        }
      }  
    }
    for ( let r of csvRow ) {
      let v = r.split( separator )
      if ( v.length != hr.length ) {
        uploadOK = false
        html += '<p>ERROR: Row does not mach to values:' 
        html += '<br>' + r
      }
    }

    if ( uploadOK ) {
      // parse data
      html += '<table class="csvTable"><tr>' 
      if ( toState ) {
        html += '<th>State</th>'
      }
      for (let c of hr ) {
        html += '<th>'+ c + '</th>'
      }
      html += '<th></th></tr>'

      for ( let r of csvRow ) {
        let parse = {}
        html += '<tr>'
        let v = r.split( separator )
        let i = 0
        let creDate = Date.now()
        let rec = {}
        if ( ! hr.includes(' id' ) ) {
          rec.id = helper.uuidv4()
        }
        if ( toState ) {
          rec[ '_state' ] = toState.to
          html += '<td>'+toState.to + '</td>'
        }
        if ( ! hr.includes( 'scopeId' ) ) {
          rec[ 'scopeId' ] = user.scopeId
        } 
        rec[ '_cre' ] = creDate
        rec[ '_upd' ] = creDate
     
        for ( let c of hr ) {
          rec[ c ] = v[i]
          html += '<td>'+ v[i] + '</td>'
          if ( c == 'scopeId' ) {
            if ( ! v[i].startsWith( user.rootScopeId ) ) {
              parse.err = 'Error: Scope ID invalid!'
              uploadOK = false
            }
          }
          if ( c == indexKey ) {
            let dbRec = await  dta.getDataById( user.rootScopeId + entityId, v[i] ) 
            if ( dbRec ) {
              parse.err = 'Error: ID exists!'
              uploadOK = false
            }
          }
          i++
        }
        // TODO support JSON, sub/fields, ...
        if ( ! parse.err ) { parse = propHandler.reformatDataUpdateInput( entity, rec ) }
        html += '<td>'+ ( parse.err ? parse.err : 'OK' )+ '</td>'
        recs.push( rec )
        html += '</tr>'
      }
      html += '</table>'
      
      if ( uploadOK ) {
        let importId = helper.uuidv4()
        let importDta = {
          tbl      : user.rootScopeId + entityId,
          rec      : recs,
          appId    : appId,
          entityId : entityId,
          actionId : actionId,
          _expire  : Date.now() + 1000*60*60*24
        }
        await dta.addDataObjNoEvent( 'csv-temp', importId, importDta )
        html += '<p> Click to <a href="guiapp/csv/import/'+importId+'">IMPORT DATA</a>'  
      }
    } 
    if ( ! uploadOK ) {
      html += '<p> <b> UPLOAD FAILED! </b>'
      let csvStr =  ''+ req.files.file.data
      html += '<hr>'
      html += csvStr.replaceAll( '\n', '<br>')
      html += '<hr>'
  
    }
    uploadCsvResult[ user.userId ] = html
   
  } catch ( exc ) {  
    log.warn( 'uploadCsvData', exc )
    return res.status(200).send( 'ERROR' )
  }
  res.send( 'OK' )
}


async function getUploadCsvResult( req, res ) {
  log.info( 'GET /csv/html' ) // , req.files.file.data
  let user = await userDta.getUserInfoFromReq( gui, req )
  // log.info( 'getUploadCsvResult user', user.userId )
  // log.info( 'getUploadCsvResult html', uploadCsvResult )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  res.send( uploadCsvResult[ user.userId ]  )
  delete uploadCsvResult[ user.userId ] 
}


async function importCsvData( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'GET /app/import', req.params.uid  ) 
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.params.uid ) { return res.status(400).send( 'id required' ) }

  let impDta = await dta.getDataById( 'csv-temp', req.params.uid ) 
  if ( ! impDta ) { return res.status(400).send( 'not found' ) }

  for ( let rec of impDta.rec ) {
    await dta.addDataObj( impDta.tbl, rec.id, rec ) //TODO add entity
  }

  await dta.delDataObjNoEvent( 'csv-temp', req.params.uid )

  res.redirect( '../../../index.html?layout=AppEntity-nonav&id='+ impDta.appId ) 
}


async function getDashboardPanels( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  log.info( 'GET /dashboard/panels', req.query.id  ) 
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.query.id ) { return res.status(400).send( 'id required' ) }
  if ( ! req.query.appId ) { return res.status(400).send( 'appId required' ) }

  let panels = await dta.getData( 
    user.rootScopeId + '_dashboard', 
    user.rootScopeId,
    false,
    { appId: req.query.appId, boardId: req.query.id } 
  )
  log.debug( 'panels', panels )
  res.send( panels )
}