/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/entity/'

let HEADERS = { 
  'app-id'     : 'mochatest',
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

describe( 'Data Ops', () => { 

  let scopeId = null
  let dtaUrl = ''

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
    dtaUrl = API_URL + scopeId + '/mocha-test-app/1.0.0/test'
    // console.log( 'URL', dtaUrl )
  })


  it( 'Add 1st rec', async () => {
    let rec = {  Name : 'test' }
    let result = await axios.post( dtaUrl+'/1', rec, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
    // console.log( '1', result.data  )
  })

  it( 'Add 2nd rec', async () => {
    let rec = {  Name : 'test2' }
    let result = await axios.post( dtaUrl+'/2', rec, { headers: HEADERS } )
    // console.log( result )
    assert.equal( result.status, 200 )
    // console.log( '2', result.data  )
  })


  it( 'List data', async () => {
    let result = await axios.get( dtaUrl, { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    assert.notEqual( result.data['1'], null )
    assert.notEqual( result.data['2'], null )
    // console.log( '3', result.data  )
  })

  it( 'get 1st rec', async () => {
    let result = await axios.get( dtaUrl+'/1', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    // console.log( '4', result.data  )
  })


  it( 'Update 1st rec', async () => {
    let rec = {  Name : 'test1' }
    let result = await axios.post( dtaUrl+'/1', rec, { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    // console.log( '5', result.data  )
  })


  it( 'get 1st rec', async () => {
    let result = await axios.get( dtaUrl+'/1', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    // console.log( '6', result.data  )
  })

  it( 'Delete 1st rec', async () => {
    let result = await axios.delete( dtaUrl+'/1', { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    // console.log( '7', result.data  )
  })

  it( 'List data', async () => {
    let result = await axios.get( dtaUrl, { headers: HEADERS } )
    assert.equal( result.status, 200 )
    assert.notEqual( result.data, null )
    assert.equal( result.data['1'], undefined )
    assert.notEqual( result.data['2'], null )
    // console.log( '8', result.data  )
  })

  
})