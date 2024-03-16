/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

// This example launches the Low-Code-App in standalone mode.
// ... see "app-embedded.js" how to use it embedded with in your app.

let lowCodeApp = require( './index' ) 
// let lowCodeApp = require( 'lowcode-data-app' ) // ... when using the npm package

lowCodeApp.init({

  TITLE: "Low Code App",
  PROVISIONING_API_KEY : 'CHANGE_ME',

  // file based persistence goes into this folder
  DATA_DIR : '../dta/',
  
  // CSS_PATH : '/var/www/custom-css',
  // IMG_PATH : '/var/www/img',
  // CONTENT_PATH : '/var/www/myhtmldocs',

  // in stand alone mode you should set this three params
  GUI_URL  : 'http://localhost:8888/app/',
  URL_PATH : '/app',  // same as above just only the path of the URL
  PORT     : 8888, 

  // start app in debug mode with login as FAKE_LOGIN user id 
  FAKE_LOGIN : null,

  HIDE_DOCU : false,

  // if an internal OpenId Connect server should be started:
  OIDC_SERVER : true,

  // OpenId Connect configuration // here for internal server
  OIDC : {
    OPENID_SEC_KEY: '_______change_me_______',
    CLIENT_ID: 'a0000a0000a0000a0000a000',
    ISSUER: 'https://localhost/',
    JWKS_URI: 'https://localhost/.well-known/jwks.json',
    AUDIENCE: 'http://localhost:8888/',
    AUTH_DOMAIN: 'localhost',
    AUTH_SCOPE: 'read:all',
    LOGIN_URL:  'oidc/authorize',
    LOGOUT_URL: 'oidc/logout',
    CHANGE_PWD_URL: 'http://localhost:8888/index.html?layout=main',
    REGISTER_URL: 'http://localhost:8888/index.html?layout=product-nonav&id=5d380c06abc348168ba62ec6',
    PWD_RESET_URL: 'http://localhost:8888/index.html?layout=main',

    LOGIN_REDIRECT: 'http://localhost:8888/app/index.html',
    LOGOUT_REDIRECT: 'http://localhost:8888/app/index.html',
    userSessionExpireMin : 60
  }
})
