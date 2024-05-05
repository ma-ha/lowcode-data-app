/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

log( "dashboard", "load module");
let dashboardPanels = {}

function dashboard_loadResourcesHtml( divId, resUrl, fparam ) {
  // console.log( "dashboard", "divId="+divId, " resourceURL="+resUrl, fparam );
  if ( ! moduleConfig[ divId ] || ! moduleConfig[ divId ].id ) {
    alert('ID missing'); 
    return
  }
  $( '#'+divId ).html( `<DIV id="${divId}Pane" class="lc-dashboard"></DIV>` );
  dashboardFn_reDraw( divId );
}

function dashboardFn_reDraw( divId ) {
  // console.log( "dashboardFn_reDraw",  "divId="+divId );
  dashboardPanels[ divId ] = {}
  let panelSize = ( moduleConfig[ divId ].panelSize ? moduleConfig[ divId ].panelSize : 200 )
  $.getJSON( "dashboard/panel", { id:  moduleConfig[ divId ].id } ).done( ( panels )  => {
    dashboardPanels[ divId ] = panels
    let html = [];
    for ( let panelId in panels ) {
      html.push( dashboardFn_drwPanel( divId, panelId, panels[ panelId ], panelSize ) )
    }
    $( `#${divId}Pane` ).html( html.join( "\n" ) );
    // $( `#${divId}Pane` ).scrollTop( 0 );
    dashboardFn_panelContent( divId ) 

  }).fail( ( err ) => { console.error( "error", err ) })
}

// ----------------------------------------------------------------------------

function dashboardFn_drwPanel( divId, panelId, panel, panelSize ) { 
  try {
    // console.log( 'dashboardFn_drwPanel', divId, panelId, panel );
    let html = [];
    let x = ( panelSize ) * panel.Pos[0] + 14;
    let y = ( panelSize ) * panel.Pos[1] + 34;
    let w = panelSize * panel.Size[0];
    let h = panelSize * panel.Size[1];
    let style = `position:absolute;left:${x}px;top:${y}px;width:${w-5}px;height:${h-5}px;`;
    let mStyle =  `position:absolute;left:0px;top:50px;width:${w-5}px;height:${h-80}px;`;
    // let eId = htmlId( entity.id );
    // let id = divId+'MicrSvc-'+eId;
    html.push( `<div id="${divId}_${panelId}" class="lc-dashboard-panel ${panelId}" style="${style}">` );
    html.push( `<div id="${divId}_${panelId}_title" class="lc-dashboard-title">${panel.Title}</div>` );
    html.push( `<div id="${divId}_${panelId}_metric" class="lc-dashboard-metric" style="${mStyle}">... ${panel.Type} ...</div>` );
    html.push( `<div id="${divId}_${panelId}_sub" class="lc-dashboard-sub">${panel.SubText}</div>` );
    html.push( '</div>');  
    return html.join( "\n" );
  } catch ( exc ) { console.error( 'dashboardFn_drwEntity', exc ); return ''; } 
}

// ----------------------------------------------------------------------------

