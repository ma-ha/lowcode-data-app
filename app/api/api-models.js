/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

const log        = require( '../helper/log' ).logger
const apiSec     = require( './api-sec' )
const dta        = require( '../persistence/app-dta' )
const userDta    = require( '../persistence/app-dta-user' )
const fs         = require( 'fs' )
const fileupload = require( 'express-fileupload' )
const helper     = require( '../helper/helper' )

exports: module.exports = { 
  setupAPI
}

// ============================================================================
// API:
// now we need to implement the ReST service for /products 
// this should also only be available for authenticated users
let gui = null

async function setupAPI( app ) {
  let svc = app.getExpress()
  gui = app

  const guiAuthz = apiSec.customizeAuthz( gui )

  // --------------------------------------------------------------------------

  svc.get( '/erm', guiAuthz, getERM )
  svc.post('/erm', guiAuthz, saveERM )

  svc.get( '/state-model', guiAuthz, getStateModels )
  svc.post('/state-model', guiAuthz, addStateModel )
  // export
  svc.get( '/state-model/json', guiAuthz, getStateJSON )
  // import
  svc.post('/state-model/json', fileupload(),guiAuthz, uploadStateModelJSON )
  svc.get( '/state-model/json/html', guiAuthz, getUploadStateModelResult )
  svc.get( '/state-model/import/:uid', guiAuthz, importStateModel )

  svc.get( '/state-model/state', guiAuthz, getState )
  svc.get( '/state-model/state/pong-form', guiAuthz, genStateFrm )
  svc.post('/state-model/state', guiAuthz, udpState )
  svc.post('/state-model/state/move/:dir', guiAuthz, moveState )
  svc.get( '/state-model/transition', guiAuthz, getStateTransitions )
  svc.get( '/state-model/transition/pong-form', guiAuthz, getStateTransFrm )
  svc.post('/state-model/transition', guiAuthz, setStateTransitions )
  svc.delete('/state-model/transition', guiAuthz, delStateTransitions )

  svc.get( '/state-model/diagram', guiAuthz, getStateModel )
  
}
// ============================================================================

async function getERM( req, res )  {
  log.info( 'GET erm' )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  let appId = req.query.id
  if ( appId ) {
    let app = await dta.getAppById( appId )
    res.send( app )
  } else {
    let ermCfg = await dta.getDataById( user.rootScopeId+'_erm', user.rootScopeId )
    if ( ! ermCfg ) { ermCfg = {} }
    let appMap = await dta.getAppList( user.scopeId, [], 'admin' )
    let erm = {
      entity: {}
    }
    let x = 100
    let y = 100
    let i = 0 
    let cols = [ 'k8s-bg-blue','k8s-bg-lblue', 'k8s-bg-gray','k8s-bg-tk', 'k8s-bg-redgr', 'k8s-bg-lblue2', 'k8s-bg-lblue3' ]
    for ( let appId in appMap ) { try {
      let app = appMap[ appId ]
      for ( let entityId in app.entity ) {
        let entity = app.entity [ entityId ]
        let xp = x
        let yp = y
        if ( ermCfg[ appId+'/'+entityId ] ) {
          xp = ermCfg[ appId+'/'+entityId ].x
          yp = ermCfg[ appId+'/'+entityId ].y
        } else {
          x += 150
          if ( x > 900 ) {
            x = 100
            y += 150
          }
        }
        let title =  entity.title
        if ( ! title || title == '' ) {
          title = entityId
        }
        if ( entity.stateModel ) {
          title += '\n<i>&lt;'+ entity.stateModel +'&gt;</i>'
        }
        let e = {
          appId    : appId,
          appName  : app.title,
          entityId : appId+'/'+entityId,
          id       : entityId,
          name     : title,
          x : xp,
          y : yp,
          color : cols[i],
          rel : {}
        }
        for ( let prpId in entity.properties ) {
          let prop = entity.properties[ prpId ]
          if ( prop.type == 'SelectRef' ) {
            e.rel[ prpId ] = {
              toEntity : prop.selectRef,
              mFrm     : 'n',
              mTo      : '1'
            }
          } else if ( prop.type == 'DocMap' ) {
            try {
              let p = prop.docMap.split('/') // this is scope/app/ver/ent/prop
              e.rel[ prpId ] = {
                toEntity : p[0] +'/'+ p[1] +'/'+ p[2]  +'/'+ p[3], // this is scope/app/ver
                mFrm     : '1',
                mTo      : 'n'
              }
            } catch ( exc ) { log.warn( 'ERM rel', exc ) }
          } else if ( prop.type == 'MultiSelectRef' ) {
            e.rel[ prpId ] = {
              toEntity : prop.multiSelectRef,
              mFrm     : 'n',
              mTo      : 'm'
            }
          }
        }

       
        erm.entity[ appId+'/'+entityId ] = e 
      }
    
      i++
      if ( i == cols.length ) { i = 0 }

    } catch ( exc ) { log.error( 'GET erm', exc)} }
    res.send( erm )
  }
}

