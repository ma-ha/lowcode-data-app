/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const log     = require( '../helper/log' ).logger
const pjson   = require( '../package.json' )

const dta     = require( '../persistence/app-dta' )
const userDta = require( '../persistence/app-dta-user' )
const propHandler = require( '../data/propertyHandler' )

exports: module.exports = {
  init
}


async function init( ) {
  log.info( 'Starting app manager' )

  // --------------------------------------------------------------------------
  let scopePg = gui.addPage( 'Scope' ) 
  scopePg.title    = 'Scopes'
  scopePg.navLabel = 'Scopes'
  scopePg.setPageWidth( '90%' )
  scopePg.addView({ id: 'Scopes', 
    rowId: 'Scopes', title: 'Scopes',  height: '650px', 
    type : 'pong-table', resourceURL: 'scope' 
  })
  scopePg.addView({  id: 'AddScope', 
    title: 'Add / Edit Scopes',  height: '200px', 
    type : 'pong-form', resourceURL: 'scope',
    moduleConfig : {
//      label:'Add Scope',
//      description: "Add Scope",
      id: 'AddScopeForm',
      fieldGroups:[{ columns: [
        { formFields: [{ id: "scopeId", label: "Id", type: "text" } ]},
        { formFields: [{ id: "name", label: "Name", type: "text" } ]},
        { formFields: [{ id: "tags", label: "Tags, comma separated", type: "text" } ]},
        { formFields: [{ id: "metaJSON", label: "Meta Data (JSON)", type: "text", rows: 6 } ]}
      ] }],
      actions : [ 
        { id: "AdScopeBtn", actionName: "Add / Update", update: [{ resId:'Scopes' }], 
          actionURL: 'scope', target: "modal" }
      ]
    }
  })

  // --------------------------------------------------------------------------
  let ermPage = gui.addPage( 'ERM-nonav' ) 
  ermPage.title = 'ERM Model'
  ermPage.setPageWidth( '90%' )
  ermPage.addView({ id: 'ERM', 
      rowId: 'ERM', title: 'ERM',  height: '650px', 
      type : 'erm', resourceURL: 'erm' 
    }, {}, 'ermPage'  // no view plug-in config 
  )

  // --------------------------------------------------------------------------
  let cstmizePage = gui.addPage( 'Customize' ) 
  cstmizePage.title    = 'Customize'
  cstmizePage.navLabel = 'Customize'
  cstmizePage.setPageWidth( '90%' )
  cstmizePage.addView( cstmizePageLnk() )
  cstmizePage.addView( cstmizePageAppTable() )
  cstmizePage.addView( cstmizePageAddAppFrom() )

  function cstmizePageLnk() {
    return { id: 'CustomizeLnk', rowId: 'CustomizeLnk', title: '',
       height: '40px', resourceURL: 'app-lnk', decor: 'none' }
  }

  function cstmizePageAppTable() {
    return {
      id: 'CustomizeAppsTbl', rowId: 'CustomizeAppsTbl', title: 'Apps',  height: '650px', 
      type : 'pong-table', resourceURL: 'app',
      moduleConfig : {
        dataURL: "",
        rowId: "id",
        cols: [
          { id: 'Edit', label: "&nbsp;", cellType: "button", width :'5%', icon: 'ui-icon-pencil', 
          method: "GET", URL: 'app/customize', setData: [ { resId : 'CustomizeAddApp' } ] } ,
          { id: "active",      label: "Enabled",   width: "5%",  cellType: "checkbox" },
          { id: "id",          label: "Id",        width: "20%", cellType: "text" },
          { id: "title",       label: "Title",     width: "15%", cellType: "text" },
          { id: "scope",       label: "Scope",     width: "15%", cellType: "text" },
          { id: "tags",        label: "Tags",      width: "15%", cellType: "text" },
          { id: "role",        label: "Role",      width: "10%", cellType: "text" },
          { id: "entitiesLnk", label: "Entities",  width: "10%", cellType: "text" },
          // { id: "pagesLnk",    label: "App Pages", width: "20%", cellType: "text" },
          { id: "appLnk",      label: "Test App",  width: "10%", cellType: "text" },
          { id: "expLnk",      label: "Export",    width: "10%", cellType: "text" }
        ]
      }
    }
  }

  function cstmizePageAddAppFrom() {
    return { 
      id: 'CustomizeAddApp', rowId: 'CustomizeAddApp', title: 'Add App',  height: 'auto', 
      type : 'pong-form', resourceURL: 'app', 
      moduleConfig : {
        description: "Add",
        id: 'CustomizeAddAppForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId", label: "Id", type: "text" } ]},
          { formFields: [{ id: "name",  label: "App Title", type: "text" } ]},
          { formFields: [{ id: "scope", label: "Scope", type: "select", 
            optionsResource: { resourceURL: 'scope/options', optionValue: 'id',optionField:'name' } } ]},
          { formFields: [{ id: "tags", label: "Tags (comma separated)", type: "text" } ]},
          { formFields: [{ id: "role",  label: "Role",  type: "select",
            options: addOptions([ "appUser", "admin", 'dev', '-' ]) } ]}
          ] }],
        actions : [ 
          { id: "AddFormBtn", actionName: "Add / Change",
            actionURL: 'app',   update: [{ resId:'CustomizeAppsTbl' }], 
            target: "modal" },
          { id: "ImportLink", link: 'Import JSON', linkURL: 'index.html?layout=UploadApp-nonav' }
        ]
      }
    }
  }

  // --------------------------------------------------------------------------
  let appEntitiesPage = gui.addPage( 'AppEntities-nonav' ) 
  appEntitiesPage.title    = 'App Entities'
  appEntitiesPage.setPageWidth( '90%' )

  appEntitiesPage.dynamicRow( async ( staticRows, req, pageName ) => {
    let appId = req.query.id
    if ( ! appId ) { return [] }
    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( ! user ) { return [] }
    let app = await dta.getAppById( appId )

    if ( ! app ) { return [] }
    let rows = [{ 
      id: 'AppEntitiesAppInfo', rowId: 'AppEntitiesAppInfo', title: 'App',  height: '80px', 
      type : 'pong-form', resourceURL: 'app', decor: 'decor',
      moduleConfig : {
        description: "AppEntityInfo",
        id: 'AppEntityInfo',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "id",   label: "Id",  type: "text", defaultVal: appId,     readonly: true } ]},
          { formFields: [{ id: "name", label: "App", type: "text", defaultVal: app.title, readonly: true } ]},
          { formFields: [{ id: "lnk", label: "", linkText:"Back to Apps", type: "link", defaultVal: "index.html?layout=Customize" } ]},
          { formFields: [{ id: "ermLnk", linkText:"Show Data Model", type: "link", defaultVal: 'index.html?layout=ERM-nonav' }] },
          { formFields: [{ id: "StateMgrLnk", linkText:"Manage State Models", type: "link", defaultVal: 'index.html?layout=StateAdmin-nonav' }] }
        ] }]
      }
    }]

    rows.push({
      id: 'AppEntitiesTbl', title: 'App Entities',  height: '600px', 
      type : 'pong-table', resourceURL: 'app/entity',  decor: 'decor', rowId: 'AppEntitiesTbl',
      moduleConfig : {
        dataURL: "",
        rowId: [ 'appId', 'entityId' ],
        cols: [
          { id: 'Edit', label: "&nbsp;", cellType: "button", width :'5%', icon: 'ui-icon-pencil', 
            method: "GET", setData: [ { resId : 'AppEntitiesAdd' } ] } ,
          { id: "entityId",   label: "Id",         width: "10%", cellType: "text" },
          { id: "title",      label: "Title",      width: "10%", cellType: "text" },
          { id: "scope",      label: "Scope",      width: "10%", cellType: "text" },
          { id: "startPage",  label: "Start Page", width: "10%", cellType: "text" },
          { id: "editForm",   label: "Edit Form",  width: "10%", cellType: "text" },
          { id: "userDelete", label: "Deletable",  width: "10%", cellType: "text" },
          { id: "stateModel", label: "State Model",width: "10%", cellType: "text" },
          { id: "propLnk",    label: "Properties", width: "10%", cellType: "text" },
          { id: "maintainer", label: "Maintainer", width: "10%", cellType: "text" },
          { id: 'Del', label: "&nbsp;", cellType: "button", width :'7%', icon: 'ui-icon-trash', 
            method: "DELETE", update: [ { resId : 'AppEntitiesTbl' } ], target: "modal" }
        ]
      }
    })

    let stateModels = [{ option: '' }]
    let states = await dta. getData( 'state', user.rootScopeId )
    for ( let statesId in states ) {
      stateModels.push({ option: statesId.split('/')[1] })
    }

    rows.push({ 
      id: 'AppEntitiesAdd', rowId: 'AppEntitiesAdd', title: 'Add / Update Entity',  height: 'auto', 
      type : 'pong-form', resourceURL: 'app/entity',   decor: 'decor',
      moduleConfig : {
        description: "Add",
        id: 'AppEntitiesAddForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId", label: "App", type: "text", defaultVal: appId, readonly: true } ]},
          { formFields: [
            { id: "entityId",   label: "Id", type: "text",descr: 'Define wisely! You cannot change this (easily)!' } ,
            { id: "title", label: "Title", type: "text" }
          ]},
          { formFields: [
            { id: "scope", label: "Scope", type: "select",
              options: addOptions([ "inherit", "inherit-readonly", 'no-inherit' ]) },
            { id: "maintainer", label: "Maintainer", type: "select",
              options: addOptions([ "appUser", 'admin', 'dev' ]) }
          ]},
          { formFields: [
            { id: "start", label: "Start Page", type: "checkbox" },
            { id: "noEdit", label: "Hide Add/Edit Form", type: "checkbox" }
          ]},
          { formFields: [
            { id: "stateModel", label: "State Model", type: "select", options: stateModels },
            { id: "userDelete", label: "User can delete", type: "checkbox" }
          ]}
        ] }],
        actions : [ 
          { id: "AddFormBtn", actionName: "Add / Update", actionURL: 'app/entity', 
            update: [{ resId:'AppEntitiesTbl' }], target: "modal" }
        ]
      }
    })

    return rows
  })

  // --------------------------------------------------------------------------
  let appEntityPropPage = gui.addPage( 'AppEntityProperties-nonav' ) 
  appEntityPropPage.title    = 'App Entity Properties'
  appEntityPropPage.setPageWidth( '90%' )

  appEntityPropPage.dynamicRow( async ( staticRows, req, pageName ) => {
    let ids = req.query.id
    if ( ! ids ) { return [] }
    let appId = ids.split(',')[0]
    log.info( appId )
    if ( ! appId ) { return [] }
    let app = await dta.getAppById( appId ) 
    if ( ! app ) { return [] }
    
    let entityId = ids.split(',')[1]
    
    // Entity info:
    let rows = [{ 
      id: 'AppEntityInfo', rowId: 'AppEntityInfo', title: 'Entity',  height: '80px', 
      type : 'pong-form', resourceURL: 'app', decor: 'decor',
      moduleConfig : {
        description: "AppEntityInfo",
        id: 'AppEntityInfoForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId", label: "App Id",   type: "text", defaultVal: appId,  readonly: true } ]},
          // { formFields: [{ id: "name", label: "Name", type: "text", defaultVal: app.title, readonly: true } ]},
          { formFields: [{ id: "name", label: "Entity Id", type: "text", defaultVal: entityId, readonly: true } ]},
          { formFields: [{ id: "title", label: "Entity Title", type: "text", defaultVal: entityId, readonly: true } ]},
          { formFields: [{ id: "lnk", label: "", linkText:"Back to Entities", type: "link", defaultVal: "index.html?layout=AppEntities-nonav&id="+appId } ]},
          { formFields: [{ id: "ermLnk", linkText:"Show Data Model", type: "link", defaultVal: 'index.html?layout=ERM-nonav' }] }
        ] }]
      }
    }]
    
    // Property table:
    rows.push({
      id: 'AppEntityProp', rowId: 'AppEntityProp', title: 'App Entity Properties',  height: '550px', 
      type : 'pong-table', resourceURL: 'app/entity/property', decor: 'decor', 
      moduleConfig : {
        dataURL: "",
        rowId: [ 'appId', 'entityId', 'propId' ],
        cols: [
          { id: 'Edit', label: "&nbsp;", cellType: "button", width :'7%', icon: 'ui-icon-pencil', 
            method: "GET", setData: [ { resId : 'AppEntityPropAdd' } ] },
          { id: "propId",  label: "Id",       width: "15", cellType: "text" },
          { id: "label",   label: "Label",    width: "15", cellType: "text" },
          { id: "type",    label: "Type",     width: "40%", cellType: "text" },
          { id: "filter",  label: "Filter",     width: "5%",  cellType: "checkbox" },
          { id: "api",     label: "API Managed",width: "5%", cellType: "checkbox" },
          { id: "noTable", label: "No Table",   width: "5%", cellType: "checkbox" },
          { id: "noEdit",  label: "No Edit",    width: "5%", cellType: "checkbox" },
          { id: "refLbl",  label: "Ref Label",  width: "5%", cellType: "checkbox" },
          { id: "notNull", label: "Not Null",   width: "5%", cellType: "checkbox" },
          { id: 'Del', label: "&nbsp;", cellType: "button", width :'8%', icon: 'ui-icon-trash', 
            method: "DELETE", update: [ { resId : 'AppEntityProp' } ], target: "modal" },
          { id: 'moveDn', label: "&nbsp;", cellType: "button", width :'8%', icon: '	ui-icon-arrowthick-1-s', 
            method: "POST", URL: 'app/entity/property/move-down', update: [ { resId : 'AppEntityProp' } ] }
        ]
      }
    })
    
    // Add property form:
    let refOptions = []
    for ( let entityId in app.entity ) {
      refOptions.push({ value: entityId })
    }

    rows.push({ 
      id: 'AppEntityPropAdd', rowId: 'AppEntityPropAdd', title: 'Add / Update Property',  height: 'auto', 
      type : 'pong-form', resourceURL: 'app/entity/property', decor: 'decor', 
      moduleConfig : {
        description: "Add",
        id: 'AppEntityPropAddForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId",    label: "App", type: "text", defaultVal: appId, readonly: true },
                         { id: "entityId", label: "App", type: "text", defaultVal: entityId, readonly: true } ]},
          { formFields: [ { id: "propId",  label: "Id", type: "text" },
                          { id: "label",   label: "Label", type: "text" } ]},
          { formFields: [{ id: "type",     label: "Type", type: "select",
                           options: addOptions( propHandler.getPropTypes() ) },
            { id: "ref", label: "Ref", type: "text", options: refOptions } ]},
          { formFields: [ { id: "filter",  label: "Filter", type: "checkbox" },
                          { id: "apiManaged",  label: "API managed", type: "checkbox",
                            descr: "will not appear in the GUI form" } ]},
          { formFields: [ { id: "noTable",  label: "No Table", type: "checkbox",
                            descr: "Will not appear in the Table." },
                          { id: "noEdit",  label: "No Edit", type: "checkbox",
                            descr: "Will not appear in the GUI form." } 
                        ]},
          { formFields: [ 
            { id: "refLbl", label: "Refs: Show instead of ID", type: "checkbox" },
            { id: "notNull", label: "Not Null", type: "checkbox" } 
          ]}

        ] }],
        actions : [ 
          { id: "AddFormBtn", actionName: "Add / Update", actionURL: 'app/entity/property', 
            update: [{ resId:'AppEntityProp' }], target: "modal" }
        ]
      }
    })

    return rows
  })

  // --------------------------------------------------------------------------

  let uploadAppPage = gui.addPage( 'UploadApp-nonav' ) 
  uploadAppPage.title    = 'LCA Upload App'
  uploadAppPage.navLabel = 'LCA Upload App'
  uploadAppPage.setPageWidth( '90%' )
  uploadAppPage.addView( uploadAppForm() )
  uploadAppPage.addView( uploadAppOut() )



  // --------------------------------------------------------------------------
  let entityStatusPage = gui.addPage( 'AppEntityStatus-nonav' ) 
  entityStatusPage.title    = 'App Entity Status'
  entityStatusPage.setPageWidth( '90%' )

  entityStatusPage.dynamicRow( async ( staticRows, req, pageName ) => {
    let ids = req.query.id

    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( ! user ) { return [] }

    if ( ! ids ) { return [] }
    let appId = ids.split(',')[0]
    log.info( appId )
    if ( ! appId ) { return [] }
    let app = await dta.getAppById( appId )
    if ( ! app ) { return [] }
    let entityId = ids.split(',')[1]
    let entity = app.entity[ entityId ]
    if ( ! entity ) { return [] }
    
    // Entity info:
    let rows = [{ 
      id: 'pApEntityInfo', rowId: 'AppEntityInfo', title: 'Entity',  height: '80px', 
      type : 'pong-form', resourceURL: 'app', decor: 'decor',
      moduleConfig : {
        description: "AppEntityInfo",
        id: 'AppEntityInfoForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId", label: "App Id",   type: "text", defaultVal: appId,  readonly: true } ]},
          // { formFields: [{ id: "name", label: "Name", type: "text", defaultVal: app.title, readonly: true } ]},
          { formFields: [{ id: "name", label: "Entity Id", type: "text", defaultVal: entityId, readonly: true } ]},
          { formFields: [{ id: "title", label: "Entity Title", type: "text", defaultVal: entityId, readonly: true } ]},
          { formFields: [{ id: "lnk", label: "", linkText:"Back to Entities", type: "link", defaultVal: "index.html?layout=AppEntities-nonav&id="+appId } ]}
        ] }]
      }
    }]

    let cols = [ { id: "transition", label: "State Change", width: "15%", cellType: "text" } ]

    let w = 85
    for ( let propId in entity.properties ) {
      let prop = entity.properties[ propId ]
      cols.push({ 
        id       : 'prop/' + propId,  
        label    : ( prop.label ? prop.label : propId ),
        width    : "5%", 
        cellType : "checkbox", editable: true
      })
      w -= 5
    }
    cols[ cols.length - 1 ].width = w +'%'


    rows.push({
      id: 'AppEntityStatus', rowId: 'AppEntityStatus', title: ' State Action > Field Change',  height: '500px', 
      type : 'pong-table', resourceURL: 'app/entity/property/status-change', decor: 'decor', 
      moduleConfig : {
        dataURL: "",
        rowId: [ 'appId', 'entityId', 'stateId', 'transitionId' ],
        cols: cols
      }
    })

    rows.push({ 
      id: 'StateModel', rowId: 'StateModel', 
      title: 'State Model',
      height: '300px', decor: 'decor',
      type : 'statemodel', 
      resourceURL: 'state-model/diagram',
      moduleConfig : {}
    })

    return rows
  })
 
  // --------------------------------------------------------------------------
  let admStatusPage = gui.addPage( 'StateAdmin-nonav' ) 
  admStatusPage.title = 'Status Admin'
  admStatusPage.setPageWidth( '90%' )

  admStatusPage.addView({ id: 'StateLst', 
    rowId: 'StateLst', title: 'State Models',  height: '650px', 
    type : 'pong-table', resourceURL: 'state-model',
    moduleConfig : {
      dataURL: "",
      rowId: "stateModelId",
      cols: [
        { id: "stateModelId",label: "Model ID",  width: "10%",  cellType: "text" },
        { id: "scope",       label: "Scope",     width: "10%", cellType: "text" },
        { id: "editLnk",     label: "Edit",      width: "10%", cellType: "text" },
        { id: "expLnk",      label: "Export",    width: "10%", cellType: "text" },
        { id: "states",      label: "States",    width: "60%", cellType: "text" }
      ]
    } 
  })
  admStatusPage.addView({ id: 'AddStateForm', 
    title: 'Add', height: '150px', 
    type : 'pong-form', resourceURL: 'state-model',
    moduleConfig : {
      id: 'AddSscopeIdtateForm',
      fieldGroups:[{ columns: [
        { formFields: [{ id: "scopeId", label: "Scope Id", type: "text" } ]},
        { formFields: [{ id: "stateModelId", label: "State Model Id", type: "text" } ]}
      ] }],
      actions : [ 
        { id: "AddStatusBtn", actionName: "Add State", update: [{ resId:'StateLst' }], 
          actionURL: 'state-model', target: "modal" }
      ]
    }
  })

  // --------------------------------------------------------------------------

  let editStatePage = gui.addPage( 'EditState-nonav' ) 
  editStatePage.title = 'Edit State'
  editStatePage.setPageWidth( '90%' )

  editStatePage.addView({ 
    id: 'StateModel', rowId: 'StateModel', 
    title: 'State Model',
    height: '350px', decor: 'decor',
    type : 'statemodel', 
    resourceURL: 'state-model/diagram',
    moduleConfig : {}
  })

  let editStatePageColumns = editStatePage.addColumnsRow( 'EditStatenRow', '650px' )

  let editStatePageColumns1 = editStatePageColumns.addRowsColumn( 'Col1', '50%' )
  editStatePageColumns1.addView({ id: 'StateLst', 
    rowId: 'StateLst', title: 'States',  height: '430px', 
    type : 'pong-table', resourceURL: 'state-model/state',
    moduleConfig : {
      dataURL: "",
      rowId: ['stateModelId','stateId'],
      cols: [
        { id: 'Edit', label: "&nbsp;", cellType: "button", width :'10%', icon: 'ui-icon-pencil', 
          method: "GET", setData: [ { resId : 'AddStateForm' } ] },
        { id: "stateId", label: "State Id",width: "20%", cellType: "text" },
        { id: "label",   label: "Label",   width: "20%", cellType: "text" },
        { id: "img",     label: "Img",     width: "20%", cellType: "text" },
        { id: "imgPic",  label: "",        width: "15%", cellType: "text" },
        { id: "x",       label: "X",       width: "10%", cellType: "text" },
        { id: "y",       label: "y",       width: "10%", cellType: "text" }
      ]
    } 
  })
  editStatePageColumns1.addView({ id: 'AddStateForm', 
    title: 'Add / Update State', height: 'auto', 
    type : 'pong-form', resourceURL: 'state-model/state'
  })

  let editStatePageColumns2 = editStatePageColumns.addRowsColumn( 'Col2', '50%' )
  editStatePageColumns2.addView({ id: 'StateTransitionLst', 
    rowId: 'StateTransitionLst', title: 'State Transitions', height: '430px', 
    type : 'pong-table', resourceURL: 'state-model/transition',
    moduleConfig : {
      dataURL: "",
      rowId: ['stateModelId','stateIdFrom','stateIdTo','actionId'],
      cols: [
        { id: 'Edit', label: "&nbsp;", cellType: "button", width :'10%', icon: 'ui-icon-pencil', 
          method: "GET", setData: [ { resId : 'AddStateTransitionForm' } ] },
        { id: "transition",  label: "Transition",   width: "30%", cellType: "text" },
        { id: "stateIdTo",   label: "To State",     width: "20%", cellType: "text" },
        { id: "actionName",  label: "Action Name",  width: "50%", cellType: "text" },
        { id: "apiManaged",  label: "API Managed",  width: "50%", cellType: "checkbox" }
      ]
    }
  })
  editStatePageColumns2.addView({ id: 'AddStateTransitionForm', 
    title: 'Add / Update Transition', height: 'auto', 
    type : 'pong-form', resourceURL: 'state-model/transition'
  })

}

// ============================================================================

function uploadAppForm() {
  return {
    rowId: "AppUpload", title: "Upload Files",
    type : "pong-upload", resourceURL: "app/json",
    height: '100px', 
    moduleConfig: {
      update : [ "AppUploadOut" ],
      input: []
    }
  }
}

function uploadAppOut() {
  return {
    rowId: "AppUploadOut", title: "Import App", resourceURL: "app/json",
    height: '500px'
  }
}

// ============================================================================

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