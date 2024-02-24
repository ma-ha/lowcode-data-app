/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/app/'

let HEADERS = { 
  'app-id     ': 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

let app = {
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
        "Name": {
          "type": "String"
        }
      }
    }
  },
  "startPage": "test",
  "role": [
    "appUser"
  ],
  "scope": {
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
    let result = await axios.post( url, app, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
    scopeId = result.data.scopeId
  })

})