async function saveERM( req, res ) {
  try {
    log.debug( 'POST erm' )
    let user = await userDta.getUserInfoFromReq( gui, req )
    if ( ! user ) { return res.status(401).send( 'login required' ) }
    let ermCfg = {}
    for ( let e in req.body.entity ) {
      ermCfg[ e ] = {
        x : req.body.entity[ e ].x,
        y : req.body.entity[ e ].y
      }
    }
    await dta.addDataObjNoEvent( user.rootScopeId+'_erm', user.rootScopeId, ermCfg )
  } catch ( exc ) { log.error( 'POST erm', exc ) } 
  res.send( {} )
}

// ============================================================================

// n b3b3b7ff
// g 1dec43ff
// r cf4210ff

async function getStateModels( req, res )  {
  log.info( 'getState', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'getState no user')
    return res.status(401).send( 'login required' ) 
  }

  let stateArr = []
  let stateModeMap = await dta.getStateModelMap(user.rootScopeId )

  for ( let stateModelId in stateModeMap ) {
    let st = stateModeMap[ stateModelId ]
    let stateLst = []
    for ( let stId in st.state ) { if ( stId != 'null' ) { stateLst.push( stId ) } }
    stateArr.push({
      stateModelId : stateModelId,
      scope        : st.scopeId,
      states       : stateLst.join(' / '),
      editLnk      : '<a href="index.html?layout=EditState-nonav&id='+stateModelId+'">Edit</a>',
      expLnk       : '<a href="state-model/json?id='+stateModelId+'" target="_blank">Export</a>',
    })
  }

  res.send( stateArr )
}


async function addStateModel( req, res )  {
  log.info( 'addState', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'addState no user')
    return res.status(401).send( 'login required' ) 
  }
  if ( ! req.body.scopeId || ! req.body.stateModelId ) {
    return res.status(400).send( ) 
  }
  let stateModel = await dta.getStateModelById( req.body.scopeId +'/'+ req.body.stateModelId )
  if ( stateModel ) {
    return res.status(400).send( 'exits' ) 
  }

  let id = req.body.stateModelId
  id = id.replaceAll( ' ', '_' )

  let newState = {
    id : id,
    scopeId : req.body.scopeId,
    state : {
      null : { actions : { } }
    }
  }
  await dta.saveStateModel( req.body.scopeId +'/'+id, newState )

  res.send(( result ? 'OK' : 'FAILED!!' ))
}


async function getStateJSON( req, res )  {
  log.info( 'getStateJSON', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'getState no user')
    return res.status(401).send( 'login required' ) 
  }

  if ( req.query.id ) { // single one
    let stateModel = await dta.getStateModelById(req.query.id )
    let exportModel = JSON.parse( JSON.stringify( stateModel ) )
    let name = req.query.id.split('/')
    delete exportModel.id
    delete exportModel.scopeId
    delete exportModel._cre
    delete exportModel._upd
    exportModel.name = name[1]
    return res.json( exportModel )  
  }

  res.send( 'Error' ) 
}

// ============================================================================
let uploadStateResult = '... '

