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

let cfg = {}

async function init( appCfg ) {
  log.info( 'Starting app manager' )
  cfg = appCfg

  // --------------------------------------------------------------------------
  let scopePg = gui.addPage( 'Scope' ) 
  scopePg.title    = 'Scopes'
  scopePg.navLabel = 'Scopes'
  scopePg.setPageWidth( '90%' )
  scopePg.addView({ id: 'Scopes', 
    rowId: 'Scopes', title: 'Scopes',  height: '560px', 
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
        { formFields: [{ id: "tags", label: "Tags", descr: 'Comma separated', type: "text" } ]},
        { formFields: [{ id: "metaJSON", label: "Meta Data", descr: "JSON", type: "text", rows: 6 } ]}
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

  cstmizePage.dynamicRow( async ( staticRows, req, pageName ) => {
    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( ! user ) { return [] }

    let rows = []
    rows.push(  cstmizePageLnk() )
    rows.push(  cstmizePageAppTable( user.scopeId ) )
    rows.push(  cstmizePageAddAppFrom( user.scopeId ) )

    return rows
  })

  function cstmizePageLnk() {
    return { id: 'CustomizeLnk', rowId: 'CustomizeLnk', title: '',
       height: '60px', resourceURL: 'app-lnk', decor: 'decor' }
  }

  function cstmizePageAppTable( scopeId ) {
    let tbl = {
      id: 'CustomizeAppsTbl', rowId: 'CustomizeAppsTbl', title: 'Apps',  height: '565px', 
      type : 'pong-table', resourceURL: 'app', decor: 'decor',
      moduleConfig : {
        dataURL: "",
        rowId: "id",
        cols: [
          { id: 'Edit', label: "", cellType: "button", width :'5%', icon: 'ui-icon-pencil', 
          method: "GET", URL: 'app/customize', setData: [ { resId : 'CustomizeAddApp' } ] } ,
          { id: "enabled",     label: "Enabled",   width: "5%",  cellType: "checkbox" },
          { id: "id",          label: "Id",        width: "20%", cellType: "text" },
          { id: "title",       label: "Title",     width: "15%", cellType: "text" },
          { id: "scope",       label: "Scope",     width: "15%", cellType: "text" },
          { id: "tags",        label: "Tags",      width: "15%", cellType: "text" },
          { id: "role",        label: "Role",      width: "10%", cellType: "text" },
          { id: "dashboardLnk",label: "Dashboard", width: "7%",  cellType: "text" },
          { id: "entitiesLnk", label: "Entities",  width: "10%", cellType: "text" },
          // { id: "pagesLnk",    label: "App Pages", width: "20%", cellType: "text" },
          { id: "appLnk",      label: "Test&nbsp;it",  width: "10%", cellType: "text" },
          { id: "expLnk",      label: "Export",    width: "10%", cellType: "text" },
          { id: "swaggerLnk",  label: "Adapter&nbsp;API",   width: "10%", cellType: "text" }
        ]
      }
    }
    if ( cfg.MARKETPLACE_SERVER  && scopeId == cfg.MARKETPLACE_SCOPE ) {
      tbl.title = 'Marketplace Apps'
      tbl.moduleConfig.cols =  [
        { id: 'Edit', label: "", cellType: "button", width :'5%', icon: 'ui-icon-pencil', 
        method: "GET", URL: 'app/customize', setData: [ { resId : 'CustomizeAddApp' } ] } ,
        { id: "marketplace", label: "Market",   width: "5%",  cellType: "checkbox" },
        { id: "id",          label: "Id",        width: "20%", cellType: "text" },
        { id: "title",       label: "Title",     width: "15%", cellType: "text" },
        { id: "dashboardLnk",label: "Dashboard", width: "7%",  cellType: "text" },
        { id: "entitiesLnk", label: "Entities",  width: "10%", cellType: "text" },
        // { id: "pagesLnk",    label: "App Pages", width: "20%", cellType: "text" },
        { id: "appLnk",      label: "Test&nbsp;it",  width: "10%", cellType: "text" },
        { id: "expLnk",      label: "Export",    width: "10%", cellType: "text" },
        { id: "swaggerLnk",  label: "Adapter&nbsp;API",   width: "10%", cellType: "text" }
      ]
    }
    // TODO show marketplace col
    return tbl
  }

  function cstmizePageAddAppFrom( scopeId ) {
      let form = { 
      id: 'CustomizeAddApp', rowId: 'CustomizeAddApp', title: 'Add / Edit App',  height: 'auto', 
      type : 'pong-form', resourceURL: 'app', decor: 'decor',
      moduleConfig : {
        description: "Add",
        id: 'CustomizeAddAppForm',
        fieldGroups:[{ columns: [
          { formFields: [ { id: "appId", label: "Id", type: "text" },
                          { id: "appIdOrig", type: "text", hidden: true },
                          { id: "name",  label: "App Title", type: "text" }
           ]},
          { formFields: [
            { id: "scope", label: "Scope", type: "select", 
              optionsResource: { resourceURL: 'scope/options', optionValue: 'id',optionField:'name' } },
            { id: "tags", label: "Tags", descr: 'Comma separated', type: "text" }
          ]},
          { formFields: [
            { id: "img",  label: "Icon", type: "text" },
            { id: "role",  label: "Role",  type: "select",
              options: addOptions([ "appUser", "admin", 'dev', '-' ]) }
          ]},
          { formFields: [
             { id: "enabled",   label: "Enabled",   type: "checkbox" },
             { id: "dashboard", label: "Dashboard", type: "checkbox" } 
          ]},
          { formFields: [{ id: "description", label: "Description", type: "text", rows: 4 } ]}
        ] }],
        actions : [ 
          { id: "AddFormBtn", actionName: "Add / Change",
            actionURL: 'app',   update: [{ resId:'CustomizeAppsTbl' }], 
            target: "modal" },
          { id: "ImportLink", link: 'Import JSON', linkURL: 'index.html?layout=UploadApp-nonav' }
        ]
      }
    }
    if ( cfg.MARKETPLACE_SERVER  && scopeId == cfg.MARKETPLACE_SCOPE ) {
      form.moduleConfig.fieldGroups[0].columns[3].formFields.push(
        { id: "marketplace", label: "Marketplace", type: "checkbox" }
      )
      form.moduleConfig.fieldGroups[0].columns[0].formFields.push(
        { id: "by", label: "By", type: "text" }
      )
      form.moduleConfig.fieldGroups[0].columns[1].formFields.push(
        { id: "standard", label: "Standard", type: "text" }
      )
      form.moduleConfig.fieldGroups[0].columns[1].formFields.push(
        { id: "license", label: "License", type: "text" }
      )
    }
    return form
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
      id: 'AppEntitiesTbl', title: 'App Entities',  height: '535px', 
      type : 'pong-table', resourceURL: 'app/entity',  decor: 'decor', rowId: 'AppEntitiesTbl',
      moduleConfig : {
        dataURL: "",
        rowId: [ 'appId', 'entityId' ],
        cols: [
          { id: 'Edit', label: "", cellType: "button", width :'5%', icon: 'ui-icon-pencil', 
            method: "GET", setData: [ { resId : 'AppEntitiesAdd' } ] } ,
          { id: "entityId",   label: "Id",         width: "10%", cellType: "text" },
          { id: "propLnk",    label: "Properties", width: "10%", cellType: "text" },
          { id: "title",      label: "Title",      width: "10%", cellType: "text" },
          { id: "scope",      label: "Scope",      width: "10%", cellType: "text" },
          { id: "startPage",  label: "Start Page", width: "10%", cellType: "checkbox" },
          { id: "editForm",   label: "Edit Form",  width: "10%", cellType: "checkbox" },
          { id: "userDelete", label: "Deletable",  width: "10%", cellType: "checkbox" },
          { id: "csvUpload",  label: "CSV Upload", width: "10%", cellType: "checkbox" },
          { id: "stateModel", label: "State Model",width: "10%", cellType: "text" },
          { id: "maintainer", label: "Maintainer", width: "10%", cellType: "text" },
          { id: 'Del', label: "", cellType: "button", width :'7%', icon: 'ui-icon-trash', 
            method: "DELETE", update: [ { resId : 'AppEntitiesTbl' } ], target: "modal" }
        ]
      }
    })

    let stateModels = [{ option: '' }]
    let states = await dta.getStateModelMap( user.rootScopeId )
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
            { id: "start",     label: "Start Page", type: "checkbox" },
            { id: "csvUpload", label: "CSV Upload", type: "checkbox" }
          ]},
          { formFields: [
            { id: "userDelete", label: "User can delete",    type: "checkbox" },
            { id: "noEdit",     label: "Hide Add/Edit Form", type: "checkbox" }
          ]},
          { formFields: [
            { id: "stateModel", label: "State Model", type: "select", options: stateModels },
          ]}
        ] }],
        actions : [ 
          { id: "AddFormBtn", actionName: "Add / Update", actionURL: 'app/entity', 
            update: [{ resId:'AppEntitiesTbl' }], target: "modal" }
        ]
      }
    })


    let appOptions = []
    let appMap = await dta.getAppList( user.rootScopeId, [],  'admin' )
    for ( let appId in appMap ) {
      for ( let entityId in appMap[ appId ].entity ) {
         appOptions.push({ option: appId +'/'+ entityId  })
      }
    }

    rows.push({ 
      id: 'AppEntitiesInherit', rowId: 'AppEntitiesInherit', title: 'Inherit Entity',  height: 'auto', 
      type : 'pong-form', resourceURL: 'app/entity',   decor: 'decor',
      moduleConfig : {
        description: "Add",
        id: 'AppEntitiesInheritForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId", label: "App", type: "text", defaultVal: appId, readonly: true } ]},
          { formFields: [
            { id: "entityId",   label: "Id", type: "text",descr: 'Define wisely! You cannot change this (easily)!' }
          ]},
          { formFields: [
            { id: "parentId", label: "Parent Entity ID", type: "select", options: appOptions }
          ]}
        ] }],
        actions : [ 
          { id: "AddInheritFormBtn", actionName: "Create Child", actionURL: 'app/entity/inherit', 
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
      id: 'AppEntityProp', rowId: 'AppEntityProp', title: 'App Entity Properties',  height: '600px', 
      type : 'pong-table', resourceURL: 'app/entity/property', decor: 'decor', 
      moduleConfig : {
        dataURL: "",
        rowId: [ 'appId', 'entityId', 'propId' ],
        cols: [
          { id: 'Edit', label: "", cellType: "button", width :'4%', icon: 'ui-icon-pencil', 
            method: "GET", setData: [ { resId : 'AppEntityPropAdd' } ] },
          { id: "propId",  label: "Id",       width: "15%", cellType: "text" },
          { id: "label",   label: "Label",    width: "10%", cellType: "text" },
          { id: "type",    label: "Type",     width: "35%", cellType: "text" },
          { id: "colWidth",label: "Width",     width: "5%", cellType: "text" },
          { id: "filter",  label: "Filter",     width: "4%",  cellType: "checkbox" },
          { id: "api",     label: "API Managed",width: "4%", cellType: "checkbox" },
          { id: "noTable", label: "No Table",   width: "4%", cellType: "checkbox" },
          { id: "noEdit",  label: "No Edit",    width: "4%", cellType: "checkbox" },
          { id: "refLbl",  label: "Ref Label",  width: "4%", cellType: "checkbox" },
          { id: "notNull", label: "Not Null",   width: "4%", cellType: "checkbox" },
          { id: 'Del', label: "", cellType: "button", width :'4%', icon: 'ui-icon-trash', 
            method: "DELETE", update: [ { resId : 'AppEntityProp' } ], target: "modal" },
          { id: 'moveDn', label: "", cellType: "button", width :'7%', icon: '	ui-icon-arrowthick-1-s', 
            method: "POST", URL: 'app/entity/property/move-down', update: [ { resId : 'AppEntityProp' } ] }
        ]
      }
    })
    
    // Add property form:
    let refOptions = []
    for ( let entityId in app.entity ) {
      refOptions.push({ value: entityId })
    }
    let refDescr = 
      'String: RegExp (optional)\n' +
      'Text: Input field line count (integer number)\n' +
      'Select: Options, comma separated\n' +
      'SelectRef/MultiSelectRef: Full id of the entity, ScopeId/AppId/AppVer/EntityId\n' +
      'DocMap: PropertyId of the child table, which stores the id of the parent\n'+
      'API static string: String content to insert\n'+
      'Link: The URL\n'+
      'Event: EventID string to send'

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
                           options: addOptions( propHandler.getPropTypes(), 'x', [ 'Metric',  'Event', 'BLOB' ] ) },
                         { id: "ref", label: "Spec", type: "text", options: refOptions , descr: refDescr } ]},
          { formFields: [ { id: "filter",  label: "Filter", type: "checkbox" },
                          { id: "apiManaged",  label: "API managed", type: "checkbox",
                            descr: "will not appear in the GUI form" } ]},
          { formFields: [ { id: "noTable",  label: "No Table", type: "checkbox",
                            descr: "Will not appear in the Table." },
                          { id: "noEdit",  label: "No Edit", type: "checkbox",
                            descr: "Will not appear in the GUI form." } 
                        ]},
          { formFields: [ 
            { id: "refLbl", label: "Ref Label", descr: 'show instead of ID', type: "checkbox" },
            { id: "notNull", label: "Not Null", type: "checkbox" } 
          ]},
          { formFields: [ 
            { id: "description", label: "Description / Help", type: "text", rows: 3 }
          ]},
          { formFields: [ 
            { id: "colWidth", label: "Width", type: "select",
              options: [{option:'XS'},{option:'S'},{option:'M'},{option:'L'},{option:'XL'}] }
          ]}

        ] }],
        actions : [ 
          { id: "AddFormBtn", actionName: "Add / Update", actionURL: 'app/entity/property', 
            update: [{ resId:'AppEntityProp' }], target: "modal" }
        ]
      }
    })


    let entity = app.entity[ entityId ]
    let tableHeight = ( entity.noEdit ? '780px' : '550px' )
    if ( entity.tableHeight ) {
      tableHeight = entity.tableHeight 
    }
    
    rows.push({ 
      id: 'AppEntityConfig', rowId: 'AppEntityConfig', title: 'Entity GUI Config',  height: '120px', 
      type : 'pong-form', resourceURL: 'app/entity/config', decor: 'decor',
      moduleConfig : {
        description: "AppEntityInfo",
        id: 'AppEntityInfoForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId",    type: "text", value: appId,    hidden: true } ]},
          { formFields: [{ id: "entityId", type: "text", value: entityId, hidden: true } ]},
          { formFields: [{ id: "tableHeight",   label: "Table Height", type: "text", defaultVal: tableHeight } ]}
        ] }],
        actions : [ 
          { id: "AppEntityConfigBtn", actionName: "Change Config", actionURL: 'app/entity/config', target: "modal" }
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
  uploadAppPage.addView(  uploadOut( 'app/json' ) )

  let uploadStatePage = gui.addPage( 'UploadStateModel-nonav' ) 
  uploadStatePage.title    = 'LCA Upload State Model'
  uploadStatePage.navLabel = 'LCA Upload State Model'
  uploadStatePage.setPageWidth( '90%' )
  uploadStatePage.addView( uploadStateModelForm() )
  uploadStatePage.addView( uploadOut( 'state-model/json' ) )

  let uploadSwaggerPage = gui.addPage( 'UploadSwagger-nonav' ) 
  uploadSwaggerPage.title    = 'LCA Upload Swagger'
  uploadSwaggerPage.navLabel = 'LCA Upload Swagger'
  uploadSwaggerPage.setPageWidth( '90%' )
  uploadSwaggerPage.addView( uploadAppSwaggerForm() )
  uploadSwaggerPage.addView( uploadOut( 'app/swagger' ) )

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
    if ( ! appId ) { return [] }
    let app = await dta.getAppById( appId )
    if ( ! app ) { return [] }
    let entityId = ids.split(',')[1]
    let entity = app.entity[ entityId ]
    if ( ! entity || ! entity.stateModel ) { return [] }
    let stateModelId = user.rootScopeId +'/'+ entity.stateModel
    let indexKey = propHandler.getIndex( entity )


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
          { formFields: [{ id: "lnk2", label: "", linkText:"Edit State Model", type: "link", defaultVal: 'index.html?layout=EditState-nonav&id='+stateModelId } ]}
        ] }]
      }
    }]

    let cols = [ 
      { id: "transition", label: "State Change", width: "15%", cellType: "text" },
      { id: "transitionCondition", label: "Condition", width: "15%", cellType: "text", editable: true } 
    ]

    let w = 70
    for ( let propId in entity.properties ) {
      let prop = entity.properties[ propId ]
      if ( indexKey  &&  propId == indexKey  &&  prop.type.startsWith( 'UUID' ) ) { continue }
      let pId = propId.replaceAll('.','_')
      cols.push({ 
        id       : 'prop/' + pId,  
        label    : ( prop.label ? prop.label : propId ),
        width    : "3%", 
        cellType : "checkbox", editable: true
      })
      cols.push({ 
        id       : 'prop/' + pId +'/default',  
        label    : 'default',
        width    : "7%", 
        cellType : "text", editable: true
      })
      w -= 10
    }
    if ( w > 0 ) {
      cols.push({ 
        id       : '__',  
        label    : '',
        width    : w+"%", 
        cellType : "text"
      })
    }

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

    let creFromHeight = ( entity.creFromHeight ?  entity.creFromHeight : '180px' )
    let tableHeight = ( entity.noEdit ? '780px' : '550px' )
    if ( entity.tableHeight ) {
      tableHeight = entity.tableHeight 
    }
    
    rows.push({ 
      id: 'AppEntityConfig', rowId: 'AppEntityConfig', title: 'Entity GUI Config',  height: '120px', 
      type : 'pong-form', resourceURL: 'app/entity/config', decor: 'decor',
      moduleConfig : {
        description: "AppEntityInfo",
        id: 'AppEntityInfoForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "appId",    type: "text", value: appId,    hidden: true } ]},
          { formFields: [{ id: "entityId", type: "text", value: entityId, hidden: true } ]},
          { formFields: [{ id: "creFromHeight", label: "Entity Create Form Height", type: "text", defaultVal: creFromHeight } ]},
          { formFields: [{ id: "tableHeight",   label: "Table Height", type: "text", defaultVal: tableHeight } ]}
        ] }],
        actions : [ 
          { id: "AppEntityConfigBtn", actionName: "Change Config", actionURL: 'app/entity/config', target: "modal" }
        ]
      }
    })

    return rows
  })
 
  // --------------------------------------------------------------------------
  let admStatusPage = gui.addPage( 'StateAdmin-nonav' ) 
  admStatusPage.title = 'Status Admin'
  admStatusPage.setPageWidth( '90%' )

  admStatusPage.addView({ id: 'StateLst', 
    rowId: 'StateLst', title: 'State Models',  height: '610px', 
    type : 'pong-table', resourceURL: 'state-model',
    moduleConfig : {
      dataURL: "",
      rowId: "stateModelId",
      cols: [
        { id: "stateModelId",label: "Model ID",  width: "16%",  cellType: "text" },
        { id: "scope",       label: "Scope",     width: "8%", cellType: "text" },
        { id: "editLnk",     label: "Edit",      width: "8%", cellType: "text" },
        { id: "expLnk",      label: "Export",    width: "8", cellType: "text" },
        { id: "states",      label: "States",    width: "60%", cellType: "text" }
      ]
    } 
  })
  admStatusPage.addView({ id: 'AddStateForm', 
    title: 'Add State Model', height: '150px', 
    type : 'pong-form', resourceURL: 'state-model',
    moduleConfig : {
      id: 'AddSscopeIdtateForm',
      fieldGroups:[{ columns: [
        { formFields: [{ id: "scopeId", label: "Scope Id", type: "text" } ]},
        { formFields: [{ id: "stateModelId", label: "State Model Id", type: "text" } ]}
      ] }],
      actions : [ 
        { id: "AddStatusBtn", actionName: "Add State", update: [{ resId:'StateLst' }], 
          actionURL: 'state-model', target: "modal" },
        { id: "ImportLink", link: 'Import JSON', linkURL: 'index.html?layout=UploadStateModel-nonav' }
      ]
    }
  })

  // --------------------------------------------------------------------------

  let editStatePage = gui.addPage( 'EditState-nonav' ) 
  editStatePage.title = 'Edit State'
  editStatePage.setPageWidth( '90%' )


  if ( ! cfg.MARKETPLACE_SERVER ) {
    editStatePage.addView({ 
      id: 'StateModelTitle', rowId: 'StateModelTitle', title: 'State Model',
      height: '90px', decor: 'decor',
      type : 'pong-form', resourceURL: 'state-model',
      moduleConfig : {
        id: 'StateModelTitleForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "id", label: "State Model Id", type: "text", readonly: true } ]},
          { formFields: [{ id: "title", label: "Title", type: "text" } ]},
          { formFields: [{ id: "by", label: "Author", type: "text" } ]},
          { formFields: [{ id: "description", label: "Description", type: "text", rows:2 } ]}
        ] }],
        actions : [ 
          { id: "Upd", actionName: "Save", actionURL: 'state-model', target: "modal" },
          { id: 'Init', onInit: 'GET', actionURL: 'state-model' },
        ]
      }
    })
  } else {
    editStatePage.addView({ 
      id: 'StateModelTitle', rowId: 'StateModelTitle', title: 'State Model',
      height: '110px', decor: 'decor',
      type : 'pong-form', resourceURL: 'state-model',
      moduleConfig : {
        id: 'StateModelTitleForm',
        fieldGroups:[{ columns: [
          { formFields: [{ id: "id", label: "State Model Id", type: "text", readonly: true } ]},
          { formFields: [
            { id: "title", label: "Title", type: "text" } ,
            { id: "standard", label: "Standard", type: "text" } 
          ]},
          { formFields: [
            { id: "by", label: "Author", type: "text" },
            { id: "license", label: "License", type: "text" } 
          ]},
          { formFields: [{ id: "description", label: "Description", type: "text", rows:2 } ]}
        ] }],
        actions : [ 
          { id: "Upd", actionName: "Save", actionURL: 'state-model', target: "modal" },
          { id: 'Init', onInit: 'GET', actionURL: 'state-model' },
        ]
      }
    })
  }

  


  editStatePage.addView({ 
    id: 'StateModel', rowId: 'StateModel', 
    title: 'State Model',
    height: '400px', decor: 'decor',
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
        { id: 'Edit', label: "", cellType: "button", width :'10%', icon: 'ui-icon-pencil', 
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
        { id: 'Edit', label: "", cellType: "button", width :'10%', icon: 'ui-icon-pencil', 
          method: "GET", setData: [ { resId : 'AddStateTransitionForm' } ] },
        { id: "transition",  label: "Transition",   width: "30%", cellType: "text" },
        { id: "stateIdTo",   label: "To State",     width: "20%", cellType: "text" },
        { id: "actionName",  label: "Action Name",  width: "20%", cellType: "text" },
        { id: "apiManaged",  label: "API Managed",  width: "10%", cellType: "checkbox" }
      ]
    }
  })
  editStatePageColumns2.addView({ id: 'AddStateTransitionForm', 
    title: 'Add / Update Transition', height: 'auto', 
    type : 'pong-form', resourceURL: 'state-model/transition'
  })

    // --------------------------------------------------------------------------

  let dashboardPg = gui.addPage( 'AppDashboardPanels-nonav' ) 
  dashboardPg.title    = 'Dashboard Panels'
  dashboardPg.navLabel = 'Dashboard Panels'
  dashboardPg.setPageWidth( '90%' )

  dashboardPg.dynamicRow( async ( staticRows, req, pageName ) => {
    let appId = req.query.id

    let rows =  [{ 
      id: 'AppDashboardInfo', rowId: 'AppDashboardInfo', title: 'Dashboard Configuration',
      type : 'pong-form', resourceURL: 'app/customize', decor: 'decor', height: '90px',
      moduleConfig : {
        description: "AppDashboardInfo",
        id: 'AppDashboardInfoForm',
        fieldGroups:[{ 
          columns: [
            { formFields: [
              { id: "appId", label: "App", type: "text", defaultVal: appId.replaceAll('_',' '), readonly: true }
            ]},
            { formFields: [
              { id: "boardCSV", label: "Boards", type: "text" }
            ]}
          ]
        }],
        actions: [
          { id: "UpdStartPage", actionName: " Update", actionURL: 'app', target: "modal" },
          { id: 'Init', onInit: 'GET', actionURL: 'app' }
        ]

      }
    }]

    rows.push({ id: 'Scopes', 
      rowId: 'DashboardPanels', title: 'Dashboard Panels',
      height: '520px',  decor: 'decor',
      type : 'pong-table', resourceURL: 'app/dashboard/panel',
      moduleConfig : {
        dataURL: "",
        rowId: 'panelId',
        cols: [
          { id: 'Edit', label: "", cellType: "button", width :'4%', icon: 'ui-icon-pencil', 
            method: "GET", setData: [ { resId : 'AddDashboardPanel' } ] },
          { id: "boardId",  label: "Dashboard", width: "15%", cellType: "text" },
          { id: "Title",  label: "Title", width: "15%", cellType: "text" },
          { id: "Type",   label: "Type",  width: "10%", cellType: "text" },
          { id: "CSS",    label: "CSS",   width: "6%", cellType: "text" },
          { id: "Pos",    label: "Pos",   width: "6%", cellType: "text" },
          { id: "Size",   label: "Size",  width: "6%", cellType: "text" },
          { id: "Entity", label: "Collection",width: "20%", cellType: "text" },
          { id: "Query",  label: "Query", width: "15%", cellType: "text" },
          { id: "Prop",   label: "Property",width: "15%", cellType: "text" }
        ]
      }
    })

    rows.push({  id: 'AddDashboardPanel', rowId: 'AddDashboardPanel',
      title: 'Add / Edit Dashboard Panel',  
      height: 'auto',  decor: 'decor',
      type : 'pong-form', resourceURL: 'app/dashboard/panel',
      moduleConfig : {
  //      label:'Add Scope',
  //      description: "Add Scope",
        id: 'AddDashboardPanelForm',
        fieldGroups:[{ columns: [
          { formFields: [
            { id: "panelId",  type: "text", readonly: true },
            { id: "appId",  type: "text", hidden: true, value: appId },
            { id: "boardId", label: "Dashboard Name", type: "text", defaultVal: 'Dashboard' },
            { id: "Type",   label: "Type",    type: "select",  
              options: addOptions(['Number','Text','ProgressBar','Distribution','Pie180',
                'Pie360','Table','Items','KeyValue','ItemBars','Graph','Bars','BarGraph'], 
                'Number', ['Pie360','Graph','ItemBars','KeyValue']) },
            { id: "Title",  label: "Title",   type: "text" },
            { id: "SubText",label: "Sub Text",type: "text" } 
          ]},
          { formFields: [
            { id: "PosX",   label: "Pos X",   type: "select",  
              options: addOptions(['0','1','2','3','4','5','6','7','8']) },
            { id: "PosY",   label: "Pos y",   type: "select",  
              options: addOptions(['0','1','2','3','4','5','6','7','8']) },
            { id: "Size",   label: "Size",    type: "select", 
              options: addOptions(['1x1','2x1','3x1','4x1','1x2','2x2','3x2','4x2','1x3','2x3','3x3','4x3']) }
          ]},  
          { formFields: [
            { id: "Entity", label: "Entity",  type: "text" },
            { id: "Query",  label: "Query",   type: "text", defaultVal: '{}' },
          ]},
          { formFields: [
            { id: "Prop",   label: "Prop ",   type: "text" },
            { id: "Descr",  label: "Descr",   type: "text" },
            { id: "Style",  label: "Style Prop",   type: "text" } 
          ]},
          { formFields: [
            { id: "Img",    label: "Img",   type: "text" },
            { id: "CSS",    label: "Style",  type: "select", options: addOptions(['L','M','S']) }
          ]}

        ] }],
        actions : [ 
          { id: "AddDashboardPanelBtn", actionName: "Add / Update", 
            update: [{ resId:'DashboardPanels' }, { resId: 'AppDashboardInfo'}],
            actionURL: 'app/dashboard/panel', target: "modal" },
          { id: "AddDashboardPanelReset", actionName: "Reset", method: 'GET',
            actionURL: 'app/dashboard/panel?_recId=_empty',
            setData: [{ resId : 'AddDashboardPanel' }] }
        ]
      }
    })
    return rows
  })

}

