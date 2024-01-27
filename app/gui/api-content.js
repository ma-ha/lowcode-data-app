/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log   = require( '../helper/log' ).logger
const cfg   = require( 'config' )
const fs    = require( 'fs' )

exports: module.exports = { 
  init
}

let dbCache = {
}


async function init( svc ) {


  svc.get( '/get-free-trial', async (req, res) => {
    res.redirect( cfg.GUI_URL + 'index.html?layout=trial-nonav' ) 
  })

  svc.get( '/sitemap.txt',  async ( req, res ) => {
    res.header( 'Content-Type', 'text/plain').status( 200 ).send( 
      cfg.GUI_URL+'index.html\n'+
      cfg.GUI_URL+'index.html?layout=Docu/dashboard\n' +
      cfg.GUI_URL+'index.html?layout=Docu/installation\n' +
      cfg.GUI_URL+'index.html?layout=Docu/webchecks'
    )
  })

  svc.get( '/favicon.ico', async (req, res) => {
    res.status( 200 ).sendFile( __dirname + '/img/favicon.ico' )
  })
  
  svc.get( '/robots.txt', async (req, res) => {
    res.header( 'Content-Type', 'text/plain').status( 200 ).send( 
      'User-agent: *\n'+
      'Disallow: /api/'
    )
  })

  svc.get( '/content/:file/html', async (req, res) => {
    if ( dbCache[ '/content/'+req.params.file+'/html' ] ) {
      res.status( 200 ).send( dbCache[ '/content/'+req.params.file+'/html' ] )
    } else {
      res.status( 200 ).sendFile( __dirname + '/html/'+req.params.file+'.html' )
    }
  })
  
  svc.get( '/content/:file/jscript', async (req, res) => {
    res.status( 200 ).send( '' )
  })

  svc.get( '/docuhead/:title/html', async (req, res) => {
    let html = '<div id="welcome1" class="welcomediv">'
      +'<span class="pre-h1">Kubernetes Cluster Monitoring</span>'
      +'<h1>'+req.params.title+'</h1>'
      +'<a href="get-free-trial" class="linkbtn" target="_parent">TRY IT NOW</a>'
      +'</div>'
    res.status( 200 ).send( html )
  })


  svc.get( '/md/:lang/:file', async (req, res) => {
    // log.debug( 'GET md', req.params.lang, req.params.file )
    let page = await getPage( '/md', req.params.file, req.params.lang )
    if ( page ) {
      res.status( 200 ).send( page.md )
    } else {
      res.status( 400 ).send( 'Markdown not found' )
    }
  })


  svc.get( '/goto-ekosys/pong-form', ( req, res ) => {
    let form = {
      fieldGroups: [{ columns: [
        { formFields: [] }
      ] }],
      actions : [
        // RETIRE
        // { id:'ekosysAdd', actionName: 'Add New Cluster', target:'_parent',
        //   actionURL: cfg.GUI_URL + 'get-free-trial' },
        { id:'ekosysMng', actionName: 'Manage Clusters', target:'_parent',
          actionURL: cfg.GUI_URL + 'get-services' },
        { id:'ekosysSupp', actionName: 'Support', target:'_parent',
          actionURL: cfg.GUI_URL + 'get-support' }
      ]
    }
    //log.info( 'form', form )
    res.status( 200 ).send( form )
  })


  svc.post( '/get-support', ( req, res ) => {
    res.status( 200 ).send( cfg.EKOSYS_URL + '/index.html?layout=support' ) 
  })
  svc.post( '/get-services', ( req, res ) => {
    res.status( 200 ).send( cfg.EKOSYS_URL + '/index.html?layout=mngSubscription' ) 
  })
  
  svc.get( '/upgrade', ( req, res ) => {
    res.redirect( cfg.EKOSYS_URL + '/index.html?layout=mngService&serviceProperties=MngPlan&id='+ req.query.id ) 
  })
  svc.get( '/support', ( req, res ) => {
    res.redirect( cfg.EKOSYS_URL + '/index.html?index.html?layout=support&id='+ cfg.CLIENT_ID ) 
  })

  await initDbCache()
  setInterval( initDbCache, 600000 ) // refresh every 10 min
}

async function initDbCache() {
  log.debug( 'Init Cache' )
  let cache = {}
  // cache[ '/md/dashboard/EN' ]        = await db.loadMD( 'dashboard', 'EN' )
  // cache[ '/md/installation/EN' ]     = await db.loadMD( 'installation', 'EN' )
  // cache[ '/md/architecture/EN' ]     = await db.loadMD( 'architecture', 'EN' )
  // cache[ '/md/webchecks/EN' ]        = await db.loadMD( 'webchecks', 'EN' )
  // cache[ '/md/alarm-conditions/EN' ] = await db.loadMD( 'alarm-conditions', 'EN' )
  // cache[ '/md/pro-options/EN' ]      = await db.loadMD( 'pro-options', 'EN' )
  // cache[ '/md/alarming/EN' ]         = await db.loadMD( 'alarming', 'EN' )
  cache[ '/content/welcome/html' ]   = fs.readFileSync(  __dirname + '/html/welcome.html', 'utf-8' )
  dbCache = cache
}


async function getPage( type, file, lang ) {
  return "TODO"
  // if ( dbCache[ type+'/'+file+'/'+lang ] ) {
  //   log.debug( 'From Cache', type, file, lang )
  //   return dbCache[ type+'/'+file+'/'+lang ]
  // } else {
  //   return await db.loadMD( file, lang )
  // }
}