async function uploadStateModelJSON( req, res )  {
  log.info( 'uploadStateModelJSON', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.files || Object.keys( req.files ).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  try {
    uploadStateResult = ''
    let newStateModel = JSON.parse( '' + req.files.file.data )
    uploadStateResult += 'JSON OK'
    let stateModelId = user.rootScopeId +'/'+ newStateModel.name
    uploadStateResult += '<br><b>'+stateModelId+'</b>'
    let dbSM = await dta.getStateModelMap( user.rootScopeId )
    if ( dbSM[ stateModelId ] ) { 
      uploadStateResult += '<br>ERROR: State Model exists!'
      return res.send( 'ERROR' )
    }
    // TODO integrity checks

    newStateModel.id = stateModelId
    newStateModel.scopeId = user.rootScopeId

    // store as temp import
    let importId = helper.uuidv4()
    let importModel = {
      stateModel : newStateModel,
      _expire    : Date.now() + 1000*60*60*24
    }
    await dta.addDataObjNoEvent( 'app-temp', importId, importModel )
    uploadStateResult += '<p> Click to <a href="state-model/import/'+importId+'">IMPORT</a>'

  } catch ( exc ) {  
    uploadStateResult += '<br>ERROR: '+exc.message
    log.warn( 'uploadStateModelJSON', exc )
    return res.status(400).send( 'Error' )
  }
  res.send( 'OK' )
}


async function getUploadStateModelResult( req, res ) {
  log.info( 'getUploadStateModelResult' ) // , req.files.file.data
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  res.send( uploadStateResult )
  uploadStateResult = '... '
}


async function importStateModel( req, res ) {
  log.info( 'importStateModel', req.params.uid  ) 
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( ! req.params.uid ) { return res.status(400).send( 'id required' ) }

  let impDta = await dta.getDataById( 'app-temp', req.params.uid ) 
  if ( ! impDta ) { return res.status(400).send( 'UID not found' ) }
  if ( ! impDta.stateModel ) { return res.status(400).send( 'Temp Model not found' ) }

  await dta.saveStateModel( impDta.stateModel.id, stateModel )
  await dta.delDataObjNoEvent( 'app-temp', req.params.uid )

  res.redirect( '../../index.html?layout=StateAdmin-nonav' ) 
}
// ============================================================================

async function genStateFrm( req, res )  {
  log.info( 'getStateFrm', req.query )

  let imgOpts = []
  try {
    fs.readdirSync( __dirname + '/../gui/img' ).forEach( file => {
      if ( file.startsWith( 'state' ) && file.endsWith( '.png') ) {
        log.debug( 'img', file )
        imgOpts.push({ value: file })
      }
    })
  } catch ( exc ) { log.error( 'imgOpts', exc ) }

  let updateRes = [{ resId:'StateLst' }, { resId:'StateModel' }]
  res.send({
    id: 'AddStateForm',
    fieldGroups:[{ columns: [
      { formFields: [
        { id: "stateModelId", label: "Model Id", type: "text", hidden: true, value: req.query.id },
        { id: "stateId", label: "State Id", type: "text" },
        { id: "label",   label: "Label", type: "text" }
      ]},
      { formFields: [
        { id: "posXY", label: "Position x,y", type: "text", 
          descr: 'Box center x,z position, like: 20,30' },
        { id: "img", label: "Image", type: "text", options: imgOpts }
      ]}
    ] }],
    actions : [ 
      { id: "AddStateBtn", actionName: "Add / Update", update: updateRes, 
        actionURL: 'state-model/state', target: "modal" },
      { id: "StateBtnMvW", actionName: "W", update: updateRes, actionURL: 'state-model/state/move/w' },
      { id: "StateBtnMvN", actionName: "N", update: updateRes, actionURL: 'state-model/state/move/n' },
      { id: "StateBtnMvE", actionName: "E", update: updateRes, actionURL: 'state-model/state/move/e' },
      { id: "StateBtnMvS", actionName: "S", update: updateRes, actionURL: 'state-model/state/move/s' }
    ]
  })
}

async function getState( req, res )  {
  log.info( 'getStateTrnsTbl', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'getStateTrnsTbl no user')
    return res.status(401).send( 'login required' ) 
  }

  if ( req.query.id ) {  // this is StateModel ID, so get list of states
    let stateModel = await dta.getStateModelById( req.query.id )
    if ( ! stateModel ) { return res.status(400).send( 'model not found' ) }
  
    let stateArr = []
    for ( let stateId in stateModel.state ) {
      let state = stateModel.state[ stateId ]
      stateArr.push({ 
        stateModelId : req.query.id,
        stateId : stateId, 
        label   : ( state.label ? state.label : '' ),
        img     : ( state.img ? state.img : '' ),
        imgPic  : ( state.img ? '<img src="img/'+state.img+'"/>' : '' ),
        x       : ( state.x ? state.x : '' ),
        y       : ( state.y ? state.y : '' ),
      })
    }
   return res.send( stateArr )
  
  } else 
  if ( req.query.stateModelId && req.query.stateId ) {
    // get data for edit form
    let stateModel = await dta.getStateModelById( req.query.stateModelId )

    if ( ! stateModel ) { return res.status(400).send( 'model not found' ) }
    let state = stateModel.state[ req.query.stateId ]
    if ( ! state ) { return res.status(400).send( 'state not found' ) }
    posXY = ''
    if (  state.x &&  state.y ) { posXY =  state.x +','+  state.y }
    return res.send({
      stateModelId : req.query.stateModelId,
      stateId      : req.query.stateId,
      label        : ( state.label ? state.label : '' ),
      img          : ( state.img ? state.img : '' ),
      posXY        : posXY,
    })  
  }

  res.status(400).send( 'id od stateModelId required' )
}