// ============================================================================

function uploadAppForm() {
  return {
    rowId: "AppUpload", title: "Upload App JSON",
    type : "pong-upload", resourceURL: "app/json",
    height: '100px', 
    moduleConfig: {
      update : [ "ImportLog" ],
      input: []
    }
  }
}

function uploadStateModelForm() {
  return {
    rowId: "StateModelUpload", title: "Upload State Model JSON",
    type : "pong-upload", resourceURL: "state-model/json",
    height: '100px', 
    moduleConfig: {
      update : [ "ImportLog" ],
      input: []
    }
  }
}

function uploadOut( uploadType ) {
  return {
    rowId: "ImportLog", title: "Import Output", resourceURL: uploadType,
    height: '500px'
  }
}

// ============================================================================

function uploadAppSwaggerForm() {
  return {
    rowId: "ApSwaggerUpload", title: "Upload App JSON",
    type : "pong-upload", resourceURL: "app/swagger",
    height: '150px', 
    moduleConfig: {
      update : [ "ImportLog" ],
      input: [
        { id: "appId", label: "App Id" },
        { id: "prefix", label: "Entity Prefix" },
      ],
      accept: ".json,.yaml,yml"
    }
  }
}

// ============================================================================

function addOptions( optArr, selected, disabledArr ) {
  let opts = []
  for ( let opt of optArr ) {
    let option = { option : opt }
    if ( selected == opt ) { 
      option.selected = true 
    } else if ( selected instanceof Array && selected.includes( opt )) { 
      option.selected = true 
    }
    if ( disabledArr instanceof Array && disabledArr.includes( opt )  ) {
      option.disabled = true
    }
    if ( [ 'Metric',  'Event', 'BLOB' ].includes( opt )  ) {
      option.disabled = true
    }
    opts.push( option )
  }
  return opts
}