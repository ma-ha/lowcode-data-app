/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const express = require( 'express' )
const log     = require( './log' ).logger
const cfg     = require( 'config' )
const pjson   = require( './package.json' )
const weblog  = require( './app-weblog' ) 

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
    rowId: 'User', title: 'User',  height: '500px', 
    type : 'pong-table', resourceURL: 'user',
    moduleConfig : {
      dataURL: "",
      rowId: "id",
      cols: [
        { id: "type",   label: "Type", width: "7%", cellType: "text" },
        { id: "id",     label: "Id",   width: "20%", cellType: "text" },
        { id: "name",   label: "Name", width: "12%", cellType: "text" },
        { id: "lastLogin",label: "Last Login [UTC]", width: "10%", cellType: "text" },
        { id: "expires",label: "Expires [UTC]", width: "10%", cellType: "text" },
        { id: "scope",  label: "Scope", width: "5%", cellType: "text" },
        { id: "dev",    label: "Dev Scope", width: "5%", cellType: "text" },
        { id: "admin",  label: "Admin Scope", width: "5%", cellType: "text" },
        { id: "secret", label: "", width: "10%", cellType: "text" },
        { id: "subs",   label: "", width: "10%", cellType: "text" }
      ]
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
            options:  addOptions([ "never", "3m", '6m', '1y' ]) } ]}
      ] }],
      actions : [ 
        { id: "PropertyAddBtn", actionName: "Invite", update: [{ resId:'User' }], 
          actionURL: 'user', target: "modal" }
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

  userPg.addView({ id: 'AddPrincipal', 
    title: 'Add API Account',  height: '120px', 
    type : 'pong-form', resourceURL: 'user',
    moduleConfig : {
      id: 'AddPrincipalForm',
      fieldGroups:[{ columns: [
        { formFields: [{ id: "name",label: "App Name", type: "text" } ]},
        { formFields: [{ id: "expire",  label: "Expires", type: "select", 
            options:  addOptions([ '6m', '1y', '2y' ]) } ]}
      ] }],
      actions : [ 
        { id: "PropertyAddBtn", actionName: "Add Account", update: [{ resId:'User' }], 
          actionURL: 'user', target: "modal" }
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