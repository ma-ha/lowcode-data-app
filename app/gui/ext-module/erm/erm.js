/* LOCODE-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

log( "erm", "load module");
let ermFn_divId  = '';
let ermFn_redrawSched = null;
let ermFn_id = null;
// let ermFn_sub = null;
let ermFn_MSvc = {};
let ermFn_MSvcLogs = null;
let ermFn_NS = {};
let ermFn_editMode = false;
let ermFn_staticMode = false;
let ermFn_k8s  = {};
let ermFn_k8s_logs  = {};
let ermFn_k8s_logs_dt  = null;
let ermFn_lastSeen = null;
let ermFn_k8s_node  = {};

let ermFn_k8s_stats = {};
let ermFn_k8s_stats_upd = null;
let ermFn_k8s_stats_dta = {};
let ermFn_k8s_usage_dta = {};

let ermFn_k8sName  = ''
let ermFn_k8sNameS = ''
let ermFn_features = {}
let ermFn_plan = null
let ermFn_divW = 0;
let ermFn_changed = false;


function erm_loadResourcesHtml( divId, resUrl, fparam ) {
  console.log( "erm",  "divId="+divId+" resourceURL="+resUrl );
  ermFn_divId = divId;
  let param = {};
  // if ( fparam && fparam.get && fparam.get.id  ) {
  //   console.log( 'fparam', fparam )
  //   ermFn_id  = fparam.get.id;
  // } else { 
  //   alert('ID missing'); 
  //   return
  // }
  $( '#'+divId ).html( `<DIV id="${divId}Pane" class="lc-erm-main-div"></DIV>` );
  ermFn_reDraw( divId );

  setInterval( ()=>{ // zoom check
    let divIdx = '#'+ ermFn_divId.substring( 0, ermFn_divId.length - 7 );
    let w = $( divIdx ).width();
    if ( w != ermFn_divW ) {
      ermFn_divW = w;
      let h = 0.5 * w;
      if ( h < 810 ) { h = 810; }
      $( divIdx ).height( h );
    }
    ermFn_postERM();
  }, 1000)
}

ermDta = {}
function ermFn_reDraw( divId ) {
  console.log( "ermFn_reDraw",  "divId="+divId );
  $.getJSON( "erm", { id: ermFn_id } ).done( ( erm )  => {
    ermDta = erm
    let html = [];

    for ( let entityId in erm.entity ) {
      html.push( ermFn_drwEntity( divId, erm.entity[ entityId ] ) )
    }
 
    html.push('<DIV id="lc-erm-lines">' );
    html.push( ermFn_drawAllConn( divId ) )
    html.push('<DIV>' );
  
    $( `#${divId}Pane` ).html( html.join( "\n" ) );
    $( `#${divId}Pane` ).scrollTop( 0 );

  }).fail( ( err ) => {
    // Simulate a mouse click:
    console.log( "error", err );
    window.location.href = "index.html?layout=main";
  });
}

function ermFn_reDrawHtml( divId, erm ) {
  ermFn_ShowMsCBs = {};

}
//ermFn_MSvc

function htmlId( entityId ) {
  let result = entityId.replaceAll('/','').replaceAll('.','')
  return result
}

function ermFn_drwEntity( divId, entity ) { try {
  console.log( 'ermFn_drwEntity', entity );
  let html = [];
  let color = ( entity.color ? entity.color : 'k8s-bg-blue' );
  let style = `left:${entity.x}px;top:${entity.y}px;`
  let eId = htmlId( entity.entityId );
  let id = divId+'MicrSvc-'+eId;
  html.push( `<div id="${id}" class="lc-erm-ms ${color}" style="${style}">` );
  html.push( `<div id="${id}-ing" class="lc-erm-ing"></div>` );
  html.push( '<div class="lc-erm-ms-lbl"><span class="lc-erm-appname">'+ 
    entity.appName +'</span><br><b>'+ entity.name +'</b></></div>' );
  html.push( `<div id="erm-entity-move-${eId}" class="lc-erm-move-sel">` );
  html.push( `<span id="erm-entity-move-${eId}-bt" data-k8s-type="ms"  data-k8s-action="move"  data-erm-entity="${entity.entityId}" data-erm-entityid="${eId}" class="ui-icon ui-icon-arrow-4 lc-erm-move-sel-e"></span></div>` );

  html.push( `<div id="erm-entity-lnk-${eId}" class="lc-erm-lnk-sel">` );
  html.push( `<span id="erm-entity-lnk-${eId}-bt" data-k8s-type="ms"  data-k8s-action="lnk"  data-k8s-appid="${entity.appId},${entity.id}" data-erm-entityid="${eId}" class="ui-icon  ui-icon-search lc-erm-lnk"></span></div>` );

  html.push( '<script> $(function() { ' );

  html.push( ' $( "#erm-entity-move-'+eId+'" ).hide(); ' ); 
  html.push( ' $( "#'+id+'" ).hover( ' ); 
  html.push( '    () => { $( "#erm-entity-move-'+eId+'" ).fadeIn(); }, ' ); 
  html.push( '    () => { $( "#erm-entity-move-'+eId+'" ).fadeOut(); } ' ); 
  html.push( ' );' ); 

  html.push( ' $( "#erm-entity-lnk-'+eId+'" ).hide(); ' ); 
  html.push( ' $( "#'+id+'" ).hover( ' ); 
  html.push( '    () => { $( "#erm-entity-lnk-'+eId+'" ).fadeIn(); }, ' ); 
  html.push( '    () => { $( "#erm-entity-lnk-'+eId+'" ).fadeOut(); } ' ); 
  html.push( ' );' ); 

  html.push( ` $( ".lc-erm-move-sel-e" ).on({ mousedown: (e) => { ermFn_editEvent( e,  $(this) ); } }); ` );
  html.push( ` $( ".lc-erm-move-sel-e" ).on({ mousemove: (e) => { ermFn_editEvent( e,  $(this) ); } }); ` );
  html.push( ` $( ".lc-erm-move-sel-e" ).on({ mouseup  : (e) => { ermFn_editEvent( e,  $(this) ); } }); ` );
  html.push( ` $( ".lc-erm-lnk" ).on({ click  : (e) => { loadEntityPg( e, $(this) ); } }); ` );
  html.push( '}); </script>' );

  html.push( '</div>');  
  return html.join( "\n" );
} catch ( exc ) { console.error( 'ermFn_drwEntity', exc ); return ''; } }


function loadEntityPg( evt, obj ) {
  try {
    if ( ! evt && ! evt.currentTarget ) { return; }
    let btId = evt.currentTarget.id ;
    let dta = $( "#"+btId ).data();
    window.location.href = 'index.html?layout=AppEntityProperties-nonav&id=' + dta.k8sAppid;
  } catch ( exc ) { console.error( 'loadEntityPg', exc ); return ''; } 
}


function ermFn_drawAllConn( divId ) { try {
  let html = [];
  for ( let entityId in ermDta.entity ) {
    let e1 = ermDta.entity[ entityId ]
    for ( let relId in e1.rel ) {
      console.log( '|||', entityId, relId, e1.rel[ relId ].toEntity )
      let e2 = ermDta.entity[ e1.rel[ relId ].toEntity ]
      html.push( ermFn_drawConn( divId, e1, e2, relId ) )
    }
  }
  return html.join( "\n" );
} catch ( exc ) { console.error( 'ermFn_drawAllConn', exc ); return ''; } }


function ermFn_drawConn( divId, e1, e2, relId, lbl, mFrm, mTo ) { try {
  console.log( 'ermFn_drawConn', divId, e1, e2, relId  )
  let cls = 'lc-erm-conn';
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
} catch ( exc ) { console.error( 'ermFn_drawConn', exc ); return ''; } }

function ermFn_setTitle() {
  let title = 'Kubernetes Landscape <i>'+ermFn_k8sName+'</i> ... '
  $( '.header-logo' ).html( '<h1>Kubernetes Monitor: '+ermFn_k8sNameS+'</h1>' );
  if ( ! ermFn_lastSeen ) {
    $( `#ClusterMonitoringTitle` ).html( title +'  <span style="color:gray">waiting for data</span> ');
    return
  }
  let dtStr = ( new Date( ermFn_lastSeen ) ).toLocaleString()
  if ( Date.now() - ermFn_lastSeen < 80000 ) {
    $( `#ClusterMonitoringTitle` ).html( title +' updated '+ dtStr );
  } else  if ( Date.now() - ermFn_lastSeen < 300000 ) {
    $( `#ClusterMonitoringTitle` ).html( title +' <span style="color:orange"> last update '+ dtStr +"</span>" ); 
  } else {
    $( `#ClusterMonitoringTitle` ).html( title +' <span style="color:red">got last update '+ dtStr +"</span>" ); 
  }
}


// ============================================================================

let ermFn_editEvt = {}

function ermFn_editEvent( evt, obj ) {
  try {
    let divId = ermFn_divId;
    if ( ! evt && ! evt.currentTarget ) { return; }
    let btId = evt.currentTarget.id ;
    let dta = $( "#"+btId ).data();
    if ( ! dta ) { return; }
    // console.log( "event id", btId, evt.type, "event data", dta  );
    if ( evt.type == 'mousedown' ) {
      if ( dta.k8sAction == "move" || dta.k8sAction == "resize" ) {
        console.log( "event id", btId, evt.type, "event data", dta  );
        ermFn_editEvt = {
          doit: true,
          cltXstart: evt.clientX,
          cltYstart: evt.clientY
        }
        if ( dta.k8sType == 'ms' &&  ermDta.entity[ dta.ermEntity ] ) {
          ermFn_editEvt.stX = ermDta.entity[ dta.ermEntity ].x;
          ermFn_editEvt.stY = ermDta.entity[ dta.ermEntity ].y;
        } else { return; }
      }
    } else if ( evt.type == 'mouseup' && ermFn_editEvt.doit ) {
      // console.log('mouseup',  isLS_NS );
      ermFn_editEvt = {}
      console.log( "event id", btId, evt.type, "event data", dta  );
      if ( ermDta.entity[ dta.ermEntity ] ) {
        console.log( '' )
        ermDta.entity[ dta.ermEntity ].x = round5( ermDta.entity[ dta.ermEntity ].x )
        ermDta.entity[ dta.ermEntity ].y = round5( ermDta.entity[ dta.ermEntity ].y )
        // console.log( 'move', newX, newY );
        let htmlID = divId+'MicrSvc-'+dta.ermEntityid;
        $( '#'+htmlID ).css({ left:  ermDta.entity[ dta.ermEntity ].x +'px' });
        $( '#'+htmlID ).css({ top :  ermDta.entity[ dta.ermEntity ].y +'px' });
      }
      ermFn_changed = true
      // isLS_postBoard();
    } else if ( evt.type == 'mousemove' ) {
      if ( ermFn_editEvt.doit ) {
        // console.log( "mousemove event id", btId, "event data", dta  );
        if ( dta.k8sType == 'ms' &&  ermDta.entity[ dta.ermEntity ] ) {
          // console.log( "event id", btId, "event data", dta  );
          if ( dta.k8sAction == "move" ) {
            console.log( 'move', ermFn_editEvt.stX ,  ermFn_editEvt.stY )
            let newX = ermFn_editEvt.stX + (evt.clientX - ermFn_editEvt.cltXstart);
            let newY = ermFn_editEvt.stY + (evt.clientY - ermFn_editEvt.cltYstart);
            // console.log( 'move', newX, newY );
            let htmlID = divId+'MicrSvc-'+dta.ermEntityid;
            $( '#'+htmlID ).css({ left: newX+'px' });
            $( '#'+htmlID ).css({ top : newY+'px' });
            ermDta.entity[ dta.ermEntity ].x = newX;
            ermDta.entity[ dta.ermEntity ].y = newY;
          }
        } 
      }
    }
    console.log( '>>>>>> redraw conns...')
    $('#lc-erm-lines' ).html( ermFn_drawAllConn( divId ) )
    
  } catch (exc) { console.log(exc); }
}

 
function ermFn_postERM() {
  console.log( 'ermFn_postERM' )
  if ( ! ermFn_changed ) { return }
  $.ajax({
    type: 'POST', url: 'erm', data: JSON.stringify( ermDta ),
    contentType: "application/json",
    dataType: 'json',
    success: (result)=> { 
    },
    error: (jqXHR, textStatus, errorThrown ) =>  { alert( 'ERROR: POST erm ' + textStatus +' '+ errorThrown); },
  }); 
  ermFn_changed = false;
}

// ----------------------------------------------------------------------------

let ermFn_ShowMsCBs = { }

function erm_SetTitle( divId, pageName ) {
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

let ermFn_saveInterval = null

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
function erm_update( divId, paramsObj ) {}
function erm_setData( id, modalName, resourceURL, paramObj ) {}
function erm_CreModal( id, modalName, resourceURL, paramObj  ) {}

//======= Code for "addActionBtn" hook ================================================
function erm_addActionBtn( id, modalName, resourceURL, paramObj ) {
}

//======= Code for "creModal" hook, requires "addActionBtn"  ================================================
function erm_CreModalFromMeta( id, modalName, resourceURL, paramObj  ) {
}

// ----------------------------------------------------------------------------
function round5( x ) {
    return Math.ceil( x/10 ) * 10
}