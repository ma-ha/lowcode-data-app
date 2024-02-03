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
  svc.get(  '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/:recId/:event', guiAuthz, docEvent )
  svc.delete( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId', guiAuthz, delDoc )
  
  svc.get( '/guiapp/:tenantId/:appId/:appVersion/entity/:entityId/property', guiAuthz, async ( req, res ) => {
    log.error( '>>>>>>>>>>>>>>>>>>>>> GET entity/property', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId )
    // let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
    // let app = await dta.getAppById( appId )
    // let propArr = []
    // if ( app  &&  app.entity[ req.params.entityId ] ) {
    //   for ( let propId in app.entity[ req.params.entityId ].properties ) {
    //     let prop = app.entity[ req.params.entityId ].properties[ propId ]
    //     log.info( prop )
    //     let rec = { 
    //       id    : propId,
    //       type  : prop.type,
    //       label : ( prop.label ? prop.label : propId )
    //     }

    //     if ( prop.selectRef ) {
    //       rec.type = 'Select of "'+prop.selectRef+'"'
    //     } else 
    //     if ( prop.docMap ) {
    //       rec.type = 'Map of "'+ prop.docMap+'"'
    //     }
    //     propArr.push( rec )
    //   }
    // }
    res.send(  )
  })

  svc.get( '/guiapp/:tenantId/:appId/:appVersion/:entity/pong-form', guiAuthz, async ( req, res ) => {
    log.error( '>>>>>>>>>>>>>>>>>>>> GET entity/pong-form' )
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
    { id: 'recId', label: "Id",  cellType: "text", width:'10%' }
  ]

  let filter = []
  if ( app && app.entity[ req.params.entityId ] ) {
    let appEntityProps = app.entity[ req.params.entityId ].properties
    // log.info( 'appEntity', appEntityProps )
    let cnt = 0
    for ( let propId in appEntityProps ) { cnt++ }
    let width = Math.round( 80/cnt ) + '%'

    for ( let propId in appEntityProps ) {
      let prop =  appEntityProps[ propId ]
      let label = propId 
      if ( prop.filter ) {
        if ( prop.type == 'Select' ) {
          let optArr = [{ option: ' ', value: ' ' }]
          for ( let val of prop.options ) { 
            optArr.push( { option: val, value: val })
          }
          filter.push({ id: propId, label: label, type: 'select', options: optArr  })
        } else {
          filter.push({ id: propId, label: label })
        }
      }

      switch ( prop.type ) {
        case 'Boolean':
          cols.push({ id: propId, label : label, cellType: 'checkbox', width:width })
          break 
        case 'Date':
          cols.push({ id: propId, label : label, cellType: 'date', width:width }) 
          break 
        // case 'SelectRef':
        //   cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
        //   break 
        // case 'DocMap':
        //   cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
        //   break 
        // case 'Ref':
        //   cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
        //   break 
        // case 'RefArray':
        //   cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
        //   break 
        // case 'Link':
        //   cols.push({ id: propId, label : label, cellType: 'text', width:width }) // TODO
        //   break 
        // case 'Event':
        //   let p = req.params
        //   cols.push({ id: propId, label : label, cellType: 'button',  method:"POST",
        //     URL:'/guiapp/'+p.tenantId+'/'+p.appId+'/'+p.appId+'/'+p.appVersion+'/'+p.entityId+'/'+prop.event,  
        //     target: 'modal', width:width }) 
        //   break 
        default:  // String, Number, Select
          cols.push({ id: propId, label : label, cellType: 'text', width:width }) 
          break 
      }
    }
  }
  cols.push({ id: 'Del', label: "&nbsp;", cellType: "button", width :'5%', icon: 'ui-icon-trash', 
              method: "DELETE", update: [ { resId : 'EntityList'+req.params.entityId } ], target: "modal" })
  // log.info( 'colArr',  req.params.entityId , cols )

  let tbl = { 
    rowId   : [ 'recId' ], 
    dataURL : '',
    cols    : cols
  }

  if ( filter.length != 0 ) [
    tbl.filter = {
      dataReqParams    : filter,
      dataReqParamsSrc : 'Form'
    }
  ]

  res.send( tbl )
}


async function getDoc( req, res ) {
  log.info( 'GET entity', req.params.tenantId, req.params.appId, req.params.appVersion, req.params.entityId, req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }

  let appId = req.params.tenantId +'/'+ req.params.appId +'/'+ req.params.appVersion
  // log.info( 'entity', entity )

  if ( req.query.recId ) { // single doc by id
    log.info( 'GET entity q/id', req.query.recId )
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
    result.recId =  req.query.recId
    log.debug( 'GET entity q/id', result )
    return  res.send( result )
  }

  let app = await dta.getAppById( appId )
  if ( ! app ) { log.warn('GET data: app not found'); return res.status(400).send([]) }
  if ( ! app.entity[ req.params.entityId ] ) { log.warn('GET data: app entity not found'); return res.status(400).send([]) }
  let entity = app.entity[ req.params.entityId ]
  // else doc array
  let filter = extractFilter( req.query.dataFilter )

  let dataArr = await dta.getDataObjX( user.rootScopeId,  req.params.appId, req.params.appVersion, req.params.entityId, user.scopeId, null, filter )

  let result = []
  for ( let rec of dataArr ) {
    let tblRec = { recId: rec.id }
    log.debug( 'getDoc rec', rec )
    for ( let propId in entity.properties ) {
      let prop = entity.properties[ propId ]
      let label = ( prop.label ? prop.label : propId )
      log.debug( 'getDoc', propId, prop.type )

      switch ( prop.type ) {
        case 'SelectRef':
          tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) // TODO
          break 
        case 'DocMap':
          let params = prop.docMap.split('/')
          let param = params[0]+'/'+params[1]+'/'+params[2]+','+params[3] + ','+ params[4] +'='+ rec.id
          tblRec[ propId ] = '<a href="index.html?layout=AppEntity-nonav&id='+param+'">'+label+'</a>'
          break 
        case 'Ref':
          tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) // TODO
          break 
        case 'RefArray':
          tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) // TODO
          break 
        case 'Link': 
          if ( prop.link ) {
            let href = prop.link
            href = href.replaceAll( '${id}', rec[ 'id' ] )
            href = href.replaceAll( '${scopeId}', rec[ 'scopeId' ] )
            for ( let replaceId in entity.properties ) {
              href = href.replaceAll( '${'+replaceId+'}', rec[ replaceId ] )
            }
            tblRec[ propId ] = '<a href="'+href+'" target="_blank">'+label+'</a>'
          } else { tblRec[ propId ] = '' }
          break 
        case 'JSON': 
          tblRec[ propId ] = 'TODO' // open JSON editor
          break 
        case 'Event': 
          let p = req.params
          let url =  'guiapp/'+p.tenantId+'/'+p.appId+'/'+p.appVersion+'/entity/'+p.entityId+'/'+rec.id+'/'+propId
          let eventLnk = '<a href="'+url+'">'+( prop.label ? prop.label : propId ) +'</a>'
          if ( rec.eventArr &&  rec.eventArr.indexOf(propId) >= 0 ) {
            eventLnk = 'Pending...'
          } else if ( prop.event && prop.event.indexOf('==') > 0 ) {
            let cnd = prop.event.split('==')
            let cndProp = cnd[0].trim()
            let cndValArr = cnd[1].split(',')
            for ( let cndVal of cndValArr ) {
              if ( rec[ cndProp ]  &&  rec[ cndProp ] != cndVal.trim() ) {
                eventLnk = ''
              }
            }
          } else if ( prop.event && prop.event.indexOf('!=') > 0 ) {
            let cnd = prop.event.split('!=')
            let cndProp = cnd[0].trim()
            let cndValArr = cnd[1].split(',')
            for ( let cndVal of cndValArr ) {
              if ( rec[ cndProp ]  &&  rec[ cndProp ] == cndVal.trim() ) {
                eventLnk = ''
              }
            }
          } 

          tblRec[ propId ] = eventLnk //rec[ propId ].event
          break 
        default:   // String, Number, Select
          tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' )
          break 
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

  let dtaColl = user.rootScopeId + req.params.entityId
  
  // let existRec = await dta.idExists( dtaColl, req.body.id )  
  // if ( existRec && existRec.scopeId != user.scopeId ) {
  //   return  res.send( 'ID '+  req.body.id +' already used in scope'+  existRec.scopeId )
  // }
  let obj = req.body
  obj.scopeId = user.scopeId 
  let result = await dta.addDataObj( dtaColl, req.body.id, req.body )
  // TODO check entity
  res.send( 'OK' )
}


async function delDoc( req, res )  {
  log.info( 'Del entity', req.params, req.query  )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.query.recId ) { return res.send( 'ERROR: id required') }
  let dtaColl = user.rootScopeId + req.params.entityId
  let result = await dta.delDataObj( dtaColl, req.query.recId )
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
      await dta.addDataObj( user.rootScopeId+p.entityId,  p.recId, rec )
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