async function dashboardFn_panelContent( divId ) {
  for ( let panelId in dashboardPanels[ divId ] ) {
    let panel = dashboardPanels[ divId ][ panelId ]
    let dtaArr = await dashboardFn_loadMetric( panel.Metric ) 
    let rec = ( dtaArr.length == 1 ? dtaArr[0] : null )
    let metricDivId = '#'+ divId +'_'+ panelId +'_metric'
    // console.log( 'dashboardFn_panelContent', rec, dtaArr )
    switch ( panel.Type ) {
      case 'Number': dashboardFn_panel_Number( divId, metricDivId, panel.Metric, rec ); break;
      case 'Text':   dashboardFn_panel_Text( divId, metricDivId, panel.Metric, rec ); break;
      case 'ProgressBar':  dashboardFn_panel_ProgressBar( divId, metricDivId, panel.Metric, rec ); break;
      case 'Distribution': dashboardFn_panel_Distribution( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'Pie180': dashboardFn_panel_Pie180( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'Pie360': dashboardFn_panel_Pie360( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'Table': dashboardFn_panel_Table( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'Items': dashboardFn_panel_Items( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'ItemBars': dashboardFn_panel_ItemBars( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'Graph': dashboardFn_panel_Graph( divId, metricDivId, panel.Metric, dtaArr ); break;
      case 'Bars': dashboardFn_panel_Bars( divId, metricDivId, panel.Metric, dtaArr ); break;

      default:
        break;
    }
  }
}

function dashboardFn_panel_Number( divId, metricDivId, metric, dta ) {
  if ( ! dta || ! dta[ metric.Prop ] ) { return }
  $( metricDivId ).html(  
    '<div class="lc-dashboard-metric-number">' +  dta[ metric.Prop ] + '</div>'
  );
}

function dashboardFn_panel_Text( divId, metricDivId, metric, dta ) {
  if ( ! dta || ! dta[ metric.Prop ] ) { return }
  $( metricDivId ).html(  
    '<div class="lc-dashboard-metric-text">' +  dta[ metric.Prop ] + '</div>'
  );
}

function dashboardFn_panel_ProgressBar( divId, metricDivId, metric, dta ) {
  if ( ! dta || ! dta[ metric.Prop ] ) { return }
  try {
    let pVal = Math.round( Number.parseFloat( dta[ metric.Prop ] ) * 100 )
    $( metricDivId ).html(
      '<div class="lc-dashboard-metric-progress" style="height:30px;width:90%">' +
        '<div class="lc-dashboard-metric-progress-done" style="height:40px;width:'+pVal+'%"></div>' +
        '<div class="lc-dashboard-metric-progress-todo" style="height:40px;width:'+(100-pVal-1)+'%"></div>' +
      '</div>'+
      '<div class="lc-dashboard-metric-progress-text">' + pVal +' %</div>'
    );
  } catch ( exc ) { console.error( 'dashboardFn_panel_ProgressBar', exc )}
}

function dashboardFn_panel_Distribution( divId, metricDivId, metric, dta ) {
  // console.log( 'dashboardFn_panel_Distribution', divId, metricDivId, metric, dta )
  if ( ! dta || dta.length < 1 ) { return }
  try { 
    let sum = 0.01
    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      if ( val < 0 ) { continue }
      sum +=  Number.parseFloat( rec[ metric.Prop ] )
    }
    let html = '<div class="lc-dashboard-metric-distribution" style="height:40px;width:90%">' 
    let i = 0 
    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      if ( val < 0 ) { continue }
      let pVal = val / sum * 100
      // console.log( '>>>',  rec[ metric.Prop ], pVal,  rec[ metric.Desc ])
      let style = 'height:40px;width:'+pVal+'%;'
      if ( metric.Style && rec[ metric.Style ] ) {
        style += rec[ metric.Style ]
      }
      html += '<div class="lc-dashboard-metric-distribution-bar color'+i+'"' +
        ' style="'+style+'" title="'+ rec[ metric.Desc ]+'\n'+val+'"></div>' 
      i++
    }
    html += '</div>'
    $( metricDivId ).html( html );
  } catch ( exc ) { console.error( 'dashboardFn_panel_Distribution', exc )}
}

function dashboardFn_panel_Pie180( divId, metricDivId, metric, dta ) {
  console.log( 'dashboardFn_panel_Pie180', divId, metricDivId, metric, dta )
  if ( ! dta || dta.length < 1 ) { return }
  try { 
    let cId = metricDivId.replace('#','') +'_Canvas'
    $( metricDivId ).html( '<canvas id="'+cId+'" width="auto" height="auto"></canvas>' )
    var canvas = document.getElementById( cId );
    canvas.width  = $( metricDivId ).innerWidth()
    canvas.height = $( metricDivId ).innerHeight()
    var cw = canvas.width
    var ch = canvas.height
    if ( ch < cw ) { cw = ch } else { ch = cw }
    if ( cw /2 < ch ) { ch = cw /2 }
    var ctx = canvas.getContext("2d")

    ctx.beginPath()
    ctx.strokeStyle = "#DDD"
    ctx.lineWidth = ch/2
    console.log( 'ch=', ch,'cw=', cw)
    ctx.arc( canvas.width/2, ch, 0.7*ch, 0, Math.PI, true )
    ctx.stroke()
    
    let sum = 0

    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      sum += val 
    }
    let col = [ '#024b6d','#01699b','#017cb5','#0396db','#1fa2df','#39afe6','#56b9e7','#76c2e6','#a9d3e7' ]

    var start = Math.PI;
    let i = 0
    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      var range = Math.PI * val / sum
      //console.log( '.....', rec[ metric.Desc ], val, start, range )
      ctx.beginPath();
      ctx.strokeStyle = col[i];
      ctx.lineWidth = ch/2;
      ctx.arc( canvas.width/2, ch, 0.7*ch, start, (start+range), false );
      ctx.stroke();
      if ( val > 0 ) {
        ctx.strokeStyle = '#FFF' 
        ctx.lineWidth = 0.7
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle' 
        if ( rec[ metric.Desc ] && rec[ metric.Desc ] != '' ) {
          var tx = canvas.width/2 + Math.cos( start + range/2 ) * 0.7 * ch;
          var ty = ch + Math.sin( start + range/2 ) * 0.7 * ch;
          ctx.beginPath();
          console.log( '.....', rec[ metric.Desc ],  tx, ty  )
          ctx.strokeStyle = '#444' 
          ctx.strokeText( rec[ metric.Desc ], tx+1, ty+1 );        
          ctx.strokeStyle = '#FFF' 
          ctx.strokeText( rec[ metric.Desc ], tx, ty );        
        }
      }
      start += range;
      i ++
      if ( i == col.length ) { i = 0 }
    }
  } catch ( exc ) { console.error( 'dashboardFn_panel_Pie180', exc )}
} 


function dashboardFn_panel_Pie360( divId, metricDivId, metric, dta ) {
  // TODO
}

function dashboardFn_panel_Table( divId, metricDivId, metric, dta ) {
  //console.log( 'dashboardFn_panel_Table', divId, metricDivId, metric, dta )
  if ( ! dta || dta.length < 1 ) { return }
  try { 
    let cols = metric.Prop.split(',')
    let html = '<div class="lc-dashboard-metric-table-div"><table class="lc-dashboard-metric-table">' 
    for ( let rec of dta ) {
      html += '<tr>'
      for ( let col of cols ) {
        html += '<td>'
        html += rec[ col ] 
        html += '</td>'
      }
      html += '</tr>'
    }
    html += '</table></div>'
    $( metricDivId ).html( html );
  } catch ( exc ) { console.error( 'dashboardFn_panel_Table', exc )}
}

function dashboardFn_panel_Items( divId, metricDivId, metric, dta ) {
  // console.log( 'dashboardFn_panel_Items', divId, metricDivId, metric, dta )
  if ( ! dta || dta.length < 1 ) { return }
  try { 
    let html = '<div class="lc-dashboard-metric-items-div"><ul class="lc-dashboard-metric-items">' 
    for ( let rec of dta ) {
      html += '<li class="lc-dashboard-metric-item">' + rec[ metric.Prop ] 
      if ( rec[ metric.Desc ] || rec[ metric.Desc ] != '' ) {
        html += '<br><span class="lc-dashboard-metric-item-descr">' + rec[ metric.Desc ] + '</span>'
      }
      html += '</li>'
    }
    html += '</ul></div>'
    $( metricDivId ).html( html );
  } catch ( exc ) { console.error( 'dashboardFn_panel_Items', exc )}
}

function dashboardFn_panel_ItemBars( divId, metricDivId, metric, dta ) {
  // TODO
}

function dashboardFn_panel_Bars( divId, metricDivId, metric, dta ) {
  // console.log( 'dashboardFn_panel_Distribution', divId, metricDivId, metric, dta )
  if ( ! dta || dta.length < 1 ) { return }
  try { 
    let max =  0.01
    let min = -0.01
    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      if ( val > max ) { max = val }
      if ( val < min ) { min = val }
    }
    let upPer = max / ( max - min )  * 100
    let loPer = min / ( min - max )  * 100
    // console.log( max, min, 'upPer=', upPer, "loPer=",loPer)
    let y0 = 0
    let html = '<div class="lc-dashboard-metric-bars" style="height:100%;width:90%">' 
    let i = 0 
    let w = 100 / dta.length
    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      let hTup = 0
      let hBar = 0
      let hTlo = 0
      if ( val >= 0 ) { 
        hBar = val / max * upPer
        hTup = upPer - hBar
        hTlo = loPer
      } else {
        hBar = Math.abs( val / min * loPer )
        hTup = upPer
        hTlo = loPer - hBar
      }
      // console.log( val, 'hTup=', hTup, 'hBar=', hBar, "hTlo=",hTlo)
      html += '<div class="lc-dashboard-metric-bar" style="height:100%;width:'+100/dta.length+'%" title="'+ rec[ metric.Desc ]+'">'
      let style = ''
      if ( metric.Style && rec[ metric.Style ] ) {
        style += rec[ metric.Style ]
      }
      html += '<div class="lc-dashboard-metric-bar-val" style="width:100%;height:'+hTup+'%;"  title="'+ rec[ metric.Desc ]+'"></div>' 
      html += '<div class="lc-dashboard-metric-bar-val color'+i+'" style="width:100%;height:'+hBar+'%;'+style+'" title="'+ rec[ metric.Desc ]+'\n'+val+'"></div>' 
      html += '<div class="lc-dashboard-metric-bar-val" style="width:100%;height:'+hTlo+'%;"  title="'+ rec[ metric.Desc ]+'"></div>' 

      i++
      html += '</div>'
    }
    html += '</div>'
    $( metricDivId ).html( html );
  } catch ( exc ) { console.error( 'dashboardFn_panel_ProgressBar', exc )}
}

