/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )
const helper = require( './helper' )

const API_URL = 'http://localhost:8888/app/adapter/scope/'

let HEADERS = { 
  'app-id'     : 'mochatest',
  'app-secret' : 'mochatest-supasecret-id'
}

describe( 'Sub Scope', () => { 

  let scopeId = null

  before( async () => { 
    scopeId = await helper.getRootScopeId()
    assert.notEqual( scopeId, null )
  })


  it( 'List sub scopes')
  it( 'Create a new sub scope')
  it( 'List sub scopes')
  it( 'Change the new sub scope')
  it( 'List sub scopes')
  
})