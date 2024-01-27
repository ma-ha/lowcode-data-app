/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log       = require( './helper/log' ).logger
const cfg       = require( 'config' )
const eh        = require( './even-hub' )
const fs        = require( 'fs' )
const { mkdir, writeFile, readFile, rename, rm, stat } = require( 'node:fs/promises' )

exports: module.exports = { 
  init,
  getAppList,
  getApp,
  getAppById,
  addApp,
  saveApp,
  getData,
  getDataById,
  getDataObjX,
  idExists,
  addDataObj
}

// ============================================================================
const DB_DIR = '../dta/'
const APP_TBL = DB_DIR + 'app.json' 

async function init() {
  data[ 'app' ] =  JSON.parse( await readFile( APP_TBL ) )
}

// ============================================================================
async function getAppList( scopeId, scopeTags ) {
  log.debug( 'getAppList', scopeId, scopeTags )
  let rootScope = scopeId
  if ( scopeId.indexOf('/') > 0 ) {
    rootScope = scopeId.substring(0, scopeId.indexOf('/') )  
  }
  // log.info( 'getAppList rootScope', rootScope )

  let appMap = await getData( 'app', rootScope )
  let apps = []
  // log.info( 'getAppList appMap', appMap )
  if ( appMap ) {
    for ( let appId in appMap ){
      let app = appMap[ appId ]
      // log.info( 'getAppList appId', appId,  app.scope )
      if ( app.scope[ scopeId ] ) {
        // log.info( '   >>> add' )
        apps.push({ 
          id: appId, 
          title: app.title,
          img   : ( app.img ? app.img : 'img/k8s-ww-conn.png' ),
          link  : appId,
          startPage : app.startPage
        })
      } else {
        for ( let tag of scopeTags ) {
          if ( app.scope[ '#'+tag ] ) {
            // log.info( '   >>> add #', tag )
            apps.push({ 
              id    : appId, 
              title : app.title,
              img   : ( app.img ? app.img : 'img/k8s-ww-conn.png' ),
              link  : appId,
              startPage : app.startPage
            })
            break
          }
        }
      }
    }
  } 
  return apps
}

async function getApp( scopeId, appId ) {
  log.debug( 'getApp', scopeId, appId )
  await syncTbl( 'app' )
  if ( data.app[ scopeId +'/'+ appId ] ) {
    return data.app[  scopeId +'/'+ appId  ]
  }
  return null
}

async function getAppById( fullAppId ) {
  log.debug( 'getApp',fullAppId )
  await syncTbl( 'app' )
  if ( data.app[fullAppId] ) {
    return data.app[  fullAppId ]
  }
  return null
}
async function addApp( fullAppId, app ) {
  log.info( 'getApp',fullAppId )
  await syncTbl( 'app' )
  data.app[ fullAppId ] = app
  await writeFile( APP_TBL, JSON.stringify( data[ 'app' ], null, '  ' ) )
}
async function saveApp( fullAppId, app ) {
  log.info( 'saveApp',fullAppId )
  data.app[ fullAppId ] = app
  await writeFile( APP_TBL, JSON.stringify( data[ 'app' ], null, '  ' ) )
}
// ============================================================================

// tbl param can be like "1000city" or "1000/region-mgr/1.0.0/city"
async function getData( tbl, scopeId ) {  
  log.debug( 'getData',  tbl, scopeId )
  let table = tbl
  let inheritData = false
  if ( tbl.indexOf('/') > 0 ) {
    let tlbComp = tbl.split('/')
    table = tlbComp[0] + tlbComp[3]
    log.debug( 'getData table',  table )
    let app = await getAppById(  tlbComp[0] +'/'+ tlbComp[1] +'/'+ tlbComp[2] )
    let entity = app.entity[ tlbComp[3] ]
    if ( entity.scope == 'inherit' || entity.scope == 'inherit-readonly' ) { 
      inheritData = true 
    }
  } else {

  }
  await syncTbl( table )
  let result = {}
  for ( let recId in data[ table ] ) {
    log.debug( 'getData dta', recId, inheritData  )
    if ( inheritData ) {
      if ( scopeId.indexOf( data[ table ][ recId ].scopeId ) >= 0 ) {
        result[ recId ] = data[ table ][ recId ]
      }
    } else {
      if ( data[ table ][ recId ].scopeId == scopeId ){
        result[ recId ] = data[ table ][ recId ]
      }
    }
  }
  return result
}