function dashboardFn_panel_Graph( divId, metricDivId, metric, dta ) {
  // console.log( 'dashboardFn_panel_Distribution', divId, metricDivId, metric, dta )
  if ( ! dta || dta.length < 1 ) { return }
  try { 
    let max = null
    let min = null
    for ( let rec of dta ) {
      let val = Number.parseFloat( rec[ metric.Prop ] )
      if ( ! max || val > max ) { max = val }
      if ( ! min || val < min ) { min = val }
    }
    let html = '<div class="lc-dashboard-metric-distribution" style="height:30px;width:90%">' 
    let i = 0 
    let w = 100 / dta.length
    for ( let rec of dta ) {
     // TODO
    }
    html += '</div>'
    $( metricDivId ).html( html );
  } catch ( exc ) { console.error( 'dashboardFn_panel_ProgressBar', exc )}
}


// ----------------------------------------------------------------------------
async function dashboardFn_loadMetric( metric ) {
  return new Promise(function( resolve, reject ) { 
    try {
      let dtaURL = 'guiapp/' + metric.Entity
      if ( metric.Query ) {
        $.getJSON( dtaURL, { dataFilter:  metric.Query } ).done( ( dta )  => {
          resolve( dta )
        })
      } else {
        $.getJSON( dtaURL ).done( ( dta )  => {
          resolve( dta )
        })
      }
    } catch ( exc ) { 
      console.error( 'dashboardFn_loadMetric', exc )
      reject([]) 
    }
  })
}

