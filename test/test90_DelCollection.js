/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/entity/'

let HEADERS = { 
  'app-id'     : 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

describe( 'Data Ops', () => { 

  let scopeId = null

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
  })

  it( 'Delete collection', async () => {
    let result = await axios.delete( API_URL + scopeId +'/test', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
  })
  
  it( 'Delete UUID collection', async () => {
    let result = await axios.delete( API_URL + scopeId +'/testUUID', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
  })
  
})