async function getDataById( tbl, id ) {
  log.debug( 'getDataById',tbl, id  )
  await syncTbl( tbl )
  if ( data[ tbl ] && data[ tbl ][ id ] ) {
    return data[ tbl ][ id ] 
  }
  return null
}

async function scopeInherited( rootScopeId, appId, appVersion, entityId ) {
  let inherit = false
  try {
    let appIdx = rootScopeId +'/'+ appId +'/'+ appVersion
    let app = data.app[ appIdx ]
    let entity = app.entity[ entityId ]
    if ( entity.scope == 'inherit' || entity.scope == 'inherit-readonly' ) { 
      inherit = true 
    }
  } catch ( exc ) { log.error( '', exc ) }
  
  return inherit
}

async function idExists( tbl, id  ) {
  log.info( 'idExists', tbl, id )
  await syncTbl( tbl )
  if ( data[ tbl ][ id ] ) {
    return data[ tbl ][ id ] 
  }
  return null
}

async function getDataObjX( rootScopeId, appId, appVersion, entityId, userScopeId, id  ) {
  log.debug( 'getDataObjX', rootScopeId, appId, appVersion, entityId, userScopeId, id )
  let tbl = rootScopeId + entityId
  await syncTbl( tbl )
  let inherit = await scopeInherited( rootScopeId, appId, appVersion, entityId )
  let result = null
  if ( id &&  data[ tbl ][ id ] ) { 
    // single rec by id
    let rec = data[ tbl ][ id ] 
    if ( scopeOK( userScopeId, rec.scopeId  , inherit ) ) {
      result = rec
    }
  
  } else {
    // array of data fo scope
    result = []
    for ( let recId in data[ tbl ] ) {
      let rec = data[ tbl ][ recId ]
      if ( scopeOK( userScopeId, rec.scopeId, inherit ) ) {
        result.push( rec )  
      }
    }
  }
  return result
}

function scopeOK( userScope, recScope, inherit ) {
  let ok = false
  if ( inherit ) { 
    if ( userScope.startsWith( recScope ) ) {
      ok = true 
    }
  } else if ( userScope == recScope ) {
    ok = true 
  }
  return ok
}


async function addDataObj( tbl, id, obj ) {
  log.info( 'addDataObj', tbl, id, obj)
  await syncTbl( tbl )
  data[ tbl ][ id ] = obj

  let dbFile = DB_DIR + tbl + '.json'
  await writeFile( dbFile, JSON.stringify( data[ tbl ], null, '  ' ) )
  
  eh.publishDataChgEvt( 'add', obj.scopeId+'/'+id, tbl, obj )
  return true
}

async function syncTbl( tbl ) {
  log.info( 'syncTbl', tbl )
  let dbFile = DB_DIR + tbl + '.json'
  if ( ! fs.existsSync( dbFile ) ) {
    await writeFile( dbFile, '{}' )
  }
  if ( ! data[ tbl ] ) {
    log.info('>> readFile', dbFile)
    data[ tbl ] =  JSON.parse( await readFile( dbFile ) )
  } 
}


