/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const gui     = require( 'easy-web-app' )
const log     = require( '../helper/log' ).logger

exports: module.exports = {
  init
}

let cfg = {}

async function init( appCfg ) {
  cfg = appCfg
  initMarketPage()
  initAppDetailsPage()
  initAppImportPage()
}


function initMarketPage() {
  let marketPage = gui.addPage( 'Marketplace' ) 
  marketPage.title    = 'App Marketplace'
  marketPage.navLabel = 'Marketplace'
  marketPage.setPageWidth( '90%' )

  marketPage.addView({ 
    id: 'AppMarketplace', title: 'App Marketplace',  height: '760px', 
    type: 'pong-list', resourceURL: 'market',
    moduleConfig : {
      rowId: 'id',
      divs: [
        {
          id: 'XApp',
          cellType: 'div',
          divs: [
            {
              id: 'img',
              cellType: 'text',
              nozoom: true 
            },
            {
              id: 'id',
              cellType: 'text'
            },
            {
              id: 'title',
              cellType: 'text'
            },
            {
              id: 'XBy',
              cellType: 'div',
              divs: [
                {
                  id: 'XBy1',
                  cellType: 'div',
                  divs: [
                    {
                      id:'lBy',
                      cellType: 'label',
                      label: 'by:'
                    },
                    {
                      id: 'author',
                      cellType: 'text'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      maxRows: 6
    }
  })
}

function initAppDetailsPage() {
  let marketPage = gui.addPage( 'MarketApp-nonav' ) 
  marketPage.title    = 'App Marketplace'
  marketPage.setPageWidth( '90%' )
  marketPage.addView({ 
    id: 'AppMarketplace', title: 'App Marketplace', height: '760px',
    resourceURL: 'market'
  })
}


function initAppImportPage() {
  let importPage = gui.addPage( 'MarketImport-nonav' ) 
  importPage.title    = 'LCA Import'
  importPage.setPageWidth( '90%' )
  importPage.addView({
    rowId: "ImportLog", title: "Import Output", height: '760px',
    resourceURL: "market/import",
  })
}
