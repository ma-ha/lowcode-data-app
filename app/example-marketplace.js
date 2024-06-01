/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

// This example launches the Low-Code-App in standalone mode.
// ... see "app-embedded.js" how to use it embedded with in your app.

let lowCodeApp = require( './index' ) 
// let lowCodeApp = require( 'lowcode-data-app' ) // ... when using the npm package

lowCodeApp.init({
  DATA_DIR : '../dta/',
  GUI_URL  : 'http://localhost:8888/app/',
  URL_PATH : '/app',
  OIDC_SERVER : true,
  SUPER_TENANT_ADMIN: 'demo', // comma separated user ids
  MARKETPLACE_SERVER: true,
  MARKETPLACE_SCOPE: '2110'
})