async function udpState( req, res )  {
  log.info( 'udpState', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'udpState no user')
    return res.status(401).send( 'login required' ) 
  }
  if ( req.body.stateModelId && req.body.stateId ) {
    // get data for edit form
    let stateModel = await dta.getStateModelById( req.body.stateModelId )
    if ( ! stateModel ) { return res.status(400).send( 'model not found' ) }
    let state = stateModel.state[ req.body.stateId ]
    if ( ! state ) {
      log.info( 'udpState> ad new state' )
      stateModel.state[ req.body.stateId ] = {
        actions : {}
      }
      state = stateModel.state[ req.body.stateId ] 
    } 
    if ( req.body.posXY  &&  req.body.posXY != '' ) {
    let pos = req.body.posXY.split(',')
      state.x = getInt( state.x, pos[0] )
      state.y = getInt( state.x, pos[1] )
    } 

    if ( req.body.img  &&  req.body.img != '' ) {
      state.img = req.body.img
    } else {
      if ( state.img ) { delete state.img }
    }
    
    if ( req.body.label == '' ) {
      if ( Object.hasOwn( state, 'label') ) { delete state.label }
    } else {
      state.label = req.body.label
    }

    await dta.saveStateModel( req.body.stateModelId, stateModel )

    return res.send( 'OK' )
  }
  res.send( 'Error, id required' )  
}


async function moveState( req, res ) {
  log.debug( 'moveState', req.body, req.params )
  let stateModel = await dta.getStateModelById( req.body.stateModelId )
  if ( ! stateModel ) { return res.status(400).send( 'Model not found!' )}
  let state = stateModel.state[ req.body.stateId ]
  if ( ! state ) { return res.status(400).send( 'State not found!' )}
  switch ( req.params.dir ) {
    case 'w': if ( state.x >   20 ) { state.x -=20 }; break
    case 'e': if ( state.x < 2000 ) { state.x +=20 }; break
    case 'n': if ( state.y >   20 ) { state.y -=20 }; break
    case 's': if ( state.y <  400 ) { state.y +=20 }; break
    default:  return res.status(400).send( 'Wrong dir' )
  }
  await dta.saveStateModel( stateModel.id, stateModel )
  res.send()
}


