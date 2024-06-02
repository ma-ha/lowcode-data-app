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
  initDetailsPages()
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
      filter: {
        dataReqParams : [
          { id: 'name', label: 'Name' },
          { id: 'type', label: 'Type', type: 'select',
            options: [ { option: '*', value: '*' }, { option: 'App', value: 'App' }, { option: 'State Model', value: 'StateModel' } ] },
        ],
        dataReqParamsSrc : 'Form'
      },
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
            // {
            //   id: 'id',
            //   cellType: 'text'
            // },
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
                      label: 'by'
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

  log.info( ' cfg.MARKETPLACE_HOWTO_CONTRIBUTE' , cfg.MARKETPLACE_HOWTO_CONTRIBUTE )
  if ( cfg.MARKETPLACE_HOWTO_CONTRIBUTE ) {
    marketPage.addView({ 
      id: 'AppMarketHowToPublish', title: 'How can I contribute?',  height: '56px', 
      resourceURL: 'market/howto'
    })
  }

}


function initDetailsPages() {
  let marketAppPage = gui.addPage( 'MarketAppDetails-nonav' ) 
  marketAppPage.title    = 'App Marketplace'
  marketAppPage.setPageWidth( '90%' )
  marketAppPage.addView({ 
    id: 'MarketplaceApp', title: 'App Marketplace', height: '760px',
    resourceURL: 'market'
  })

  let marketSmPage = gui.addPage( 'MarketStateModelDetails-nonav' ) 
  marketSmPage.title    = 'App Marketplace'
  marketSmPage.setPageWidth( '90%' )
  marketSmPage.addView({ 
    id: 'MarketplaceSm', title: 'App Marketplace', height: '150px',
    resourceURL: 'market'
  })
  marketSmPage.addView({ 
    id: 'MarketplaceSmDiagram', title: 'State Model', height: '650px',
    type : 'statemodel', resourceURL: 'market/state-model/diagram',
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
