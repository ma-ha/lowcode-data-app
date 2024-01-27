/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const assert = require( 'assert' )
const cfg    = require( 'config' )
const dta = require( '../app-dta' )

describe( 'Test AppDta', () => { 

    // before( async () => { await db.init() })


    it( 'Alarm Check Run', async () => {
      let scopes = await userDta.getScopeList( "mh@t.de" )
      console.log( scopes )
    })

  }
)