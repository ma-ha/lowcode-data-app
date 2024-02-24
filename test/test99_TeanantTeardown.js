/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )

const SCOPE_API_URL = 'http://localhost:8888/app/adapter/scope'
const USER_API_URL = 'http://localhost:8888/app/adapter/user'

describe( 'Tenant Provisioning', () => { 

  it( 'Delete admin user', async () => {
    let result = await axios.delete( USER_API_URL,  { data: { userId: 'mochatest@t.de' } } )
    assert.equal( result.status, 200 )
    assert.equal( result.data.status, 'OK' )
  })


  it( 'Delete SP', async () => {
    let result = await axios.delete( USER_API_URL, { data: { userId: 'mochatest' } } )
    assert.equal( result.status, 200 )
    assert.equal( result.data.status, 'OK' )
  })


  let scopeId = null
  it( 'List root scopes', async () => {
    let result = await axios.get( SCOPE_API_URL )
    // console.log( result.data )
    assert.equal( result.status, 200 )
    let scopeMap = result.data
    for ( let id in scopeMap ) {
      if ( scopeMap[ id ].name == 'mochatest' ) {
        scopeId = id
        break
      }
    }
    assert.notEqual( scopeId, null )
  })

  it( 'Delete root scope', async () => {
    let result = await axios.delete( SCOPE_API_URL, { data: { scopeId: scopeId } } )
    assert.equal( result.status, 200 )
    assert.equal( result.data.status, 'OK' )
  })
})