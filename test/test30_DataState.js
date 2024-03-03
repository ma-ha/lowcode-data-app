/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/entity/'

let HEADERS = { 
  'app-id'     : 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

describe( 'Data State', () => { 

  let scopeId = null
  let dtaUrl = ''
  
  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
    dtaUrl = API_URL + scopeId + '/mocha-test-app/1.0.0/TestState'
    console.log( 'URL', dtaUrl )
  })


  it( 'Cre Should Fail', async () => {
    let rec = {  Descr : 'test2' }
    try {
      await axios.post( dtaUrl+'/state/null/Create', rec, { headers: HEADERS } )      
    } catch (error) {
      assert.equal( error.response.status, 400 )
    }
  })

  let id = null
  it( 'Cre rec', async () => {
    let rec = {  Name : 'test' }
    let result = await axios.post( dtaUrl+'/state/null/Create', rec, { headers: HEADERS } )
    // console.log( '1', result.data  )
    // console.log( result )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data.id, null )
    assert.equal( result.data.doc._state, 'Open' )
    id = result.data.id
  })

  it( 'Search by status', async () => {
    let result = await axios.get( dtaUrl+'/state/Open', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data.length, 0 )
  })


  it( 'Change state w/o id must fail', async () => {
    let rec = { 
      Desc : 'test2' 
    }
    try {
      await axios.post( dtaUrl+'/state/null/Close', rec, { headers: HEADERS } )      
    } catch (error) {
      assert.equal( error.response.status, 400 )
    }
  })

  it( 'Change state', async () => {
    let rec = { 
      id: id,
      Desc : 'test2' 
    }
    let result = await axios.post( dtaUrl+'/state/Open/Close', rec, { headers: HEADERS } )      
    assert.equal( result.status, 200 )
    assert.equal( result.data.doc._state, 'Closed' )

  })

})