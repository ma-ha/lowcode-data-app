/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/app/'
const STATE_URL = 'http://localhost:8888/app/adapter/state/'

let HEADERS = { 
  'app-id'     : 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

const APP = {
  "scopeId": null,
  "title": "MochaTest",
  "require": {
  },
  "entity": {
    "test": {
      "title": "Test",
      "scope": "inherit",
      "maintainer": [
      ],
      "properties": {
        "id": {
          "type": "String"
        },
        "Name": {
          "type": "String"
        },
        "@type": {
          "apiString": "test",
          "type": "API static string"
        }
      }
    },
    "testUUID": {
      "title": "testUUID",
      "scope": "inherit",
      "maintainer": [
        "appUser"
      ],
      "properties": {
        "name": {
          "label": "Name",
          "type": "String"
        },
        "testRef": {
          "type": "SelectRef",
          "selectRef": "TODO"
        },
        "id": {
          "type": "UUID-Index"
        },
        "@type": {
          "apiString": "testUUID",
          "type": "API static string"
        }
      },
      "noDelete": true,
      "noEdit": true
    },
    "TestState": {
      "title": "Test",
      "scope": "inherit",
      "maintainer": [
      ],
      "properties": {
        "id": {
          "type": "UUID"
        },
        "Name": {
          "type": "String",
          "stateTransition": {
            "null_Create": true
          },
        },
        "Desc": {
          "type": "String",
          "stateTransition": {
            "Open_Close": true
          }
        }
      },
      "stateModel": "TestState"
    },
    "testRegExp": {
      "title": "testReGeXP",
      "scope": "inherit",
      "maintainer": [
        "appUser"
      ],
      "properties": {
        "id": {
          "type": "UUID-Index"
        },
        "testStr": {
          "type": "String",
          "regExp": "[A-Za-z]{3}"
        }
      },
      "noDelete": true,
      "noEdit": true
    },

  },
  "startPage": "test",
  "role": [
    "appUser"
  ],
  "scope": {
  }
}

const STATE_MODEL = {
  "state": {
    "null": {
      "actions": {
        "Create": {
          "to": "Open"
        }
      }
    },
    "Open": {
      "actions": {
        "Close": {
          "to": "Closed"
        }
      }
    },
    "Closed": {
      "actions": {
        "Reopen": {
          "to": "Open"
        }
      }
    }
  }
}

describe( 'Create App', () => { 

  let scopeId = null

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
  })


  it( 'Create a test app', async () => {
    let url = API_URL + scopeId + '/mocha-test-app/1.0.0'
    APP.entity.testUUID.properties.testRef.selectRef = scopeId + '/mocha-test-app/1.0.0/test'
    // console.log(  APP.entity.testUUID )
    let result = await axios.post( url, APP, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
  })


  it( 'Create State Model', async () => {
    const URL = STATE_URL + scopeId + '/TestState'
    let result = await axios.post( URL, STATE_MODEL, { headers: HEADERS } )
    assert.equal( result.status, 200 )
  })

  it( 'Get State Model', async () => {
    const URL = STATE_URL + scopeId + '/TestState'
    let result = await axios.get( URL, { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
  })

  
  it( 'List root scopes', async () => {
    let result = await axios.get( API_URL + scopeId, { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
  })


  it( 'Get new app', async () => {
    let result = await axios.get( API_URL + scopeId  +'/mocha-test-app/1.0.0', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
  })
  
})