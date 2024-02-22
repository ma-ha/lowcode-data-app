/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

log( "statemodel", "load module");
let statemodelFn_divId  = '';
let statemodelFn_id = null;
let statemodelFn_MSvc = {};
let statemodelFn_k8s  = {};
let statemodelFn_lastSeen = null;
let statemodelFn_k8s_node  = {};

let statemodelFn_k8sName  = ''
let statemodelFn_k8sNameS = ''
let statemodelFn_divW = 0;
let statemodelFn_changed = false;


function statemodel_loadResourcesHtml( divId, resUrl, fparam ) {
  console.log( "statemodel",  "divId="+divId+" resourceURL="+resUrl, fparam );
  statemodelFn_divId = divId;
  let param = {};
  if ( fparam && fparam.get && fparam.get.id  ) {
    console.log( 'fparam', fparam )
    statemodelFn_id  = fparam.get.id;
  } else { 
    alert('ID missing'); 
    return
  }
  $( '#'+divId ).html( `<DIV id="${divId}Pane" class="lc-statemodel-main-div"></DIV>` );
  statemodelFn_reDraw( divId );

  setInterval( ()=>{ // zoom check
    let divIdx = '#'+ statemodelFn_divId.substring( 0, statemodelFn_divId.length - 7 );
    let w = $( divIdx ).width();
    if ( w != statemodelFn_divW ) {
      statemodelFn_divW = w;
      // let h = 0.5 * w;
      // if ( h < 810 ) { h = 810; }
      // $( divIdx ).height( h );
    }
    // statemodelFn_poststatemodel();
  }, 1000)
}

statemodelDta = {}
function statemodelFn_reDraw( divId ) {
  console.log( "statemodelFn_reDraw",  "divId="+divId );
  $.getJSON( "state-model/diagram", { id: statemodelFn_id } ).done( ( statemodel )  => {
    statemodelDta = statemodel
    let html = [];

    for ( let stateId in statemodel.state ) {
      html.push( statemodelFn_drwEntity( divId, statemodel.state[ stateId ] ) )
    }
 
    html.push('<DIV id="lc-statemodel-lines">' );
    html.push( statemodelFn_drawAllConn( divId, ) )
    html.push('<DIV>' );
  
    $( `#${divId}Pane` ).html( html.join( "\n" ) );
    $( `#${divId}Pane` ).scrollTop( 0 );

  }).fail( ( err ) => {
    // Simulate a mouse click:
    console.log( "error", err );
    window.location.href = "index.html?layout=main";
  });
}

function statemodelFn_reDrawHtml( divId, statemodel ) {
  statemodelFn_ShowMsCBs = {};

}
//statemodelFn_MSvc

function htmlId( entityId ) {
  let result = entityId.replaceAll('/','').replaceAll('.','')
  return result
}

function statemodelFn_drwEntity( divId, entity ) { try {
  console.log( 'statemodelFn_drwEntity', entity );
  let html = [];
  let color = ( entity.color ? entity.color : 'k8s-bg-blue' );
  let style = `left:${entity.x}px;top:${entity.y}px;`
  let eId = htmlId( entity.id );
  let id = divId+'MicrSvc-'+eId;
  html.push( `<div id="${id}" class="lc-statemodel-ms ${color}" style="${style}">` );
  html.push( `<div id="${id}-ing" class="lc-statemodel-ing"></div>` );
  html.push( '<div class="lc-statemodel-ms-lbl"><span class="lc-statemodel-name"><b>'+ entity.name +'</b></></div>' );
  html.push( '</div>');  
  return html.join( "\n" );
} catch ( exc ) { console.error( 'statemodelFn_drwEntity', exc ); return ''; } }


function loadEntityPg( evt, obj ) {
  try {
    if ( ! evt && ! evt.currentTarget ) { return; }
    let btId = evt.currentTarget.id ;
    let dta = $( "#"+btId ).data();
    window.location.href = 'index.html?layout=AppEntityProperties-nonav&id=' + dta.k8sAppid;
  } catch ( exc ) { console.error( 'loadEntityPg', exc ); return ''; } 
}


