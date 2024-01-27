/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const cfg        = require( 'config' )
const apiSec     = require( './api-sec' )
const dta        = require( '../app-dta' )
const userDta    = require( '../app-dta-user' )
const bodyParser = require( 'body-parser' )


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

  svc.use( bodyParser.urlencoded({  limit: "20mb", extended: false }) )
  svc.use( bodyParser.json({ limit: "20mb" }) )

  const myJWTcheck = apiSec.initJWTcheck()
  const guiAuthz = apiSec.userTenantAuthz( gui )

 
  // --------------------------------------------------------------------------
  svc.get( '/setscope',  guiAuthz,  setScope )
  svc.get( '/gui/tenant/app/icons', guiAuthz, getApp )
  svc.get( '/app/:tenantId/:appId/:appVersion/:view', guiAuthz, getAppView )

  svc.get(  '/guiapp/:tenantId/entity', guiAuthz, getEntitiesOfTenant )

  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/pong-table', guiAuthz, getDocTblDef )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/pong-list', guiAuthz, getDocLstDef )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity', guiAuthz, getDocArr )
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, getDoc )
  svc.post( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, addDoc )
  
  svc.get( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/property', guiAuthz, async ( req, res ) => {
    log.info( 'GET entity/property', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
    let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
    let app = await dta.getAppById( appId )
    let propArr = []
    if ( app  &&  app.entity[ req.params.entityId ] ) {
      for ( let propId in app.entity[ req.params.entityId ].properties ) {
        let prop = app.entity[ req.params.entityId ].properties[ propId ]
        log.info( prop )
        let rec = { 
          id    : propId,
          label : ( prop.label ? prop.label : propId )
        }
        if ( prop.type ) {
          rec.type = prop.type
        } else 
        if ( prop.selectRef ) {
          rec.type = 'Select of "'+prop.selectRef+'"'
        } else 
        if ( prop.docMap ) {
          rec.type = 'Map of "'+ prop.docMap+'"'
        }
        propArr.push( rec )
      }
    }
    res.send( propArr )
  })

  svc.get( '/guiapp/:tenantId/:appId/:appVersion/:entity/pong-form', guiAuthz, async ( req, res ) => {
  })

  //---------------------------------------------------------------------------
  // const apiAuthz = apiSec.apiAppAuthz( app )

  // svc.get(  '/adapter/app/:scopeId', apiAuthz, TODO )
  // svc.get(  '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, TODO )
  // svc.post( '/adapter/app/:scopeId/:appId/:appVersion', apiAuthz, TODO )
  // svc.get(  '/adapter/entity/:scopeId/entity', apiAuthz, TODO )
  // svc.get(  '/adapter/entity/:scopeId/:appId/:appVersion/entity', apiAuthz, TODO )
  // svc.get(  '/adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId', apiAuthz, TODO )
  // svc.post( '/adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId', apiAuthz, TODO )

}

async function TODO( req, res ) {
  res.send( 'TODO' )
}
// --------------------------------------------------------------------------

async function setScope ( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( req.query.id && user ) { 
    log.info( 'SET SCOPE', user.userId, req.query.id )
    let scopeTbl = await userDta.getScopeList( user.userId )
    if ( scopeTbl[ req.query.id+'' ] ) {
      await userDta.setSelScope( user.userId, req.query.id+'' )
    }
  } else {
    log.info( 'ERR: SET SCOPE', user.userId, req.query.id )
  }
  res.redirect( 'index.html?layout=Apps' ) 
}


