/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/entity/'

let HEADERS = { 
  'app-id'     : 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

describe( 'Data Ops Arr', () => { 

  let scopeId = null
  let dtaUrl = ''
  let testUuidUrl = ''

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
    testUuidUrl = API_URL + scopeId + '/mocha-test-app/1.0.0/testUUID'
    // console.log( 'URL', dtaUrl )
  })
  // --------------------------------------------------------------------------
  let uid = null

  it( 'Add rec with auto id', async () => {
    let rec = { 
      name : 'test3', 
      testRef : '2'
    }
    let result = await axios.post( testUuidUrl, rec, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
    // console.log( 'add one', result.data  )
    assert.notEqual( result.data.id, null )
    uid = result.data.id
  })

  // --------------------------------------------------------------------------

  let idArr = ['-']
  it( 'Add rec array with auto id', async () => {
    let recs = [
      { name : 't1', testRef : '2' },
      { name : 't2', testRef : '2' },
      { name : 't3', testRef : '2' },
      { name : 't4', testRef : '2' },
      { name : 't5', testRef : '2' },
    ]
    let result = await axios.post( testUuidUrl, recs, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
    // console.log( 'add arr', result.data  )
    assert.notEqual( result.data.idArr, null )
    assert.notEqual( result.data.docMap, null )
    idArr = result.data.idArr
  })

  let docMap = {}

  it( 'UUID: List data', async () => {
    let result = await axios.get( testUuidUrl, { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    assert.notEqual( result.data[ idArr[0] ], null )
    assert.notEqual( result.data[ idArr[2] ], null )
    assert.notEqual( result.data[ idArr[1] ], null )
    // console.log( 'List result', result.data  )
    docMap = result.data
  })
  // --------------------------------------------------------------------------

  it( 'Update rec array ', async () => {
    let docArr = []
    for ( let id in docMap ) {
      docMap[ id ].addProp = 'blah'
      docArr.push( docMap[ id ] )
    }
    // console.log( docArr )
    let result = await axios.put( testUuidUrl, docArr, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
    // console.log( 'upd arr result', result.data  )
    assert.notEqual( result.data.docMap, null )
  })

})