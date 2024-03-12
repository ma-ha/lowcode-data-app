const log     = require( '../helper/log' ).logger
const dta     = require( '../persistence/app-dta' )
const helper  = require( '../helper/helper' )

// All property type specific handling is done here

exports: module.exports = {
  getPropTypes,
  setPropRef,
  getpropTypeDef,
  addNewPropertyDef,
  genGuiTableFilterDef,
  genGuiTableColsDef,
  genGuiFormFieldsDef,
  genGuiFormStateChangeDef,
  reformatDataReturn,
  genEmptyDataReturn,
  reformatDataTableReturn,
  reformatDataUpdateInput,  
  validateParam
}

// ============================================================================

function getPropTypes() {
  return [
    'String', 'Text',
    'Boolean', 'Number', 'Date', 
    'Select', 
    'DocMap', 'SelectRef', 'MultiSelectRef', /* 'RefArray',*/ 
    'UUID', 'Metric', 'Link', 'JSON', 'Event' 
  ]
}


function setPropRef( prop, dbProp ) {
  switch ( dbProp.type ) {
    case 'Text':
      prop.ref = dbProp.lines
      break 
    case 'Select':
      prop.ref = dbProp.options.join()
      break 
    case 'SelectRef':
      prop.ref  = dbProp.selectRef
      break 
    case 'MultiSelectRef':
      prop.ref  = dbProp.multiSelectRef
      break 
    case 'DocMap':
      prop.ref  = dbProp.docMap
      break 
    case 'Ref':
      prop.ref  = dbProp.ref
      break 
    case 'RefArray':
      prop.ref  = dbProp.refArray
      break 
    case 'Link':
      prop.ref  = dbProp.link
      break 
    case 'Event':
      prop.ref  = dbProp.event
      break 
    default: break 
  }
}


function getpropTypeDef( prop ) {
  let pType = ( prop.type ? prop.type : "?" )
  switch ( pType ) {
    case 'Text':
      pType = "Text ("+prop.lines+')'
      break 
    case 'Select':
      pType = "Select: ["+prop.options.join()+']'
      break 
    case 'SelectRef':
      pType = "SelectRef: " + genLink( 'AppEntityProperties-nonav', prop.selectRef ) 
      break 
    case 'MultiSelectRef':
      pType = "MultiSelectRef: " + genLink( 'AppEntityProperties-nonav', prop.multiSelectRef ) 
      break 
    case 'DocMap':
      pType = "DocMap: " + genLink( 'AppEntityProperties-nonav',  prop.docMap )
      break 
    case 'Ref':
      pType = "Ref: "+ + genLink( 'AppEntityProperties-nonav', prop.ref ) 
      break 
    case 'RefArray':
      pType = "RefArray: "+prop.refArray
      break 
    case 'Link':
      pType = "Link: "+prop.link
      break 
    case 'Event':
      pType = 'Event: '+prop.event
      break 
    default: break 
  }
  return pType
}


async function addNewPropertyDef( prop, type, ref  ) {

  // special types need additional info
  if ( type == 'Text' ) {

    prop.lines = 3
    if ( ref && ref !== '' ) { 
      let cnt = Number.parseInt( ref )
      if ( cnt != NaN && cnt > 0 ) {
        prop.lines = cnt
      }
    } 

  } else if ( type == 'Select' ) {

    prop.options = ref.split(',')

  } else   if ( type == 'Link' ) {

    prop.link = ref

  } else   if ( type == 'Event' ) {

    prop.event = ref

  } else if ( ['DocMap','SelectRef','MultiSelectRef','RefArray','Ref'].includes(  type ) ) {

    if ( ! ref ) {
      return res.status(400).send( '"ref" is required' ) 
    }
    let p = ref.split('/')
    if ( type == 'DocMap'  ) { 
      if ( p.length != 5 ) {
        return res.status(400).send( '"ref" format must be like  "scope/app/version/entity/prop"' ) 
      }
    } else if ( p.length != 4 ) { // shpuld be  scope/app/version/entity
      return res.status(400).send( '"ref" format must be like  "scope/app/version/entity"' ) 
    }
    let refAppId    = p[0] +'/'+ p[1] +'/'+ p[2]
    let refEntityId = p[3]
    let refApp =  await dta.getAppById( refAppId )
    if ( ! refApp ) {
      return res.status(400).send( '"ref" app "'+refAppId+'" not found' ) 
    }
    if ( ! refApp.entity[ refEntityId] ) {
      refApp.entity[ refEntityId ] = {
        title : refEntityId,
        scope : 'inherited',
        maintainer : ['appUser'],
        properties : {}
      }
      addResultTxt += ', created new entity "'+ ref + '"'
    }
    switch ( type ) {
      case 'DocMap':
        let refPropertyId = p[4]
        if ( ! refApp.entity[ refEntityId ].properties[ refPropertyId ] ) {
          refApp.entity[ refEntityId ].properties[ refPropertyId ] = {
            type: "String"
          }
          addResultTxt += ', created property "'+ refPropertyId + '"'
        }
        prop.docMap = ref
        break
      case 'SelectRef':
        prop.selectRef = ref
        break
      case 'MultiSelectRef':
        prop.multiSelectRef = ref
        break
      case 'RefArray':
        prop.refArray = ref
        break
      case 'Ref':
        prop.ref = ref
        break
      default: break
    }
  }
}