async function getApp( req, res ) {
  // log.info( 'GET apps', req.user )
  let appArr = await dta.getAppList( req.user.scopeId, req.user.scopeTags )
  let icons = []
  for ( let app of appArr ) {
    let entityId = app.startPage
    icons.push({
      id     : app.id,
      layout : 'AppEntity-nonav&id='+app.id,
      label  : app.title,
      img    : app.img
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
  log.info( 'GET entities', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
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

async function getDocLstDef ( req, res ) {
  log.info( 'GET pong-table', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
  let app = await dta.getApp( req.params.tenantId, req.params.appId+'/'+req.params.appVersion )
  let divs = []
  if ( app && app.entity[ req.params.entityId ] ) {
    let entity = app.entity[ req.params.entityId ]
    if ( entity.divs ) {
      divs = genDivs( entity.divs, entity.properties )
    }
  }
  res.send({ 
    rowId   : ['id'], 
    dataURL : '',
    // divs     : divs
    divs    : {
      id       : 'EntityDiv',
      cellType : 'div',
      divs     : [ divs ]
    }
  })
}

function genDivs( divArr, properties ) {
  let result = []
  for ( let aDiv of divArr ) {
    if ( aDiv.divs ) {
      result.push({
        id       : aDiv.id,  // TODO: make more robust
        cellType : 'div',
        divs     : genDivs( aDiv.divs, properties )
      })
    } else if ( aDiv.prop && properties[ aDiv.prop ] ) {
      let propType = 'text'
      if ( properties[ aDiv.prop ].type == 'Boolean ' ) { propType = 'checkbox' }
      result.push({ id : aDiv.prop, cellType : propType })
    }
  }
  return result
}

async function getDocTblDef ( req, res ) {
  log.info( 'GET pong-table', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
  let app = await dta.getApp( req.params.tenantId, req.params.appId+'/'+req.params.appVersion )
  
  
  let cols = [
    { id: 'Edit', label: "&nbsp;", cellType: "button", method: "GET", width :'5%', icon: 'ui-icon-pencil', 
      setData: [ { resId : 'Add' + req.params.entityId } ] } ,
    { id: 'id', label: "Id",  cellType: "text", width:'10%' }
  ]

  if ( app && app.entity[ req.params.entityId ] ) {
    let appEntityProps = app.entity[ req.params.entityId ].properties
    // log.info( 'appEntity', appEntityProps )
    let cnt = 0
    for ( let propId in appEntityProps ) { cnt++ }
    let width = Math.round( 85/cnt ) + '%'

    for ( let propId in appEntityProps ) {
      let prop =  appEntityProps[ propId ]
      let label = propId 
      if ( prop.label ) { label =  prop.label }
      if ( prop.type == 'String' ) {
        cols.push({ id: propId, label : label, cellType: 'text', width:width })
      } else if ( prop.type == 'Boolean' ) {
        cols.push({ id: propId, label : label, cellType: 'checkbox', width:width })
      } else if ( prop.type == 'Select' ) {
        cols.push({ id: propId, label : label, cellType: '', width:width })
      } else if ( prop.docMap  ) {
        cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
      } else if ( prop.selectRef  ) {
        cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
      } else if ( prop.sub ) {
        cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
      } else {
        cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
      }
    }
  }
  // log.info( 'colArr',  req.params.entityId , cols )
  res.send({ 
    rowId   : [ 'id'], 
    dataURL : '',
    cols    : cols
  })
}


async function getDoc( req, res ) {
  log.info( 'GET entity', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { log.warn('GET data: app not found'); return res.status(400).send([]) }
  if ( ! app.entity[ req.params.entityId ] ) { log.warn('GET data: app entity not found'); return res.status(400).send([]) }
  let entity = app.entity[ req.params.entityId ]
  // log.info( 'entity', entity )

  if ( req.query.id ) { // single doc by id
    log.info( 'GET entity q/id', req.query.id )
    let doc = await dta.getDataObjX( 
      user.rootScopeId,  
      req.params.appId, 
      req.params.appVersion,
      req.params.entityId,
      user.scopeId, 
      req.query.id
    )
    return  res.send( doc )
  }

  // else doc array
  let dataArr = await dta.getDataObjX( user.rootScopeId,  req.params.appId, req.params.appVersion, req.params.entityId, user.scopeId )

  let result = []
  for ( let rec of dataArr ) {
    let tblRec = { id: rec.id }
    for ( let propId in entity.properties ) {
      let prop = entity.properties[ propId ]
      let label = ( prop.label ? prop.label : propId )
      if ( prop.type  ) {
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' )
      } else if ( prop.selectRef  ) {
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' )
      } else if ( prop.docMap ) {
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' )
      } else if ( prop.sub ) {
        let params = prop.sub.split('/')
        let param = params[0]+'/'+params[1]+'/'+params[2]+','+params[3] + ','+ prop.prop +'='+ rec.id
        tblRec[ propId ] = '<a href="index.html?layout=AppEntity-nonav&id='+param+'">'+label+'</a>'
      } else {
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' )
      }

    }
    result.push( tblRec )
  }
  // log.info( 'GET entity data', result )
  res.send( result )
}


async function addDoc( req, res )  {
  log.info( 'Add entity', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId, req.body.id  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  if ( ! req.body.id ) {  return res.send( 'ERROR: id required') }
  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  let app = await dta.getAppById( appId )
  if ( ! app ) { return res.send( 'ERROR: App not found') }

  if ( ! app ) { return res.status(401).send( 'ERROR: Login required') }
  let dtaColl = user.rootScopeId + req.params.entityId
  let existRec = await dta.idExists( dtaColl, req.body.id )
  
  if ( existRec && existRec.scopeId != user.scopeId ) {
    return  res.send( 'ID '+  req.body.id +' already used in scope'+  existRec.scopeId )
  }
  let obj = req.body
  obj.scopeId = user.scopeId 
  let result = await dta.addDataObj( dtaColl, req.body.id, req.body )
  // TODO check entity
  res.send( 'OK' )
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