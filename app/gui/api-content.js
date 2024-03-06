/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log   = require( '../helper/log' ).logger
const fs    = require( 'fs' )
const { readFile } = require( 'node:fs/promises' )

exports: module.exports = { 
  init
}

let dbCache = {
}

let cfg = {}
async function init( svc, appConfig ) {
  cfg = appConfig

  svc.get( '/get-free-trial', async (req, res) => {
    res.redirect( cfg.GUI_URL + 'index.html?layout=trial-nonav' ) 
  })

  svc.get( '/sitemap.txt',  async ( req, res ) => {
    res.header( 'Content-Type', 'text/plain').status( 200 ).send( 
      cfg.GUI_URL+'index.html'
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
    if ( cfg.CONTENT_PATH ) {
      res.status( 200 ).sendFile( cfg.CONTENT_PATH +'/'+ req.params.file+'.html' )
      return
    }

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

  svc.get( '/docuhead/:title/jscript', async (req, res) => {
    res.status( 200 ).send()
  })

  svc.get( '/md/:lang/:file', async (req, res) => {
    log.info( 'GET md', req.params.lang, req.params.file )
    let page = await getPage( '/md', req.params.file, req.params.lang )
    if ( page ) {
      res.status( 200 ).send( page )
    } else {
      res.status( 400 ).send( 'Markdown not found' )
    }
  })


  await initDbCache()
  setInterval( initDbCache, 600000 ) // refresh every 10 min
}

async function initDbCache() {
  log.debug( 'Init Cache' )
  let cache = {}
  cache[ '/content/welcome/html' ]   = fs.readFileSync(  __dirname + '/html/welcome.html', 'utf-8' )
  dbCache = cache
}

const VALID_PG = [
  'get-started',
  'administration',
  'customize'
]

async function getPage( type, file, lang ) {
  if ( lang == 'EN'  && VALID_PG.indexOf( file ) >= 0 ) {
    try {
      let md = await readFile( __dirname + '/md/'+ file +'.md' )
      return md 
    } catch ( exc ) { log.warn( 'getPage', exc.message ) }
  }
}