// ----------------------------------------------------------------------------

function dashboard_SetTitle( divId, pageName ) {
}

// ----------------------------------------------------------------------------

var mousePosition;
var offset = [0,0];
var isDown = false;

function getDragDrop( divId ) {
  try {
    document.getElementById( divId ).addEventListener('mousedown', function(e) {
      // console.log( e );
      isDown = true;
      offset = [
        document.getElementById( divId ).offsetLeft - e.clientX,
        document.getElementById( divId ).offsetTop  - e.clientY
      ];
    }, true);

    document.addEventListener('mouseup', function() {
      isDown = false;
    }, true);

    document.addEventListener('mousemove', function(event) {
      event.preventDefault();
      if (isDown) {
          mousePosition = {
              x : event.clientX,
              y : event.clientY
          };
          document.getElementById( divId ).style.left = (mousePosition.x + offset[0]) + 'px';
          document.getElementById( divId ).style.top  = (mousePosition.y + offset[1]) + 'px';
      }
    }, true);
  } catch (exc) {console.error( exc ); }
}

// ----------------------------------------------------------------------------
function dashboard_update( divId, paramsObj ) {
  dashboardFn_reDraw( divId )
}

// empty must haves
function dashboard_setData( id, modalName, resourceURL, paramObj ) {}
function dashboard_CreModal( id, modalName, resourceURL, paramObj  ) {}


//======= Code for "addActionBtn" hook ================================================
function dashboard_addActionBtn( id, modalName, resourceURL, paramObj ) {
}

//======= Code for "creModal" hook, requires "addActionBtn"  ==========================
function dashboard_CreModalFromMeta( id, modalName, resourceURL, paramObj  ) {
}


// ----------------------------------------------------------------------------
function round5( x ) {
    return Math.ceil( x/10 ) * 10
}