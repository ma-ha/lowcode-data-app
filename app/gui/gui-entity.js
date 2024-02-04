/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )

const log     = require( '../helper/log' ).logger
const dta     = require( '../app-dta' )
const userDta  = require( '../app-dta-user' )

exports: module.exports = {
  init
}

function init(  ) {
  
  // --------------------------------------------------------------------------
  let appEntityPage = gui.addPage( 'AppEntity-nonav' ) 
  appEntityPage.title = "App"
  appEntityPage.setPageWidth( "90%")
  appEntityPage.dynamicRow( renderDynEntityRows )

  // --------------------------------------------------------------------------
  let appEntityPropPage = gui.addPage( 'AppEntityProperty-nonav' ) 
  appEntityPropPage.title = "App"
  appEntityPropPage.setPageWidth( "90%")
  appEntityPropPage.dynamicRow( renderDynEntityPrpRows )

}

// ==========================================================================++

async function renderDynEntityRows( staticRows, req, pageName )  {
  if ( ! req.query.id  ) { log.warn('require param: id'); return [] }
  let params =  req.query.id.split(',')
  let appId = params[0]
  let app   = await dta.getAppById( appId )
  if ( ! app ) { log.warn( 'appEntityPage.dynamicRow app not found', appId ); return [] }
  let appIdX = appId.replaceAll('-','').replaceAll('.','').replaceAll('/','')

  let user = await userDta.getUserInfoFromReq( gui, req )
  let rowArr = []
  if ( ! params[1] ) { // log.warn( 'appEntityPage.dynamicRow entityId not set', req.query.id  ); return [] }

    if ( typeof app.startPage === 'string' || app.startPage instanceof String ) {
      // render simple entity page
      let entityId  =app.startPage
      rowArr = renderEntityRows( app, appId, entityId, null )
    
    } else if ( typeof app.startPage === 'array' || app.startPage instanceof Array ) {
    
      // multiple tabs per entity in array
      let tabRow = {
        rowId  : 'Tabs' + appIdX,
        height : "780px",
        tabs   : [] 
      }
      for ( let entityId of app.startPage ) {
        let entity = app.entity[ entityId ]
        let tabSpec = {
          tabId  : 'Tab' + entityId, 
          title  : entity.title, 
          rows: await renderEntityRows( app, appId, entityId, null, user )  
        }
        tabRow.tabs.push( tabSpec )
      }
      rowArr = [ tabRow ]
    }

  } else {   // render simple entity page
    let entityId  = params[1]
    let filter    = ( params.length == 3 ? params[2] : null)
    rowArr = await renderEntityRows( app, appId, entityId, filter, user )  
  } 

  // log.info( JSON.stringify( rowArr, null, ' ' ) )
  return rowArr
}

async function renderEntityRows( app, appId, entityId, filterParam, user ) {
  // log.info( 'renderEntityRows', app, appId, entityId )
  let rows = []
  let appIdX = appId.replaceAll('-','').replaceAll('.','').replaceAll('/','')
  let entity = app.entity[ entityId ]
  if ( ! entity ) { log.error( 'Entity not found: ', entity ); return [] }
  let filter = null
  if ( filterParam ) {
    filter = {
      field: filterParam.split('=')[0],
      value: filterParam.split('=')[1]
    }
    // TODO render short info
    rows.push({ 
      title  : filter.field,
      rowId : 'EntityInfo' + entityId, type : 'pong-form', 
      resourceURL : 'guiapp/'+appId+'/entity/'+entityId,
      height : '60px', decor : "decor",
      moduleConfig : {
        id: 'EntityTableInfoForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "title",   type: "text", defaultVal: filter.value }] },
          { formFields: [{ id: "backLnk", linkText:"Back", type: "link", defaultVal: 'javascript:history.back()' }] }
        ] }]
      }
    })
  }

  if ( entity.divs ) {
    rows.push( genListTable( app, appId, entityId, entity, user ) )
  } else {
    rows.push( genDataTable( app, appId, entityId, entity, user ) )
  }

  rows.push( 
    await genAddDataForm( 
      appId,
      entityId, 
      entity,
      [{ resId: 'EntityList'+ entityId }],
      filter,
      user
    )
  )
  
  return rows
}

