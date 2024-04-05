/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const express = require( 'express' )
const log     = require( '../helper/log' ).logger
const pjson   = require( '../package.json' )
const weblog  = require( './weblog' ) 

exports: module.exports = {
  init
}


async function init( ) {
  log.info( 'Starting user gui' )

  let userPg = gui.addPage( 'Users' ) 
  userPg.title    = 'Users'
  userPg.navLabel = 'Users'
  userPg.setPageWidth( '90%' )

  userPg.addView({  id: 'User',
    rowId: 'User', title: 'User',  height: '520px', 
    type : 'pong-table', resourceURL: 'user',
    moduleConfig : {
      dataURL: "",
      rowId: "id",
      cols: [
        { id: "type",   label: "Type", width: "6%", cellType: "text" },
        { id: "id",     label: "Id",   width: "20%", cellType: "text" },
        { id: "name",   label: "Name", width: "10%", cellType: "text" },       
        { id: "lastLogin",label: "Last Login [UTC]", width: "10%", cellType: "text" },
        { id: "expires",label: "Valid", width: "5%", cellType: "text" },
        { id: "scope",  label: "Scope", width: "5%", cellType: "text" },
        { id: "dev",    label: "Dev Scope", width: "5%", cellType: "text" },
        { id: "admin",  label: "Admin Scope", width: "5%", cellType: "text" },
        { id: "secret", label: "", width: "7%", cellType: "text" },
        { id: "subs",   label: "", width: "7%", cellType: "text" },
        { id: 'Edit', label: "&nbsp;", cellType: "button", width :'4%', icon: 'ui-icon-pencil', 
          method: "GET", setData: [ { resId : 'AddUser' }, { resId : 'AddPrincipal' } ] } ,
        { id: 'Lock', label: "&nbsp;", cellType: "button", width :'4%', icon: 'ui-icon-locked', 
          method: "POST", URL: 'user/lock', target: "modal" } ,
        { id: 'ResetPwd', label: "&nbsp;", cellType: "button", width :'4%', icon: 'ui-icon-unlocked', 
          method: "POST", URL: 'user/reset', target: "modal" } 
      ],
      pollDataSec: "5",
    }
  })

  userPg.addView({ id: 'AddUser', 
    title: 'Invite User',  height: '120px', 
    type : 'pong-form', resourceURL: 'user',
    moduleConfig : {
      id: 'AddUserForm',
      fieldGroups:[{ columns: [
        { formFields: [{ id: "email",label: "E-Mail", type: "text" } ]},
        { formFields: [{ id: "name",label: "Name", type: "text" } ]},
        { formFields: [{ id: "dev",  label: "Developer", type: "checkbox" } ]},
        { formFields: [{ id: "admin",  label: "Admin", type: "checkbox" } ]},
        { formFields: [{ id: "expire",  label: "Expires", type: "select", 
            options:  addOptions([ "never", "3m", '6m', '1y' ]) } ]},
        { formFields: [{ id: "uid",  type: "text", hidden: true, defaultVal: 'add' } ]},
        { formFields: [{ id: "mode", type: "text", hidden: true, defaultVal: 'add' } ]}
      ] }],
      actions : [ 
        { id: "AddUserBtn", actionName: "Add/Update", update: [{ resId:'User' }], 
          actionURL: 'user', target: "modal" },
        { id: "ResetUserBtn", actionName: "Reset", method: 'GET',
          actionURL: 'user?id=empty', setData:  [ { resId : 'AddUser'  } ] }
      ]
    }
  })

  userPg.addView({ id: 'AddPrincipal', 
    title: 'Add API Account',  height: '120px', 
    type : 'pong-form', resourceURL: 'user',
    moduleConfig : {
      id: 'AddPrincipalForm',
      fieldGroups:[{ columns: [
        { formFields: [{ id: "sp_name",label: "App Name", type: "text" } ]},
        { formFields: [{ id: "sp_expire",  label: "Expires", type: "select", 
            options:  addOptions([ '6m', '1y', '2y' ]) } ]},
        { formFields: [{ id: "sp_id",  type: "text", hidden: true, defaultVal: 'add' } ]},
        { formFields: [{ id: "mode", type: "text", hidden: true, defaultVal: 'add' } ]}
      ] }],
      actions : [ 
        { id: "SpAddBtn", actionName: "Add/Update API Account", update: [{ resId:'User' }], 
          actionURL: 'user', target: "modal" },
        { id: "ResetSpBtn", actionName: "Reset", method: 'GET',
          actionURL: 'user?id=empty_sp', setData:  [ { resId : 'AddPrincipal'  } ] }
      ]
    }
  })


  let appSubPg = gui.addPage( 'AppSubscription-nonav' ) 
  appSubPg.title    = 'App Subscriptions'
  appSubPg.navLabel ='App Subscriptions'
  appSubPg.setPageWidth( '90%' )
  appSubPg.addView({  id: 'AppSubscription',
    rowId: 'AppSubscription', title: 'AppSubscription',  height: '500px', 
    type : 'pong-table', resourceURL: 'event/subscription',
    moduleConfig : {
      dataURL: "",
      rowId: "name",
      cols: [
        { id: "name",    label: "Name",    width: "7%", cellType: "text" },
        { id: "scope",   label: "Scope",   width: "20%", cellType: "text" },
        { id: "filter",  label: "Filter",  width: "20%", cellType: "text" },
        { id: "webhook", label: "WebHook", width: "20%", cellType: "text" },
        { id: "creDt",   label: "Created [UTC]",  width: "10%", cellType: "text" }
      ]
    }
  })

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