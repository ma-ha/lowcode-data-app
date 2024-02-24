/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const SCOPE_API_URL = 'http://localhost:8888/app/adapter/scope'
const USER_API_URL = 'http://localhost:8888/app/adapter/user'

let HEADERS = { 'provisioning-key': 'CHANGE_ME' }

describe( 'Tenant Provisioning', () => { 

  let scopeId = null

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
  })

  it( 'Delete admin user', async () => {
    let result = await axios.delete( USER_API_URL,{ data: { userId: 'mochatest@t.de' }, headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.equal( result.data.status, 'OK' )
  })


  it( 'Delete SP', async () => {
    let result = await axios.delete( USER_API_URL, { data: { userId: 'mochatest' }, headers: HEADERS  }  )
    assert.equal( result.status, 200 )
    assert.equal( result.data.status, 'OK' )
  })


  it( 'Delete root scope', async () => {
    let result = await axios.delete( SCOPE_API_URL, { data: { scopeId: scopeId }, headers: HEADERS  }  )
    assert.equal( result.status, 200 )
    assert.equal( result.data.status, 'OK' )
  })
})