async function getStateTransFrm( req, res )  {
  let stateModel = await dta.getStateModelById( req.query.id )
  let fromOpts = []
  let toOpts   = []
  if ( stateModel ) {
    for ( let stateId in stateModel.state ) {
      fromOpts.push({ value: stateId })
      if ( stateId != 'null' ) { toOpts.push({ value: stateId }) }
    }
  }
  res.send({
    id: 'AddStateTransitionForm',
    fieldGroups:[{ columns: [
      { formFields: [
        { id: "stateModelId", label: "Model Id", type: "text", hidden: true, value: req.query.id },
        { id: "actionId",     label: "Action ID", type: "text" },
        { id: "stateIdFrom",  label: "From State", type: "text", options: fromOpts },
        { id: "line", label: "Line", type: "text", 
          descr:'For non direct lines zou can add intermediate x,y points, like: 10,10;20,20' }  
        ]},
      { formFields: [
        { id: "actionName",   label: "Action Name", type: "text" },
        { id: "stateIdTo",    label: "To State", type: "text", options: toOpts },
        { id: "labelPosXY", label: "Label x,y", type: "text", 
          descr: 'Action label x,z position, like: 20,30' }  
      ]},
      { formFields: [
        { id: "apiManaged", label: "API Managed", type: "checkbox" }
      ]}
    ] }
    ],
    actions : [ 
      { id: "AddTransitionBtn", actionName: "Add / Update", update: [{ resId:'StateTransitionLst' }, { resId:'StateModel' }], 
        actionURL: 'state-model/transition', target: "modal" },
      { id: "DaleteTransitiontn", actionName: "Delete", update: [{ resId:'StateTransitionLst' }, { resId:'StateModel' }], 
        method: "DELETE", actionURL: 'state-model/transition', target: "modal" }
    ]
  })  
}
  

async function getStateTransitions( req, res )  {
  log.info( 'getStateTransitions', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'getStateTrnsTbl no user')
    return res.status(401).send( 'login required' ) 
  }
  if ( req.query.id ) {  
    // get array for stateModelId for table 
    let stateModel = await dta.getStateModelById( req.query.id )
    if ( ! stateModel ) { return res.status(400).send( 'not found' ) }

    let tbl = []
    for ( let stateId in stateModel.state ) {
      let state = stateModel.state[ stateId ]
      for ( let actionId in state.actions ) {
        let action = state.actions[ actionId ]
        let row = { 
          stateModelId : req.query.id ,
          transition   : stateId +' > '+ actionId,
          stateIdFrom  : stateId,
          stateIdTo    : action.to,
          actionId     : actionId,
          actionName   : ( action.label ? action.label : '' ),
          apiManaged   : ( action.apiManaged ? true : false )
        }
        tbl.push( row )
      }
    }
    return res.send( tbl )
  } else if ( req.query.stateModelId && req.query.stateIdFrom && req.query.stateIdTo && req.query.actionId ) {
    // get one rec for edit form
    let stateModel = await dta.getStateModelById( req.query.stateModelId )
    if ( ! stateModel ) { return res.status(400).send( 'not found' ) }
    let stateFrom = stateModel.state[ req.query.stateIdFrom ]
    let stateTo   = stateModel.state[ req.query.stateIdTo ]
    if ( ! stateFrom || ! stateTo || ! stateFrom.actions[ req.query.actionId ]) { return res.status(400).send( 'not found' ) }
    let lineStr = ''
    let action = stateFrom.actions[ req.query.actionId ]
    let line = action.line
    if ( line ) {
      let linestrArr = []
      for ( let p of line ) {
        linestrArr.push( p.x +','+ p.y )
      }
      lineStr = linestrArr.join(';')
    }
    let labelPosXY = ''
    let labelPos = action.labelPos
    if ( labelPos ) {
      labelPosXY = labelPos.x + ',' + labelPos.y
    }
    return res.send({
      stateModelId : req.query.stateModelId,
      stateIdFrom  : req.query.stateIdFrom,
      stateIdTo    : req.query.stateIdTo,
      actionId     : req.query.actionId,
      actionName   : ( action.label ? action.label : '' ),
      line         : lineStr,
      labelPosXY   : labelPosXY,
      apiManaged   : ( action.apiManaged ? true : false )
    })
  }
  res.status(400).send( 'id required' ) 
}


