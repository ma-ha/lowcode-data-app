const axios  = require( 'axios' )

exports: module.exports = { 
  getRootScopeId
}

const SCOPE_API_URL = 'http://localhost:8888/app/adapter/scope'
const SCOPE_HEADERS = { 'provisioning-key': 'CHANGE_ME' }

async function getRootScopeId () {
  let scopeId = null
  let result = await axios.get( SCOPE_API_URL, { headers: SCOPE_HEADERS }  )
  let scopeMap = result.data
  for ( let id in scopeMap ) {
    if ( scopeMap[ id ].name == 'mochatest' ) {
      scopeId = id
      break
    }
  }
   return scopeId
}