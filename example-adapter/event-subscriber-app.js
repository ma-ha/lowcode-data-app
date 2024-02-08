/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const axios = require( 'axios' )
const express = require('express')
const bodyParser = require( 'body-parser' )

const url = 'http://localhost:8888/app/event/subscribe'
const port = 3001

init() 

async function init() {
  await subscribeEvents() 
  await starEventReceiver( processEvent )
}

async function processEvent(req, res) {
  console.log( req.body )
  res.send( )
}


async function subscribeEvents() {
  const res = await axios.post( url, {
    name: 'test-app',
    webHook : 'http://localhost:3001/event'
  },
  {
    headers: {
      'app-id': '5a095719-cfbe-49d3-8927-a55da94221ed',
      'app-secret': '5a095719-cfbe-49d3-8927-a55da94221ed'
    }
  })
  console.log( res.status, res.data )
}


async function starEventReceiver( processEventFunction) {
  const app = express()
  app.use( bodyParser.urlencoded({  limit: "20mb", extended: false }) )
  app.use( bodyParser.json({ limit: "20mb" }) )

  app.post( '/event', processEventFunction )

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
}