// ============================================================================

function genGuiTableFilterDef( entityMap ) {
  filter = []
  for ( let propId in entityMap ) {
    let prop =  entityMap[ propId ]
    let label = ( prop.label ? prop.label : propId )
    if ( prop.filter ) {
      let pId = propId.replaceAll('.','_')
      if ( prop.type == 'Select' ) {
        let optArr = [{ option: ' ', value: ' ' }]
        for ( let val of prop.options ) { 
          optArr.push( { option: val, value: val })
        }
        filter.push({ id: pId, label: label, type: 'select', options: optArr  })
      } else {
        filter.push({ id: pId, label: label })
      }
    }
  }
  return filter
}


function genGuiTableColsDef( entityMap ) {
  let cnt = 0
  for ( let propId in entityMap ) { cnt++ }
  let width = Math.round( 80/cnt ) + '%'

  let cols = []
  for ( let propId in entityMap ) {
    let prop =  entityMap[ propId ]
    let pId = propId.replaceAll('.','_')
    if ( prop.noTable ) { continue }
    let label = ( prop.label ? prop.label : propId )

    if ( propId == 'id' ) { continue }

    switch ( prop.type ) {
      case 'Boolean':
        cols.push({ id: pId, label : label, cellType: 'checkbox', width:width })
        break 
      // case 'Date':
      //   cols.push({ id: propId, label : label, cellType: 'date', width:width }) 
      //   break 
      case 'JSON':
        cols.push({ id: propId+'JSON', label : label, cellType: 'text', width:width }) 
        cols.push({ id: propId, label : propId+'JSON', cellType: 'tooltip' }) 
        break 
      default:  // String, Number, Select, Event, Link, RefArray, Ref, DocMap, SelectRef
        cols.push({ id: pId, label : label, cellType: 'text', width:width }) 
        break 
    }
  }
  return cols
}