async function setStateTransitions( req, res )  {
  log.info( 'setStateTransitions', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'login required' ) }
  if ( req.body.stateModelId && req.body.stateIdFrom && req.body.stateIdTo && req.body.actionId ) {
    let stateModel = await dta.getStateModelById( req.body.stateModelId )
    if ( ! stateModel ) { return res.status(400).send( 'not found' ) }
    let stateFrom = stateModel.state[ req.body.stateIdFrom ]
    let stateTo   = stateModel.state[ req.body.stateIdTo ]
    if ( ! stateFrom || ! stateTo ) { return res.status(400).send( 'not found' ) }

    let action = stateFrom.actions[ req.body.actionId ]
    if ( ! action) {  // new action
      action = {
        to : req.body.stateIdTo
      }
      stateFrom.actions[ req.body.actionId ] = action
    }

    if ( req.body.actionName && req.body.actionName != '' ) {
      action.label = req.body.actionName
    } else if ( action.label) {
      delete action.label
    }
    if ( req.body.line && req.body.line != '' ) {
      let linePoints = req.body.line.split(';')
      action.line = []
      for ( let ptStr of linePoints ) {
        let point = ptStr.split(',')
        if ( point.length == 2 ) {
          action.line.push({
            x : getInt( 0, point[0] ),
            y : getInt( 0, point[1] )
          })  
        }
      }  
    } else if ( action.line) {
      delete action.line
    }

    if ( req.body.labelPosXY && req.body.labelPosXY != '' ) {
      let pos = req.body.labelPosXY.split(',')
      if ( pos.length == 2 ) {
        action.labelPos = {
          x : getInt( 0, pos[0] ),
          y : getInt( 0, pos[1] )
        }
      }
    } else if ( action.labelPos) {
      delete action.labelPos
    }


    if ( req.body.apiManaged  ) {
      action.apiManaged = true
    } else {
      if ( action.apiManaged ) { delete action.apiManaged }
    }

    log.info( 'action', action )

    await dta.saveStateModel( req.body.stateModelId, stateModel )

    return res.send( 'OK' )

  }
  res.status(400).send( ) 
}


async function delStateTransitions( req, res )  {
  log.info( 'delStateTransitions', req.body )
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { return res.status(401).send( 'Login required' ) }
  if ( req.body.stateModelId && req.body.stateIdFrom && req.body.actionId ) {
    let stateModel = await dta.getStateModelById( req.body.stateModelId )
    if ( ! stateModel ) { return res.status(400).send( 'StateModel not found' ) }
    let stateFrom = stateModel.state[ req.body.stateIdFrom ]
    if ( ! stateFrom ) { return res.status(400).send( 'StateFrom not found' ) }
    if ( ! stateFrom.actions[ req.body.actionId ]) {  
      return res.status(400).send( 'ActionId not found' )
    }
    delete stateFrom.actions[ req.body.actionId ]
    await dta.saveStateModel( stateModelId, stateModel )
    return res.send( 'OK' )
  }
  res.status(400).send( ) 
}

// ============================================================================

async function getStateModel( req, res )  {
  log.info( 'GET STM', req.query )
  let user = await userDta.getUserInfoFromReq( gui, req )

  let modelId = null
  if ( req.query.id.indexOf(',') > 0 ) {
    let { allOK, user, app, appId, entity, entityId } = await checkUserAppEntity( req, res )
    if ( ! allOK ) { return }
    modelId = entity.stateModel
  } else  if ( req.query.id ) {
    let idSplt = req.query.id.split('/')
    modelId = idSplt[ idSplt.length - 1 ]
  } else {
    return res.send({})
  }
  log.info( 'GET STM ', modelId )

  let stateModel = await dta.getStateModelById( user.rootScopeId+'/'+modelId )
  if ( ! stateModel ) { 
    log.warn( 'stateModel no found', stateModel, modelId )
    return res.status(400).send( 'not found required' ) 
  }
  
  let stm = { state: {} }
  
  let x = 100

  for ( let stateId in stateModel.state ) {
    let state = stateModel.state[ stateId ]
    let name = ( state.label ? state.label : stateId )
    if ( stateId == 'null' ) {
      name = '<span class="fontPlus1">'+modelId+'</span>'
    }
    stm.state[ stateId ] = {
      id    : stateId,
      name  : name,
      x     : ( state.x ? state.x : x ),
      y     : ( state.y ? state.y : 100 ), 
      color : 'k8s-bg-blue',
      rel : {}
    }
    if ( ! state.x ) { x += 150 }
    for ( let actionId in state.actions ) {
      let action = state.actions[ actionId ]
      stm.state[ stateId ].rel[ actionId ] = {
        to    : action.to,
        label : { txt: ( action.label ? action.label : actionId ) },
        line  : ( action.line ? action.line : [] )
      }
      if ( action.labelPos ) {
        stm.state[ stateId ].rel[ actionId ].label.pos = action.labelPos
      }
    }  
  }

  res.send( stm )
}

