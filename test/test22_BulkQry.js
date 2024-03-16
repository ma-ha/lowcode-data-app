/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/entity/'

let HEADERS = { 
  'app-id'     : 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

describe( 'Data Query Ops Arr', () => { 

  let scopeId = null
  let dtaUrl = ''
  let testUuidUrl = ''

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
    testUuidUrl = API_URL + scopeId + '/mocha-test-app/1.0.0/testUUID'
  })
  // --------------------------------------------------------------------------

  it( 'UUID: Query data', async () => {
    let result = await axios.get( testUuidUrl +'?query={"tag":"red"}', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    for ( let recId in result.data ) {
      assert.equal( result.data[ recId ].tag, 'red' )
    }
    // console.log( 'List result', result.data  )
  })


})