async function genGuiFormFieldsDef( entity, filter, user, stateTransition, render ) {
  let cols = []

  if ( entity.properties[ 'id' ] && entity.properties[ 'id' ].type == 'UUID' ) {
    cols.push({ formFields: [{ 
      id: "id", 
      label: ( entity.properties[ 'id' ].label ? entity.properties[ 'id' ].label : "Id (UUID)" ), 
      type: "text", readonly: true, descr: 'ID is auto generated'
    } ]})
  } else if ( entity.stateModel ) { 
    // prevent create via the edit form
    cols.push({ formFields: [{ id: "id", label: "Id", type: "text", readonly: true } ]})
  } else { // every data rec need an id
    cols.push({ formFields: [{ id: "id", label: "Id", type: "text" } ]})
  }

  let fieldDefault = {}
  for ( let propId in entity.properties ) { // to fill fieldDefault
    let defaultVal = null
    let prop = entity.properties[ propId ]
    if ( stateTransition && prop.stateTransition ) {
      if ( prop.stateTransition[ stateTransition+'_default' ] ) {
        defaultVal = prop.stateTransition[ stateTransition +'_default' ]
      }
    }
    fieldDefault[ propId ] = defaultVal
  }

  for ( let propId in entity.properties ) {
    if ( propId == 'id' ) { continue }
    let prop = entity.properties[ propId ]
    if ( prop.noEdit && ! stateTransition ) { continue }
    let lbl  = ( prop.label ? prop.label : propId )
    let fldId = propId.replaceAll('.','_')
    // console.log( 'LBL', lbl)

    let defaultVal = null
    if ( stateTransition ) {
      if ( prop.stateTransition ) {
        // if ( prop.stateTransition[ stateTransition+'_default' ] ) {
        //   defaultVal = prop.stateTransition[ stateTransition +'_default' ]
        // }
        defaultVal = fieldDefault[ propId ]
        if ( ! prop.stateTransition[ stateTransition ] ) {
          if ( defaultVal ) {  
            cols.push({ formFields: [ { id: fldId, label: lbl, type: 'text', defaultVal: defaultVal, readonly: true } ] })
          }
          continue
        }
      } else {
        continue
      }
    } 
    
    if ( prop.apiManaged ) { 
      cols.push({ formFields: [ { id: fldId, label: lbl, type: 'text', readonly: true } ] })
      continue 
    }

    let fld = null

    switch ( prop.type ) {
      case 'Text':
        if ( render && render == 'small') {
          fld = { id: fldId, label: lbl, type: 'text', rows: 1 }
        } else {
          fld = { id: fldId, label: lbl, type: 'text', rows: prop.lines }
        }
        break 
      case 'Boolean':
        fld = { id: fldId, label: lbl, type: 'checkbox' }
        break 
      case 'Date':
        fld = { id: fldId, label: lbl, type: 'date' }
        break 
      case 'Select':
        fld = { id: fldId, label: lbl, type: 'select', options: [] }
        for ( let val of prop.options ) {
          let opt = { option: val }
          if ( val == defaultVal ) { opt.selected = true }
          if ( filterMatch( defaultVal, { val: val }, fieldDefault ) ) {
            fld.options.push( opt )
          }
        }
        break 
      case 'SelectRef':
        fld = { id: fldId, label: lbl, type: 'select', options: [] }
        try {
          let opdTbl = await dta.getData( prop.selectRef, user.scopeId )
          let refEntity = await getEntity( prop.selectRef, propId )
          for ( let recId in opdTbl ) { 
            if ( filterMatch( defaultVal, opdTbl[recId], fieldDefault ) ) {
              fld.options.push({ 
                value  : recId, 
                option : getRefLabel( refEntity, recId, opdTbl[recId] ) 
              }) 
            }
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'MultiSelectRef':
        fld = { id: fldId, label: lbl, type: 'select', options: [], multiple: true }
        try {
          let opdTbl = await dta.getData( prop.multiSelectRef, user.scopeId )
          let refEntity = await getEntity( prop.multiSelectRef, propId )
          for ( let recId in opdTbl ) { 
            if ( filterMatch( defaultVal, opdTbl[recId], fieldDefault ) ) {
              fld.options.push({ 
                value: recId, 
                option: getRefLabel( refEntity, recId, opdTbl[recId] ) 
              }) 
            }
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'Ref': 
        // TODO
        break 
      case 'RefArray':
        // TODO
        break 
      case 'UUID':
        fld = { id: fldId, label: lbl, type: 'text', readonly: true }
        break 
      case 'Link': 
        // do nothing
        break 
      case 'DocMap':
        // do nothing
        break 
      case 'Event':
        // do nothing
        break 
      case 'Metrics':
        // do nothing
        break 
      case 'JSON':
        if ( render && render == 'small') {
          fld = { id: fldId, label: lbl, type: 'text', rows: 2 }
        } else {
          fld = { id: fldId, label: lbl, type: 'text', rows: 5 }
        }
        break 
      default:   // String, Number
        fld = { id: fldId, label: lbl, type: 'text' }
        if ( defaultVal ) { fld.defaultVal = defaultVal }
        break 
    }

    if ( filter && filter.field == propId ) { // ??
      fld.defaultVal = filter.value
      fld.readonly   = "true" 
    }
    // if ( prop.apiManaged ) {
    //   fld.readonly   = true
    // }
    if ( prop.description ) { fld.descr = renderTooltip( prop.description ) }

    if ( fld ) {
      cols.push({ formFields: [ fld ] })
    }
  }
  return cols
}

function filterMatch( filter, dta, fieldDefault ) {
  if ( ! filter || filter == '' ) { return true }
  //log.info( 'filterMatch', filter, dta, fieldDefault )
  try {
    if ( filter.indexOf(' $eq ') > 0 ) {
      let { ref1, ref2 } = splitQry( filter, ' $eq ' )
      let val1 = getVal( ref1, dta, fieldDefault )
      let val2 = getVal( ref2, fieldDefault, dta )
      log.info( 'filterMatch >', filter, '"'+ref1+'"', '"'+ref2+'"', '"'+val1+'"', '"'+val2+'"' )
      return ( val1 == val2 ) 
    } else {
      return true
    } 
  } catch ( exc ) { log.warn( '', exc.message ) }
  return true
}

function splitQry( filter, cmpStr ) {
  let pos = filter.indexOf( cmpStr )
  let ref1 = filter.substr( 0, pos  )
  let ref2 = filter.substr( pos + cmpStr.length )
  return { ref1: ref1, ref2: ref2 }
}

function getVal( ref, dta1, dta2 ) {
  if ( ref.startsWith("'") || ref.endsWith("'") ) {
    return ref.substr( 1, ref.length-2 )
  } else if ( dta1[ ref ] ) {
    return dta1[ ref ]
  } else if ( dta2[ ref ] ) {
    return dta2[ ref ] 
  }
  return ref
}

async function genGuiFormStateChangeDef( entity, filter, user, stateTransition, rec, stateModel ) {
  log.info( 'genGuiFormStateChangeDef', entity, stateTransition )
  let fields = []

  let stateId = stateTransition.split('_')[0] 
  let actionId = stateTransition.split('_')[1] 
  let newState = stateModel.state[ stateId ].actions[ actionId ].to
  fields.push({ id: "_state", label: "<b>New State</b>", type: "text", readonly: true, value: newState})
  fields.push({ id: "id", label: "Id", type: "text", readonly: true, value: rec.id })
  fields.push({ id: "scopeId", label: "Scope", type: "text", hidden: true, value: rec.scopeId })

  for ( let propId in entity.properties ) {
    if ( propId == 'id' ) { continue }
    let prop = entity.properties[ propId ]
    let lbl  = ( prop.label ? prop.label : propId )
    let defaultVal = null 
    if ( prop.stateTransition && prop.stateTransition[ stateTransition+'_default' ] ) {
      defaultVal = prop.stateTransition[ stateTransition+'_default' ] 
    }
    // console.log( 'LBL', lbl)
    // TODO
    let fld = null

    switch ( prop.type ) {
      case 'Text':
        fld = { id: propId, label: lbl, type: 'text', rows: prop.lines, defaultVal: rec[ propId ] }
        break 
      case 'Boolean':
        fld = { id: propId, label: lbl, type: 'checkbox', value: rec[ propId ] }
        break 
      case 'Date':
        fld = { id: propId, label: lbl, type: 'date', value: rec[ propId ] }
        break 
      case 'Select':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        for ( let val of prop.options ) { 
          let opt = { option: val }
          if ( defaultVal ) {
            if ( val == defaultVal ) { opt.selected = true }
          } else {
            if ( val == rec[ propId ] ) { opt.selected = true }
          }
          fld.options.push( opt )
        }
        break 
      case 'SelectRef':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        try {
          let opdTbl = await dta.getData( prop.selectRef, user.scopeId )
          for ( let recId in opdTbl ) { 
            fld.options.push({ option: recId }) 
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'MultiSelectRef':
        fld = { id: propId, label: lbl, type: 'select', options: [], multiple: true }
        try {
          let opdTbl = await dta.getData( prop.multiSelectRef, user.scopeId )
          for ( let recId in opdTbl ) { 
            fld.options.push({ option: recId }) 
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'Ref': 
        // TODO
        break 
      case 'RefArray':
        // TODO
        break 
      case 'UUID':
        fld = { id: propId, label: lbl, type: 'text', readonly: true }
        break 
      case 'Link': 
        // do nothing
        break 
      case 'DocMap':
        // do nothing
        break 
      case 'Event':
        // do nothing
        break 
      case 'Metrics':
        // do nothing
        break 
      case 'JSON':
        let jsonStr = ( rec[ propId ] ? JSON.stringify( rec[ propId ] , null, ' ' ) : '{}' )
        fld = { id: propId, label: lbl, type: 'text', rows: "5", defaultVal: jsonStr }
        break 
      default:   // String, Number
        fld = { id: propId, label: lbl, type: 'text', value: rec[ propId ] }
        if ( defaultVal ) { fld.value = defaultVal }
        break 
    }

    if ( prop.description ) { fld.descr = renderTooltip( prop.description ) }

    if ( prop.apiManaged ) { fld.readonly = true } 
    if ( stateTransition ) {
      if ( ! prop.stateTransition || ! prop.stateTransition[ stateTransition ] ) {
        fld.readonly = true 
      }
    }
    if ( filter && filter.field == propId ) {
      fld.defaultVal = filter.value
      fld.readonly   = "true" 
    }
    
    if ( fld.readonly  && fld.type == 'select' ) { 
      fld.type  = 'text'
      fld.value = ( defaultVal ? defaultVal : rec[ propId ] )
      delete fld.options
    }

    if ( fld ) {
      // cols.push({ formFields: [ fld ] })
      fields.push( fld )
    }
  }
  return [ { formFields: fields } ]
}

// ============================================================================

function reformatDataReturn( entity, result  ) {
  for ( let propId in entity.properties )  {
    try {
      
      if ( entity.properties[ propId ].type == 'JSON' ) {
      
        try {
          log.debug( 'result[ propId ]',propId,result[ propId ] )
          result[ propId ] = ( result[ propId ] ? JSON.stringify( result[ propId ], null, ' ' ) : '{}' )
        } catch ( exc ) { 
          log.warn('getDoc nz id> stringify JSON', exc ) 
          result[ propId ] = result[ propId ] + ''
        }
      
      } else if ( entity.properties[ propId ].type == 'Date'  ) {
        
        try {
          result[ propId ] = new Date( result[ propId ] ).getTime()
        } catch ( exc ) { log.warn('getDoc nz id> Date', exc ) }

      }
    } catch ( exc ) { log.warn('getDoc nz id> stringify JSON', exc ) }
  }
}


function genEmptyDataReturn( entity ) {
  let rec = {}
  for ( let propId in entity.properties ) {
    if ( entity.properties[propId].type != 'Select' ) {
      rec[ propId ] = ''
    } else {
      rec[ propId ] =  entity.properties[propId].options[0]
    }
  }
  return rec
}


async function reformatDataTableReturn( entity, rec, url, stateModel ) {
  let tblRec = { recId: rec.id }
  log.debug( 'getDoc rec', rec, stateModel )
  if ( stateModel ) {
    tblRec[ '_state' ]= rec[ '_state' ]
    let actions = []
    let state = stateModel.state[ rec[ '_state' ] ]
    if ( state ) {
      if ( state.img ) {
        tblRec[ '_state' ] = '<img src="img/'+state.img+'" title="'+( state.label ? state.label : rec[ '_state' ] )+'"/>'
      }

      for ( let actionId in state.actions ) {
        let action =  state.actions[ actionId ]
        if ( action.apiManaged ) { continue }
        let lnkTxt = ( action.label ? action.label : actionId ) +''
        lnkTxt = lnkTxt.replaceAll( ' ', '&nbsp;' )
        // TODO change to button
        if ( action.icon ) {
          let navId = url +'/'+ rec[ '_state' ] +'_'+ actionId
          let lnk = '<span class="StatusActionLink"><a href="index.html?layout=AppEntityAction-nonav&id='+navId+'">'+ lnkTxt + '</a></span>'
          actions.push( lnk )
        } else {
          let navId = url +'/'+ rec[ '_state' ] +'_'+ actionId
          let lnk = '<span class="StatusActionLink"><a href="index.html?layout=AppEntityAction-nonav&id='+navId+'">'+ lnkTxt + '</a></span>'
          actions.push( lnk )
        }
        
      }
    }
    tblRec[ '_stateBtn' ] = actions.join( '' )
  }

  for ( let propId in entity.properties ) {
    let prop = entity.properties[ propId ]
    let pId = propId.replaceAll('.','_')
    let label = ( prop.label ? prop.label : propId )

    let recDta = null
    if ( prop.jsonId ) {
      if ( rec[ prop.jsonId ] && rec[ prop.jsonId ][ prop.subId ] ) {
        recDta = rec[ prop.jsonId ][ prop.subId ]
      }
    } else {
      recDta = rec[ propId ]
    }
    log.debug( 'getDoc', propId, prop.type )

    switch ( prop.type ) {
      case 'Text':
        tblRec[ pId ] = ( recDta ? recDta : '' ) 
        if ( tblRec[ pId ].length > 100 ) { tblRec[ pId ] = tblRec[ pId ].substr(0,100) +'...' }
        break 
      case 'SelectRef':
        tblRec[ pId ] = ''
        if ( recDta  && recDta  != '' ) {
          let refEntity = await getEntity( prop.selectRef, propId )
          let refParts = prop.selectRef.split('/')
          let refDta = await dta.getDataById( refParts[0]+refParts[3], recDta )
          tblRec[ pId ] = getRefLabel( refEntity, recDta, refDta ) 
        }
        // tblRec[ pId ] = 'X'+ ( recDta ? recDta : '' ) // TODO
        break 
      case 'DocMap':
        let params = prop.docMap.split('/')
        let param = params[0]+'/'+params[1]+'/'+params[2]+','+params[3] + ','+ params[4] +'='+ rec.id
        tblRec[ pId ] = '<a href="index.html?layout=AppEntity-nonav&id='+param+'">'+label+'</a>'
        break 
      case 'Ref':
        tblRec[ pId ] = ( recDta ? recDta : '' ) // TODO
        break 
      case 'RefArray':
        tblRec[ pId ] = ( recDta ? recDta : '' ) // TODO
        break 
      case 'Link': 
        if ( prop.link ) {
          let href = prop.link
          href = href.replaceAll( '${id}', rec[ 'id' ] )
          href = href.replaceAll( '${scopeId}', rec[ 'scopeId' ] )
          for ( let replaceId in entity.properties ) {
            href = href.replaceAll( '${'+replaceId+'}', rec[ replaceId ] )
          }
          tblRec[ pId ] = '<a href="'+href+'" target="_blank">'+label+'</a>'
        } else { tblRec[ pId ] = '' }
        break 
      case 'JSON': 
        if ( ! recDta ) {
          tblRec[ pId + 'JSON' ] = '-'
          tblRec[ pId ] =  'undefined'
        } else if ( recDta.constructor === Object &&  Object.keys(recDta).length === 0  ) {
          tblRec[ pId + 'JSON' ] = '{}'
          tblRec[ pId ] =  '{}'
        } else {
          tblRec[ pId + 'JSON' ] = '{...}'
          let jsonStr = ''
          try {
            jsonStr = JSON.stringify( recDta, null, ' ' ) 
          } catch ( exc ) { jsonStr = exc.message }
          tblRec[ pId ] = jsonStr
        }
        break 
      case 'Event': 
        let eventLnk = '<a href="'+url+'/'+propId+'">'+( prop.label ? prop.label : propId ) +'</a>'
        if ( rec.eventArr &&  rec.eventArr.indexOf(propId) >= 0 ) {
          eventLnk = 'Pending...'
        } else if ( prop.event && prop.event.indexOf('==') > 0 ) {
          let cnd = prop.event.split('==')
          let cndProp = cnd[0].trim()
          let cndValArr = cnd[1].split(',')
          for ( let cndVal of cndValArr ) {
            if ( rec[ cndProp ]  &&  rec[ cndProp ] != cndVal.trim() ) {
              eventLnk = ''
            }
          }
        } else if ( prop.event && prop.event.indexOf('!=') > 0 ) {
          let cnd = prop.event.split('!=')
          let cndProp = cnd[0].trim()
          let cndValArr = cnd[1].split(',')
          for ( let cndVal of cndValArr ) {
            if ( rec[ cndProp ]  &&  rec[ cndProp ] == cndVal.trim() ) {
              eventLnk = ''
            }
          }
        } 

        tblRec[ pId ] = eventLnk //recDta.event
        break 
      default:   // String, Number, Select
        tblRec[ pId ] = ( recDta ? recDta : '' )
        break 
    }
  }
  return tblRec
}


function reformatDataUpdateInput( entity, rec ) {
  log.debug( 'reformatDataUpdateInput', rec )
  if ( ! rec.id ) {
    if ( entity.properties[ 'id' ]  &&  entity.properties[ 'id' ].type == 'UUID' ) {
      rec.id = helper.uuidv4()
    } else {
      return { err: 'ERROR: id required' }
    }
  }


  for ( let propId in entity.properties ) try {
    if ( entity.properties[ propId ].jsonId ) { continue } // need to do JSON first

    // JSOM input must be parsed to obj tree
    if ( entity.properties[ propId ].type == 'JSON' ) { 

      try {
        log.debug( 'JSON', propId, rec[ propId ], rec )
        if ( rec[ propId ] ) {
          rec[ propId ] = JSON.parse( rec[ propId ] )
        } else {
          rec[ propId ] = {}
        }
      } catch ( exc ) { 
        log.warn( 'addDoc: Parse JSON', exc ) 
        rec[ propId ] = {}
      }
    
    } else if ( entity.properties[ propId ].type == 'MultiSelectRef' ) { 

      try {
        log.debug( 'MultiSelectRef', propId, rec[ propId ], rec )
        rec[ propId ] = []
        if ( rec[ propId+'[]' ] ) {
          if ( Array.isArray( rec[ propId+'[]' ] ) ) {
            rec[ propId ] = rec[ propId+'[]' ]
          } else {
            rec[ propId ].push( rec[ propId+'[]' ] )
          }
          delete rec[ propId+'[]' ]
        } 
      } catch ( exc ) { 
        log.warn( 'addDoc: Parse MultiSelectRef', exc ) 
        rec[ propId ] = {}
      }
    }

  } catch ( exc ) { 
    log.warn( 'reformatDataUpdateInput', exc ) 
    return { err: exc.message }
  }

  for ( let propId in entity.properties ) try {
    if ( ! entity.properties[ propId ].jsonId ) { continue } //now do onlyJSON sub elements
    let jsonId = entity.properties[ propId ].jsonId
    let subId  = entity.properties[ propId ].subId
    if ( rec[  jsonId +'_'+ subId ] ) {
      if ( ! rec[ jsonId ] ) {
        rec[ jsonId ] = {}
      }
      rec[ jsonId ][ subId ] = rec[ jsonId +'_'+ subId ]
      delete rec[ jsonId +'_'+ subId ]
    }

  } catch ( exc ) { 
    log.warn( 'reformatDataUpdateInput', exc ) 
    return { err: exc.message }
  }

  return {}
}

// ============================================================================
function validateParam( p, type) {
  switch ( type ) {
    case 'String':  if ( typeof p === 'string' ) { return true }; break
    case 'Text':    if ( typeof p === 'string' ) { return true }; break
    case 'Number':  if ( isNaN( p ) ) { return  true}; break
    case 'Boolean': if ( typeof p === 'boolean' ) { return  true}; break
    // case 'Date':   /* TODO */ break
    case 'Select':  if ( typeof p === 'boolean' ) { return  true}; break
    // case 'DocMap':  /* TODO */  break
    // case 'SelectRef':  /* TODO */  break
    // case 'MultiSelectRef':  /* TODO */  break
    case 'JSON':  if ( typeof p === 'object' ) { return  true}; break
    case 'Link':  if ( typeof p === 'string' ) { return  true}; break
    case 'UUID':  if ( typeof p === 'string' ) { return  true}; break
    default: return true
  }
  return false 
}
// ============================================================================

function genLink( page, id ) {
  let param = getRefId( id )
  let lnk = 'index.html?layout='+page+'&id='+param
  let ref = '<a href="'+lnk+'">'+id+'</>'
  return ref 
}

function getRefId( id ) {
  let param = ''
  try {
    let p = id.split('/')
    param = p[0] +'/'+ p[1] +'/'+ p[2] +','+ p[3]
  } catch ( exc ) { log.warn( 'gen link failed', id, exc ) }
  return param
}

// ============================================================================

async function getEntity( refId, propId ) {
  log.info( 'getEntity', refId, propId )
  try {
    let idParts = refId.split('/')
    let appId = idParts[0] + '/' + idParts[1] + '/' + idParts[2] 
    let app = await dta.getAppById( appId )
    if ( app && app.entity[ idParts[3] ] ) {
      return app.entity[ idParts[3] ]
    }
  } catch ( exc ) { log.warn( 'getEntity', exc.message )  }
  log.warn( 'getEntity no entity for for', refId)
  return null
}

function getRefLabel( entity, recId, rec ) {
  log.debug( 'getRefLabel', entity, recId, rec )
  let lbl = []
  if ( entity ) {
    for ( let propId in entity.properties ) {
      if ( entity.properties[ propId ].refLbl && rec[ propId ] ) {
        lbl.push( rec[ propId ] )
      }
    }  
  }
  if ( lbl.length == 0 ) {
    return recId
  }
  return lbl.join(' ')
}



function renderTooltip( descr ) {
  return descr.replaceAll('\"',"&quot;")
}