// ============================================================================
function genListTable( app, appId, entityId, entity, user ) {
  log.info( 'genListTable',  app, appId, entityId, entity, user )
  if ( entity.divs ) {

    let lstDef = { 
      rowId  : 'EntityList' + entityId,
      title  : entity.title,
      decor  : "decor",
      type   : 'pong-list',
      height : '500px',
      resourceURL : 'guiapp/'+appId+'/entity/'+entityId,
      moduleConfig :  { 
        rowId   : ['id'], 
        dataURL : '',
        divs    : {
          id       : 'EntityDiv',
          cellType : 'div',
          divs     : genDivs( entity.divs, entity.properties )
        }
      }
    }
   return lstDef 
   
  } else { // fallback
    return genDataTable( app, appId, entityId, entity, user )  
  }
}

function genDivs( divArr, properties ) { // recursive
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

// ============================================================================

function genDataTable( app, appId, entityId, entity, user ) {
  log.info( 'genDataTable', appId, entityId, entity, user )
  
  let tblDef = { 
    rowId       : 'EntityList' + entityId,
    title       : entity.title,
    decor       : "decor",
    type        : 'pong-table',
    height      : '500px',
    resourceURL : 'guiapp/'+appId+'/entity/'+entityId,
    moduleConfig : genTblColsConfig( entityId, entity )
  }
  return tblDef
}


function genTblColsConfig( entityId, entity ) {
  let cols = [
    { id: 'Edit', label: "&nbsp;", cellType: "button", method: "GET", width :'5%', 
      icon: 'ui-icon-pencil', setData: [ { resId : 'Add' + entityId } ] } ,
    { id: 'recId', label: "Id",  cellType: "text", width:'10%' }
  ]

  let filter = []
  let appEntityProps = entity.properties
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

    if ( propId == 'id' ) { continue }

    switch ( prop.type ) {
      case 'Boolean':
        cols.push({ id: propId, label : label, cellType: 'checkbox', width:width })
        break 
      case 'Date':
        cols.push({ id: propId, label : label, cellType: 'date', width:width }) 
        break 
      case 'JSON':
        break 
      default:  // String, Number, Select, Event, Link, RefArray, Ref, DocMap, SelectRef
        cols.push({ id: propId, label : label, cellType: 'text', width:width }) 
        break 
    }
    
  }
  cols.push({ id: 'Del', label: "&nbsp;", cellType: "button", width :'5%', icon: 'ui-icon-trash', 
              method: "DELETE", update: [ { resId : 'EntityList'+entityId } ], target: "modal" })
  // log.info( 'colArr',  entityId , cols )

  let tblCfg = { 
    rowId   : [ 'recId' ], 
    dataURL : '',
    cols    : cols
  }

  if ( filter.length != 0 ) {
    tblCfg.filter = {
      dataReqParams    : filter,
      dataReqParamsSrc : 'Form'
    }
  }
  return tblCfg
}

// ============================================================================

