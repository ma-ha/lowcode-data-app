/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )

const log     = require( '../helper/log' ).logger
const dta     = require( '../persistence/app-dta' )
const userDta = require( '../persistence/app-dta-user' )

const propHandler = require( '../data/propertyHandler' )

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

  let appEntityActionPage = gui.addPage( 'AppEntityAction-nonav' ) 
  appEntityActionPage.title = "App"
  appEntityActionPage.setPageWidth( "90%")
  appEntityActionPage.dynamicRow( renderDynEntityActionRows )
  
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
      rowArr = renderEntityRows( app, appId, entityId, null, user )
    
    } else if ( typeof app.startPage === 'array' || app.startPage instanceof Array ) {
    
      // multiple tabs per entity in array
      let tabRow = {
        rowId  : 'Tabs' + appIdX,
        height : "830px",
        tabs   : [] 
      }
      for ( let entityId of app.startPage ) {
        let entity = app.entity[ entityId ]
        let tabSpec = {
          tabId  : 'Tab' + entityId, 
          title  : ( entity.title ? entity.title : entityId ),
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

  if ( entity.stateModel ) {
    let stateModel = await dta.getStateModelById( user.rootScopeId, entity.stateModel )
    if ( ! stateModel ) { log.warn('renderEntityRows: stateModel not found'); return [] }
    let initState = stateModel.state[ 'null' ]
    if ( ! initState || ! initState.actions ) { log.warn('renderEntityRows: stateModel not found'); return [] }
    for ( let actionId in initState.actions ) {
      let actionFields = await propHandler.genGuiFormFieldsDef( entity, null, user, 'null_'+actionId )
      actionFields.push({ formFields: [{ id: '_state', type: "text", value: initState.actions[actionId].to, hidden: true }] } )

      rows.push({ 
        title  : 'New ' + ( entity.title ? entity.title : entityId),
        rowId : 'EntityNewFrm'+entityId, 
        type : 'pong-form', 
        resourceURL : 'guiapp/'+appId+'/entity/'+entityId,
        height : 'auto', decor : "decor",
        moduleConfig : {
          fieldGroups:[{ columns: actionFields }],
          actions : [ 
            { id: "BtnNew"+entityId, actionName: actionId,
              actionURL: 'guiapp/'+appId+'/entity/'+entityId,
              update: [{ resId : 'EntityList' + entityId }], target: "modal" }
          ]
        }
      })
      break // TODO allow more than only one 1st state
    }
  }


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

  let tblHeight = ( entity.noEdit ? '780px' : '550px' )
  
  if ( entity.divs ) {
    rows.push( genListTable( app, appId, entityId, entity, user, tblHeight ) )
  } else {
    rows.push( genDataTable( app, appId, entityId, entity, user, tblHeight ) )
  }

  if ( ! entity.noEdit ) {
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
  }
  
  
  return rows
}

// ============================================================================
function genListTable( app, appId, entityId, entity, user, tblHeight ) {
  log.info( 'genListTable',  app, appId, entityId, entity, user )
  if ( entity.divs ) {

    let lstDef = { 
      rowId  : 'EntityList' + entityId,
      title  : entity.title,
      decor  : "decor",
      type   : 'pong-list',
      height : tblHeight,
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
    return genDataTable( app, appId, entityId, entity, user, tblHeight )  
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

function genDataTable( app, appId, entityId, entity, user, tblHeight ) {
  log.debug( 'genDataTable', appId, entityId, entity, user )
  
  let tblDef = { 
    rowId       : 'EntityList' + entityId,
    title       : entity.title,
    decor       : "decor",
    type        : 'pong-table',
    height      : tblHeight,
    resourceURL : 'guiapp/'+appId+'/entity/'+entityId,
    moduleConfig : genTblColsConfig( entityId, entity )
  }
  return tblDef
}


function genTblColsConfig( entityId, entity ) {
  let appEntityPropMap = entity.properties

  let cols = [ ]
  if ( ! entity.noEdit ) {
    cols.push({ id: 'Edit', label: "&nbsp;", cellType: "button", method: "GET", width :'5%', 
    icon: 'ui-icon-pencil', setData: [ { resId : 'Add' + entityId } ] })
  }
  
  if ( entity.stateModel ) {
    cols.push({ id: '_state', label: "State",  cellType: "text", width:'10%' })
  }

  if ( ! ( entity.properties.id && entity.properties.id.noTable ) ) {
    cols.push({ id: 'recId', label: "Id",  cellType: "text", width:'10%' })
  }

  cols = cols.concat( propHandler.genGuiTableColsDef( appEntityPropMap ) )

  if ( entity.stateModel ) {
    cols.push({ id: '_stateBtn', label: "",  cellType: "text", width:'10%' })
  }

  if ( ! entity.noEdit &&  ! entity.noDelete && ! entity.stateModel ) {
    cols.push({ id: 'Del', label: "&nbsp;", cellType: "button", width :'5%', icon: 'ui-icon-trash', 
              method: "DELETE", update: [ { resId : 'EntityList'+entityId } ], target: "modal" })
  }

  let tblCfg = { 
    rowId   : [ 'recId' ], 
    dataURL : '',
    cols    : cols
  }

  let filter = propHandler.genGuiTableFilterDef( appEntityPropMap )
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

  let cols = await propHandler.genGuiFormFieldsDef( entity, filter, user )

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
async function renderDynEntityActionRows( staticRows, req, pageName ) {
  let idRef = req.query.id.split('/')
  let rootScopeId = idRef[1]
  let appId       = idRef[1] +'/'+  idRef[2] +'/'+  idRef[3]
  let entityId    = idRef[5]
  let recId       = idRef[6]
  let stateAction = idRef[7]
  let stateId     = idRef[7].split('_')[0]
  let actionId    = idRef[7].split('_')[1]

  log.debug( 'stateId/actionId', stateId, actionId )

  let user = await userDta.getUserInfoFromReq( gui, req )
  let app  = await dta.getAppById( appId )
  let entity =  app.entity[ entityId ]
  let stateModel = await dta.getStateModelById( rootScopeId, entity.stateModel  )
  let rec = await dta.getDataById( rootScopeId + entityId, recId )
  log.info( 'rec', rec )
  if ( ! app || ! user || !entity || ! stateModel ) { 
    log.info( 'idRef', idRef )
    log.warn( 'renderDynEntityActionRows not found',  app, user, app.entity[ entityId ], stateModel )
    return [] 
  }

  let formCols = await propHandler.genGuiFormStateChangeDef( entity , null, user, stateAction, rec, stateModel )

  let stateActionForm = { 
    id: 'ChangeState' + entityId, rowId: 'ChangeState' + entityId, 
    type : 'pong-form',
    title: ( entity.title ? entity.title : entityId ),  
    height: 'auto',  decor  : "decor",
    resourceURL: 'guiapp/'+appId+'/entity/'+entityId, 

    moduleConfig : {
      // label:'Add '+viewId,
      // description: "Add",
      id: 'StateActionForm',
      fieldGroups:[{ columns: formCols }],
      actions : [ 
        { id: "AddEntityBtn", actionName: actionId,
          actionURL: 'guiapp/'+appId+'/entity/'+entityId+'/'+recId+'/changeState',
          target: "_parent" }
      ]
    }
  }

  return [ stateActionForm ]
}

async function renderDynEntityPrpRows( staticRows, req, pageName ) {
  if ( ! req.query.id  ) { log.warn('require param: id'); return [] }
  let appId     = req.query.id.split(',')[0]
  let entityId  = req.query.id.split(',')[1]
  if ( ! entityId ) { log.warn( 'appEntityPage.dynamicRow entityId not set', req.query.id  ); return [] }
  let app    = await dta.getAppById( appId )
  if ( ! app ) { log.warn( 'appEntityPage.dynamicRow app not found', appId ); return [] }
  // let type  = await dta.getAppById( app.type )
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