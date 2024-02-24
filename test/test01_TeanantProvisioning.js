/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const axios  = require( 'axios' )

const API_URL = 'http://localhost:8888/app/adapter/scope'

describe( 'Tenant Provisioning', () => { 

    let scopeId = null

    it( 'Create a new root scope', async () => {
      let result = await axios.post( API_URL, {
        name          : 'mochatest',
        adminEmail    : 'mochatest@t.de',
        adminPassword : 'supasecret',
        apiId         : 'mochatest',
        apiKey        : 'mochatest-supasecret-id',
        owner         : 'ma-ha'
      })
      // console.log( result )
      assert.equal( result.status, 200 )
      scopeId = result.data.scopeId
    })


    it( 'List root scopes', async () => {
      let result = await axios.get( API_URL )
      assert.notEqual( result.data, null )
      assert.notEqual( result.data[ scopeId ], null )
    })

  }
)