async function genAddDataForm( appId, entityId, entity, updateResArr, filter, user ) {

  let cols = []
  if ( entity.properties[ 'id' ] && entity.properties[ 'id' ].type == 'UUID' ) {
    cols.push({ formFields: [{ 
      id: "id", 
      label: ( entity.properties[ 'id' ].label ? entity.properties[ 'id' ].label : "Id (UUID)" ), 
      type: "text", readonly: true 
    } ]})
  } else { // every data rec need an id
    cols.push({ formFields: [{ id: "id", label: "Id", type: "text" } ]})
  }

  for ( let propId in entity.properties ) {
    if ( propId == 'id' ) { continue }
    let prop = entity.properties[ propId ]
    let lbl  = ( prop.label ? prop.label : propId )
    // console.log( 'LBL', lbl)

    let fld = null

    switch ( prop.type ) {
      case 'Boolean':
        fld = { id: propId, label: lbl, type: 'checkbox' }
        break 
      case 'Date':
        fld = { id: propId, label: lbl, type: 'date' }
        break 
      case 'Select':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        for ( let val of prop.options ) { fld.options.push({ option: val }) }
        break 
      case 'SelectRef':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        try {
          let opdTbl = await dta.getData( prop.selectRef, user.scopeId )
          for ( let recId in opdTbl ) { 
            fld.options.push({ option: recId }) 
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'MultiSelectRef':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        try {
          let opdTbl = await dta.getData( prop.multiSelectRef, user.scopeId )
          for ( let recId in opdTbl ) { 
            fld.options.push({ option: recId }) 
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'Ref': 
        // TODO
        break 
      case 'RefArray':
        // TODO
        break 
      case 'UUID':
        fld = { id: propId, label: lbl, type: 'text', readonly: true }
        break 
      case 'Link': 
        // do nothing
        break 
      case 'DocMap':
        // do nothing
        break 
      case 'Event':
        // do nothing
        break 
      case 'JSON':
        fld = { id: propId, label: lbl, type: 'text', rows: 5 }
        break 
      default:   // String, Number
        fld = { id: propId, label: lbl, type: 'text' }
        break 
    }

    if ( filter && filter.field == propId ) {
      fld.defaultVal = filter.value
      fld.readonly   = "true" 
    }
    
    if ( fld ) {
      cols.push({ formFields: [ fld ] })
    }
  }

  let addFormView = { 
    id: 'Add' + entityId, rowId: 'Add' + entityId, type : 'pong-form',
    title: 'Add/edit'+ entity.title,  
    height: 'auto',  decor  : "decor",
    resourceURL: 'guiapp/'+appId+'/entity/'+entityId, 

    moduleConfig : {
      // label:'Add '+viewId,
      // description: "Add",
      id: 'AddForm',
      fieldGroups:[{ columns: cols }],
      actions : [ 
        { id: "AddEntityBtn", actionName: "Add/update",
          actionURL: 'guiapp/'+appId+'/entity/'+entityId,
          update: updateResArr, target: "modal" },
        { id: "ResetEntityFormBtn", actionName: "Reset", method: 'GET',
          actionURL: 'guiapp/'+appId+'/entity/'+entityId+'?recId=_empty',
          setData:  [ { resId : 'Add' + entityId } ] }
      ]
    }
  }
  return addFormView
}
// ==========================================================================++

async function renderDynEntityPrpRows( staticRows, req, pageName ) {
  if ( ! req.query.id  ) { log.warn('require param: id'); return [] }
  let appId     = req.query.id.split(',')[0]
  let entityId  = req.query.id.split(',')[1]
  if ( ! entityId ) { log.warn( 'appEntityPage.dynamicRow entityId not set', req.query.id  ); return [] }
  let app    = await dta.getAppById( appId )
  if ( ! app ) { log.warn( 'appEntityPage.dynamicRow app not found', appId ); return [] }
  let type  = await dta.getAppById( app.type )
  // if ( ! type ) { log.warn( 'appEntityPage.dynamicRow app.type not found', app.type ); return [] }
  // if ( ! type[ entityId ] ) { log.warn( 'appEntityPage.dynamicRow app.type.entity not found', app.type, entityId ); return [] }
  let rowArr = renderEntityPrpRows( app, appId, entityId )
  // log.info( JSON.stringify( rowArr, null, ' ' ) )
  return rowArr
}

function renderEntityPrpRows( app, appId, entityId ) {
  // log.info( 'renderEntityRows', app, appId, entityId )
  let rows = []
  let appIdX = appId.replaceAll('-','').replaceAll('.','').replaceAll('/','')
  let entity = app.entity[ entityId ]
  rows.push({ rowId : 'PropertyTable',
    title  : 'Properties of "'+entityId+'" ("'+appId+'")',
    decor  : "decor",
    type   : 'pong-table',
    height : '300px',
    resourceURL : 'guiapp/'+appId+'/entity/'+entityId+'/property',
    moduleConfig : {
      dataURL: "",
      rowId: "id",
      cols: [
        { id: "id",    label: "Id",    width: "20%", cellType: "text" },
        { id: "type", label: "Title", width: "20%", cellType: "text" },
        { id: "label", label: "Scope",    width: "20%", cellType: "text" }
      ]
    }
  })

  rows.push({ rowId : 'PropertyAddForm',
    title  : 'Add Property',
    decor  : "decor",
    type   : 'pong-form',
    resourceURL : 'guiapp/dev/'+appId+'/entity/'+entityId+'/properties',
    moduleConfig : {
      label:'Add Property',
      description: "Edit Entity Property",
      id: 'EntityAddPropertyForm',
      fieldGroups:[{ columns: [{ formFields: [     
        { id: "id",    label: "Id", type: "text" },
        { id: "label", label: "Label", type: "text" },
        { id: "type", label: "Type", type: "select",
          options: addOptions([ 'String', 'Boolean', 'Select', 'selectRef', 'docMap' ]) 
        }
      ] }] }],
      actions : [ 
        { id: "PropertyAddBtn", actionName: "Add",
          actionURL: 'guiapp/'+appId+'/entity/'+entityId+'/property', target: "_parent" }
      ]
    }
  })

  return rows
}

// ==========================================================================++
// helper 

function addOptions( optArr, selected ) {
  let opts = []
  for ( let opt of optArr ) {
    let option = { option : opt }
    if ( selected == opt ) { option.selected = true } else
    if ( selected instanceof Array && selected.indexOf( opt ) >= 0 ) { option.selected = true }
    opts.push( option )
  }
  return opts
}