// ============================================================================

async function checkUserAppEntity( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    log.warn( 'checkUserAppEntity no user')
    res.status(401).send( 'login required' ) 
    return { allOK: false, user: null, app: null, entity: null, entityId: null }
  }
  let appId    = null 
  let entityId = null 
  if ( req.query.appId ) { 
    appId = req.query.appId 
  } else if ( req.query.id ) {
    appId = req.query.id.split(',')[0] 
  } else if ( req.body.appId ) {
    appId = req.body.appId 
  }
  if ( ! appId ) { 
    log.warn( 'checkUserAppEntity no appId')
    res.status(400).send([]) 
    return { allOK: false, user: user, app: null, appId: appId, entity: null, entityId: entityId }
  }
  if ( req.query.entityId ) { 
    entityId = req.query.entityId 
  } else if ( req.query.id ) {
    entityId = req.query.id.split(',')[1] 
  } else if ( req.body.entityId ) {
    entityId = req.body.entityId 
  }
  // let entityId = ( req.query.entityId ? req.query.entityId : req.query.id.split(',')[1] )
  let app = await dta.getAppById( appId )
  // log.info( 'GET /app/entity/property', appId, entityId, app )
  if ( ! app ) { 
    log.warn( 'app not found', appId, app )
    res.status(400).send('app not found') 
    return { allOK: false, user: user, app: null, appId: appId, entity: null, entityId: entityId }
  }
  if ( ! app.startPage ) { app.startPage = [] }
  if ( ! app.entity ) { app.entity = {} }
  if ( ! app.entity[ entityId ] ) {  
    log.warn( 'app entity not found', entityId )
    res.status(400).send('app entity not found') 
    return { allOK: false, user: user, app: app, entity: null }
  }
  return { allOK: true, user: user, app: app, appId: appId, entity: app.entity[ entityId ], entityId: entityId }
}

//-----------------------------------------------------------------------------

async function checkUserApp( req, res ) {
  let user = await userDta.getUserInfoFromReq( gui, req )
  if ( ! user ) { 
    res.status(401).send( 'login required' ) 
    return { allOK: false, user: null, app: null }
  }
  let appId    = null 
  if ( req.query.appId ) { 
    appId = req.query.appId 
  } else if ( req.query.id ) {
    appId = req.query.id.split(',')[0] 
  } else if ( req.body.appId ) {
    appId = req.body.appId 
  }
  if ( ! appId ) { 
    res.status(400).send([]) 
    return { allOK: false, user: user, app: null, appId: appId }
  }
  // let entityId = ( req.query.entityId ? req.query.entityId : req.query.id.split(',')[1] )
  let app = await dta.getAppById( appId )
  // log.info( 'GET /app/entity/property', appId, entityId, app )
  if ( ! app ) { 
    log.warn('GET entity: /app/entity/property not found')
    res.status(400).send([]) 
    return { allOK: false, user: user, app: null, appId: appId }
  }
  if ( ! app.startPage ) { app.startPage = [] }
  if ( ! app.entity ) { app.entity = {} }
  return { allOK: true, user: user, app: app, appId: appId }
}

// ============================================================================



function getInt( defaultVal, strVal ) {
  let val = Number.parseInt( strVal, 10 )
  if ( ! Number.isNaN( val ) ) {
    log.info( 'val', val )
    return val
  }
  return defaultVal
}