let data = {
  app : {
    "dev/locode-entity-editor/0.1.0" : {
      scopeId: 'dev',
      title: "Entity Editor",
      entity : {
        app: {
          title: "App",
          scope: "inherit",
          maintainer: ["dev"],
          properties : {
            title    : { type: "String", label: 'App Name'  },
            entity   : { docMap: "appEntity", label: 'Entities' },
            page     : { docMap: "appPage", label: 'App Page' }
          }
        },
        appEntity: {
          title: "Entity",
          scope: "inherit",
          maintainer: ["dev"],
          properties : {
            name       : { type: "String" },
            scope      : { select: ["inherit", "inherit-readonly", 'no-inherit' ] },
            maintainer : { select: ["appUser","admin"] },
            masterData : { type: "Boolean" },
            property   : { docMap: "appEntityProperty" }
          }
        },
        // appPage: {
        //   title: "App Page",
        //   scope: "inherit",
        //   maintainer: ["dev"],
        //   properties : {
        //     title : { type: "String", label: 'Page'  },
        //     view  : { docMap: "appView" },
        //     tab   : { docMap: "appTabView" }
        //   }
        // }, 
        appTabView: {
          title: "Tab View",
          scope: "inherit",
          maintainer: ["dev"],
          properties : {
            title : { type: "String", label: 'Page'  },
            views : { docMap: "appView" }
          }
        },
        appView: {
          title: "View",
          scope: "inherit",
          maintainer: ["dev"],
          properties : {
            title   : { type: "String" },
            type    : { type: "Select", options: ["table","form"] },
            entity  : { selectRef: "appEntity" },
            search  : { type: "Boolean" },
            edit    : { type: "Boolean" },
            add     : { type: "Boolean" }
          }
        },
        appEntityProperty: {
          title: "Property",
          scope: "inherit",
          maintainer: ["dev"],
          properties : {
            Name        : { type: "String" },
            Type        : { type: "Select", options: [],  },
            Can_be_null : { type: "Boolean" } ,
            Short       : { type: "Boolean" } ,
            Filter      : { type: "Boolean" } ,
            Options     : { selectRef: "appSelectValues" }
          }
        },
        appSelectValues: {
          title: "Select Values",
          scope: "inherit",
          maintainer: ["dev"],
          properties : {
            Key   : { type: "String" },
            Value : { type: "String" }
          }
        }
      },
      startPage: 'app', 
      // page: {
      //   start: {
      //     title: 'Customize',
      //     tab: {
      //       Apps: {
      //         title: 'Apps',
      //         views: {
      //           AppTable: {
      //             title: "Apps",
      //             type: "table",
      //             entity: "app",
      //             search: false,
      //             edit: true,
      //             add : false
      //           } 
      //         }
      //       }
      //     }
      //   }
      // },
      view : {
        Apps: {
          title: "Apps",
          type: "table",
          entity: "app",
          edit: true,
          add : true
        },
        Selects: {
          title: "Selects",
          type: "table",
          entity: "appSelectValues",
          add : true,
          edit: true
        }
      },
      scope: {
        "dev": { role: ["dev"], srcURL: "" }
      }
    },

    "1000/device-inventory-app/1.0.0": {
      type : 'dev/locode-entity-editor/0.1.0',
      scopeId: '1000',
      title: "Order Device",
      require: {
        // "region-mgr/1.0.0": { srcURL: "" }
      },
      entity : {
        DeviceOrder : {
          title: "Device Order",
          scope: "inherit",
          maintainer: ["appUser"],
          properties : {
            OderNo : { type: "String" },
            OrderDate  : { type: "Date" },
            OderStatus : { select: ["open","in progress","shipped","delivered"] },
            ItemPrice  : { type: "String" },
            Taxes      : { type: "String" },
            TotalPrice : { type: "String" },
            Shipping   : { type: "String" },
            ShipmentTracking : { type: "String" },
            Reorder    : { type: "Action" },
            Invoice    : { ref: "Invoice" },
            Devices    : { selectRef : "1000/device-mgr-app/1.0.0/DeviceHardware" },
          },
          divs : [
            { id: "O1",
              divs: [ {prop:'OrderNo'}, {prop:'OrderDate'}, {prop:'OderStatus'} ] 
            }, 
            { id: "O1",
              divs: [ {prop:'Devices'},{prop:'ItemPrice'}, {prop:'Taxes'}, {prop:'TotalPrice'} ] 
            }, 
            { id: "O1",
              divs: [ {prop:'Shipping'}, {prop:'ShipmentTracking'}  ] 
            }, 
            { id: "O1",
              divs: [ {prop:'Reorder'}, {prop:'Invoice'}  ] 
            }, 
          ]
        },
        Invoice : {
          title: "Invoice",
          scope: "inherit",
          maintainer: ["appUser"],
          properties : {
            InvoiceNo : { type: "String" },
          }
        }
      },
      startPage: ['DeviceOrder', 'Invoice'], 
      role: [],
      scope: {
        "#region": { role: ["appUser"], srcURL: "" },
        "#city": { role: ["appUser"], srcURL: "" }
      }
    },


    "1000/device-mgr-app/1.0.0": {
      type : 'dev/locode-entity-editor/0.1.0',
      scopeId: '1000',
      title: "Device Manager",
      require: {
        // "region-mgr/1.0.0": { srcURL: "" }
      },
      entity : {
        Device : {
          title: "Device",
          scope: "no-inherit",
          maintainer: ["appUser"],
          properties : {
            DeviceNo    : { type: "String" },
            Status      : { select: ["Ordered","Inventory","Planned","Active","Defect","Decommissioned"] },
            Hardware    : { selectRef : "1000/device-mgr-app/1.0.0/DeviceHardware" },
            Description : { type: "String" },
            ConnType    : { select: ["COAP (TMA SIM)","COAP (1NCE SIM)","LW-M2M (DT SIM)","LORA","MQTT (DT SIM)","MQTT (TMA SIM)","UDP (TMA SIM)","UDP (1NCE SIM)"] },
            Tags        : { multiSelectRef : "1000/device-mgr-app/1.0.0/DeviceTags" }
          }
        },
        DeviceHardware : {
          title: "Hardware",
          scope: "inherit",
          maintainer: ["appUser"],
          properties : {
            Manufacturer : { type: "String" },
            Name         : { type: "String" },
            Revision     : { type: "String" },
            LinkType     : { select: ["BT-LE","LAN","LTE","LTE-M","LORA","NB-IoT","MODBUS","...other"] }
          }
        },
        DataLink : { 
          title: "Data Link",
          scope: "inherit",
          maintainer: ["appUser"],
          properties : {
            LinkType : { select: ["WebHook","Azure Event Hub","AWS IoT Central","CoT"] },
            Comment : { type: "String" },
            ConnectionString : { type: "String" },
            TrafficStats  : { type: "Metrics" },
            DeviceStats  : { type: "Metrics" },
            DeviceTags   : { multiSelectRef : "1000/device-mgr-app/1.0.0/DeviceTags" }
          }
        },
        DeviceTags : {
          title: "Tags",
          scope: "inherit",
          maintainer: ["appUser"],
          properties : {
            Tag         : { type: "String" },
            Description : { type: "String" }
          }
        }
      },
      startPage: [ 'Device', 'DataLink', 'DeviceHardware', 'DeviceTags' ], 
      role: [],
      scope: {
        "#region": { role: ["appUser"], srcURL: "" },
        "#city": { role: ["appUser"], srcURL: "" }
      }
    },


    "1000/city-mgr-app/1.0.0": {
      type : 'dev/locode-entity-editor/0.1.0',
      scopeId: '1000',
      title: "City Manager",
      require: {
        "region-mgr/1.0.0": { srcURL: "" }
      },
      entity : {
        city : {
          title: "City",
          scope: "inherit",
          maintainer: ["appUser"],
          properties : {
            Name   : { type: "String" },
            ZIP    : { type: "String" },
            Region : { selectRef : "1000/region-mgr/1.0.0/region" }
          }
        }
      },
      startPage: 'city', 
      // page: {
      //   start: {
      //     title: 'Customize',
      //     tab: {
      //       Apps: {
      //         title: 'Apps',
      //         views: {
      //           main: {
      //             type: "table",
      //             entity: "city",
      //             edit: true,
      //             add : true
      //           }
      //         }
      //       }
      //     }
      //   }  
        
      // },
      role: [],
      scope: {
        "#region": { role: ["appUser"], srcURL: "" }
      }
    },

    "1000/region-mgr/1.0.0": {
      type : 'dev/locode-entity-editor/0.1.0',
      scopeId: '1000',
      title: "Region Manager",
      require: {},
      entity : {
        region : {
          title: "Region",
          scope: "inherit",
          maintainer: ["region-manager"],
          properties : {
            Name : { type: "String" },
            Short: { type: "String" },
            Size : { select: ['S','M','L'] },
            CitiesInRegion : { sub: '1000/city-mgr-app/1.0.0/city', prop: 'Region', label: 'Cities' }
          }
        }
      },
      startPage: 'region', 
      // page: {
      //   start: {
      //     title: 'Customize',
      //     tab: {
      //       Apps: {
      //         title: 'Apps',
      //         views: {
      //           main: {
      //             title: "Region List",
      //             type: "table",
      //             entity: "region",
      //             edit: true,
      //             add : true
      //           }
      //         }
      //       }
      //     }
      //   }
      // },
      role: ["region-manager"],
      scope: {
        "1000": { "role": ["admin"], "srcURL":"" }
      }
    },

    "1000/city-light-mgr/1.0.0": {
      type : 'dev/locode-entity-editor/0.1.0',
      scopeId: '1000',
      title: "City Light Manager",
      require: {
        "city-mgr/1.0.0": { "srcURL":"" }
      },
      entity : {
        gateway : {
          title: "MgrGW",
          scope: "inherit",
          maintainer: ["region-manager"],
          properties : {
            Name : { type: "String" }
          }
        }
      },
      startPage: 'gateway',
      scope: {
        "#city": { "role": ["user"], "srcURL" :"" }
      }
    }
  }
}