function statemodelFn_drawAllConn( divId ) { try {
  let html = [];
  let htmlId = 'StateLines'
  html.push( `<svg id="${htmlId}" width="1760" height="320" class="lc-statemodel-conn" style="top:30px;left:50px">` );
  html.push( '<style> .small { font: italic 12px sans-serif; }  </style>' );
  for ( let stateId in statemodelDta.state ) {
    let state1 = statemodelDta.state[ stateId ]
    for ( let relId in state1.rel ) {
      let state2 = statemodelDta.state[ state1.rel[ relId ].to ]
      console.log( '|||', stateId, relId, state1.rel[ relId ] )
      let line = {
        label : state1.rel[ relId ].label,
        path  : [ { x: state1.x, y: state1.y } ]
      }
      for ( let linePoint of  state1.rel[ relId ].line ) {
        line.path.push( linePoint )
      }
      line.path.push({ x: state2.x, y: state2.y })
      html.push( statemodelFn_drawConn( line ) )
    }
  }
  html.push( '</svg>' );
  $( "#"+htmlId ).remove();
  return html.join( "\n" );
} catch ( exc ) { console.error( 'statemodelFn_drawAllConn', exc ); return ''; } }


function statemodelFn_drawConn(  line ) { try {
  //console.log( 'statemodelFn_drawConn', divId, line  )
  let html = ''
  if ( line.label.pos ) {
    html += `<text x="${line.label.pos.x}" y="${line.label.pos.y-5}" class="small">${line.label.txt}</text>`   
  }
  let arrIdx = Math.floor( line.path.length / 2 ) - 1
  for ( let i = 0; i < line.path.length - 1; i++ ) {
    let x1 = line.path[i].x
    let y1 = line.path[i].y
    let x2 = line.path[i+1].x
    let y2 = line.path[i+1].y
    let xMid = x1 + (x2-x1)/2
    let yMid = y1 + (y2-y1)/2
    if ( ! line.label.pos && i == 0  ) { // add label in mid of 1st line
      html += `<text x="${xMid}" y="${yMid-5}" class="small">${line.label.txt}</text>`
    }
    //console.log( 'statemodelFn_drawConn',x1,y1,'>',x2,y2 )
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black"/>`;
    if ( i == arrIdx ) {
      let angle = Math.atan2( y2 - y1 , x2 - x1 ) 
      if ( angle < 0 )  { angle += 2 * Math.PI  } 
      let halfPi = 0.5* Math.PI
      let x3 = xMid + 10 * Math.cos( angle - halfPi ) + 10 * Math.sin( angle - halfPi) 
      let y3 = yMid + 10 * Math.sin( angle - halfPi ) - 10 * Math.cos( angle - halfPi ) 
      html += `<line x1="${xMid}" y1="${yMid}" x2="${x3}" y2="${y3}" stroke="black"/>`;
      let tqPi = Math.PI
      let x4 = xMid + 10 * Math.cos( angle - tqPi ) + 10 * Math.sin( angle - tqPi) 
      let y4 = yMid + 10 * Math.sin( angle - tqPi ) - 10 * Math.cos( angle - tqPi ) 
      html += `<line x1="${xMid}" y1="${yMid}" x2="${x4}" y2="${y4}" stroke="black"/>`;
    }
  }
  return html;
} catch ( exc ) { console.error( 'statemodelFn_drawConn', exc ); return ''; } }


function statemodelFn_drawConnX( divId, e1, e2, relId, lbl, mFrm, mTo ) { try {
  console.log( 'statemodelFn_drawConn', divId, e1, e2, relId  )
  let cls = 'lc-statemodel-conn';
  let html = ''
  try {
    let x1 = e1.x + 50;  // + half div width
    let y1 = e1.y + 50;  // + half div height
    let x2 = e2.x + 50;  // + half div width
    let y2 = e2.y + 50;  // + half div height
     
    let x = ( x1 < x2 ? x1 : x2 );
    let y = ( y1 < y2 ? y1 : y2 );
    let w = Math.abs( x2 - x1 );
    let h = Math.abs( y2 - y1 );
    let htmlId = divId + e1.entityId+'-'+relId; // draw conn 2x, easier
    //console.log( conn.htmlId, x1, y1, '>', x2 , y2 );
   
    html += `<svg id="${htmlId}" width="${w+150}" height="${h+20}" class="${cls}" style="top:${y}px;left:${x-50}px">`;
    html += '<style> .small { font: italic 12px sans-serif; }  </style>'
    if ( ( x1 < x2 && y1 < y2 ) || ( x1 > x2 && y1 > y2 ) ) { 
      html += `<line x1="50" y1="0" x2="${50+w}" y2="${h}" stroke="black"/>`;
      html += `<line x1="51" y1="1" x2="${51+w}" y2="${h+1}" stroke="black"/>`;
    } else {
      html += `<line x1="50" y1="${h}" x2="${50+w}" y2="0" stroke="black"/>`;
      html += `<line x1="51" y1="${h+1}" x2="${51+w}" y2="1" stroke="black"/>`;
    }
    let tw = relId.length
    html += `<text x="${50+w/2+4-tw*3}" y="${h/2+15}" class="small">${relId}</text>`
    html += `</svg>\n`;

    try {
      $( "#"+htmlId ).remove();
    } catch (error) { }
    
  } catch (exc) { console.error( exc ); } 
  return html;
} catch ( exc ) { console.error( 'statemodelFn_drawConn', exc ); return ''; } }


function statemodelFn_setTitle() {
  let title = 'Kubernetes Landscape <i>'+statemodelFn_k8sName+'</i> ... '
  $( '.header-logo' ).html( '<h1>Kubernetes Monitor: '+statemodelFn_k8sNameS+'</h1>' );
  if ( ! statemodelFn_lastSeen ) {
    $( `#CluststatemodelonitoringTitle` ).html( title +'  <span style="color:gray">waiting for data</span> ');
    return
  }
  let dtStr = ( new Date( statemodelFn_lastSeen ) ).toLocaleString()
  if ( Date.now() - statemodelFn_lastSeen < 80000 ) {
    $( `#CluststatemodelonitoringTitle` ).html( title +' updated '+ dtStr );
  } else  if ( Date.now() - statemodelFn_lastSeen < 300000 ) {
    $( `#CluststatemodelonitoringTitle` ).html( title +' <span style="color:orange"> last update '+ dtStr +"</span>" ); 
  } else {
    $( `#CluststatemodelonitoringTitle` ).html( title +' <span style="color:red">got last update '+ dtStr +"</span>" ); 
  }
}


// ============================================================================

let statemodelFn_ShowMsCBs = { }

function statemodel_SetTitle( divId, pageName ) {
  // console.log( viewsMap[ divId ] );
  let viewTitel = viewsMap[ divId ].title;
  if ( viewTitel ) {
    // console.log( 'viewTitel '+pageName );
    viewTitel = viewTitel.replace( '${page}', pageName ).replace( /_/g , ' ');
    // console.log( 'viewTitel '+viewTitel );
    let titleId = '#' + divId.replace( 'Content', '' ) + 'Title';
    $( titleId ).html( viewTitel )
  }
}

// ----------------------------------------------------------------------------

let statemodelFn_saveInterval = null

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
// empty must haves
function statemodel_update( divId, paramsObj ) {
  statemodelFn_reDraw( divId )
}
function statemodel_setData( id, modalName, resourceURL, paramObj ) {}
function statemodel_CreModal( id, modalName, resourceURL, paramObj  ) {}

//======= Code for "addActionBtn" hook ================================================
function statemodel_addActionBtn( id, modalName, resourceURL, paramObj ) {
}

//======= Code for "creModal" hook, requires "addActionBtn"  ==========================
function statemodel_CreModalFromMeta( id, modalName, resourceURL, paramObj  ) {
}

// ----------------------------------------------------------------------------
function round5( x ) {
    return Math.ceil( x/10 ) * 10
}