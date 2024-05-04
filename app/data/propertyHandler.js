const log     = require( '../helper/log' ).logger
const dta     = require( '../persistence/app-dta' )
const helper  = require( '../helper/helper' )

// All property type specific handling is done here

exports: module.exports = {
  getPropTypes,
  setPropRef,
  getIndex,
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
    'String', 'String QR/Barcode', 'Text',
    'Boolean', 'Number', 'Date', 
    'UUID', 'UUID-Index',
    'Select', 
    'DocMap', 'SelectRef', 'MultiSelectRef', /* 'RefArray',*/ 
    'Metric', 'Link', 'JSON', 'Event', 'BLOB',
    'API static string' 
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
    case 'API static string':
      prop.ref = dbProp.apiString 
    default: break 
  }
}


function getpropTypeDef( prop ) {
  let pType = ( prop.type ? prop.type : "?" )
  switch ( pType ) {
    case 'String':
      if ( prop.qr ) { pType = 'String QR/Barcode' }
      break 
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
    case 'API static string':
      pType = 'API static string: '+ prop.apiString 
    default: break 
  }
  return pType
}


async function addNewPropertyDef( prop, type, ref  ) {

  // special types need additional info
  if ( type == 'String' ) {

      if ( prop.qr ) { delete prop.qr }

  } else if ( type == 'String QR/Barcode' ) { // special String type
    
    prop.type = 'String'
    prop.qr   = true

  } else if ( type == 'Text' ) {

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
      return { error: '"ref" is required' } 
    }
    let p = ref.split('/')
    if ( type == 'DocMap'  ) { 
      if ( p.length != 5 ) {
        return { error: '"ref" format must be like  "scope/app/version/entity/prop"' }
      }
    } else if ( p.length != 4 ) { // shpuld be  scope/app/version/entity
      return { error: '"ref" format must be like  "scope/app/version/entity"' }
    }
    let refAppId    = p[0] +'/'+ p[1] +'/'+ p[2]
    let refEntityId = p[3]
    let refApp =  await dta.getAppById( refAppId )
    if ( ! refApp ) {
      return { error: '"ref" app "'+refAppId+'" not found' }
    }
    if ( ! refApp.entity[ refEntityId] ) {
      refApp.entity[ refEntityId ] = {
        title : refEntityId,
        scope : 'inherited',
        maintainer : ['appUser'],
        properties : {}
      }
      // addResultTxt += ', created new entity "'+ ref + '"'
    }
    switch ( type ) {
      case 'DocMap':
        let refPropertyId = p[4]
        if ( ! refApp.entity[ refEntityId ].properties[ refPropertyId ] ) {
          refApp.entity[ refEntityId ].properties[ refPropertyId ] = {
            type: "String"
          }
          // addResultTxt += ', created property "'+ refPropertyId + '"'
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
  } else if ( type == 'API static string' ) {
    prop.apiString = ref
    prop.noTable   = true
    prop.filter    = false
  }
  return { status: 'OK' }
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


function genGuiTableColsDef( entity, maxWidth=80 ) {
  let properties = entity.properties
  let cnt = 0
  for ( let propId in properties ) { 
    let prop =  properties[ propId ]
    if ( prop.noTable ) { continue }
    if ( prop.colWidth ) {
      switch ( prop.colWidth ) {
        case 'XS': cnt += 1; break
        case 'S' : cnt += 2; break
        case 'M' : cnt += 3; break
        case 'L' : cnt += 4; break
        case 'XL': cnt += 5; break
        default  : cnt += 3; break
      }
    } else { cnt += 3  } // default is M
  }
  let widthUnits = Math.round( maxWidth / cnt )

  function calcWith( prop ) {
    let wi = widthUnits * 3
    if ( prop.colWidth ) {
      switch ( prop.colWidth ) {
        case 'XS': wi = widthUnits * 1; break
        case 'S' : wi = widthUnits * 2; break
        case 'M' : wi = widthUnits * 3; break
        case 'L' : wi = widthUnits * 4; break
        case 'XL': wi = widthUnits * 5; break
      }
    }
    return wi + '%'
  }

  let indexKey = getIndex( entity )

  let cols = []
  for ( let propId in properties ) {
    let prop =  properties[ propId ]
    if ( propId == indexKey ) { continue }
    if ( prop.noTable       ) { continue }

    let pId = propId.replaceAll('.','_')
    let label = ( prop.label ? prop.label : propId )


    switch ( prop.type ) {
      case 'Boolean':
        cols.push({ id: pId, label : label, cellType: 'checkbox', width: calcWith( prop )  })
        break 
      // case 'Date':
      //   cols.push({ id: propId, label : label, cellType: 'date', width:width }) 
      //   break 
      case 'JSON':
        cols.push({ id: propId+'JSON', label : label, cellType: 'text', width: calcWith( prop )  }) 
        cols.push({ id: propId, label : propId+'JSON', cellType: 'tooltip' }) 
        break 
      default:  // String, Number, Select, Event, Link, RefArray, Ref, DocMap, SelectRef
        cols.push({ id: pId, label : label, cellType: 'text', width: calcWith( prop )  }) 
        break 
    }
  }
  log.debug( cols )
  return cols
}


function getIndex( entity ) {
  for ( let propId in entity.properties ) {
    if ( entity.properties[ propId ].type == 'UUID-Index' ) {
      return propId
    }
  }
  if ( entity.properties.id ) {
    return 'id'
  }
  return null
}

async function genGuiFormFieldsDef( entity, filter, user, stateTransition, render ) {
  log.debug( 'genGuiFormFieldsDef filter', filter )
  let cols = []
  let fldCnt = 0
  let fldArr = []
  let indexKey = getIndex( entity )
  let indexField = ( indexKey ? entity.properties[ indexKey ] : null )
  if ( indexField && indexField.type.startsWith( 'UUID' ) ) {
    if ( !( stateTransition && stateTransition.startsWith( 'null_' ) ) ) {
      if ( ! indexField.noEdit ) {
        fldArr.push({ 
          id: indexKey, 
          label: (indexField.label ? indexField.label : "Id (UUID)" ), 
          type: "text", readonly: true, descr: 'ID is auto generated'
        })
        fldCnt ++ 
      } else {
        fldArr.push({ id: indexKey, type: "text", hidden: true, value: '' })
      }
    }
  } else if ( entity.stateModel ) { 
    // prevent create via the edit form
    // cols.push({ formFields: [{ id: "id", label: "Id", type: "text", readonly: true } ]})
  } else { // every data rec need an id
    fldArr.push({  id: "id", label: "Id", type: "text" })
    fldCnt ++
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
    if ( propId == indexKey ) { continue }
    let prop = entity.properties[ propId ]
    if ( prop.type == 'API static string' ) { continue }
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
            if ( prop.noEdit ) { 
              fldArr.push({ id: fldId, type: 'text', value: defaultVal, hidden: true })
            } else {
              fldArr.push({ id: fldId, label: lbl, type: 'text', defaultVal: defaultVal, readonly: true })
            }
          }
          continue
        }
      } else {
        continue
      }
    } else if ( prop.noEdit ) { continue }

    if ( prop.apiManaged ) { 
      fldArr.push({ id: fldId, label: lbl, type: 'text', readonly: true })
      continue 
    }

    let fld = null

    switch ( prop.type ) {
      case 'Text':
        if ( render && render == 'small') {
          fld = { id: fldId, label: lbl, type: 'text', rows: 1 }
        } else {
          fld = { id: fldId, label: lbl, type: 'text', rows: prop.lines }
          fldCnt += prop.lines - 1
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
        // index.html?layout=AppEntity-nonav&id=2103/TmfServiceInventory/0.1.0,TmfIntent
        try {
          let ent = prop.selectRef.split('/')
          let lnk = '<a href="index.html?layout=AppEntity-nonav&id='+ent[0]+'/'+ent[1]+'/'+ent[2]+','+ent[3]+'">'+ lbl +'</a>'
          fld = { id: fldId, label: lnk, type: 'select', options: [] }
          let opdTbl = await dta.getData( ent[0] + ent[3], user.scopeId )
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
        try {
          let ent = prop.multiSelectRef.split('/')
          let lnk = '<a href="index.html?layout=AppEntity-nonav&id='+ent[0]+'/'+ent[1]+'/'+ent[2]+','+ent[3]+'">'+ lbl +'</a>'
          fld = { id: fldId, label: lnk, type: 'select', options: [], multiple: true, rows: 4 }
          let opdTbl = await dta.getData( ent[0] + ent[3], user.scopeId )
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
          fldCnt ++
        } else {
          fld = { id: fldId, label: lbl, type: 'text', rows: 5 }
          fldCnt += 4
        }
        break 
      default:   // String, Number
        fld = { id: fldId, label: lbl, type: 'text' }
        if ( defaultVal ) { fld.defaultVal = defaultVal }
        if ( prop.qr ) { fld.qr = true }
        break 
    }
    
    if ( filter && filter[ propId ] ) { // ??
      fld.value =  filter[ propId ] 
      fld.defaultVal =  filter[ propId ] 
      fld.readonly   = "true" 
    }
    // if ( prop.apiManaged ) {
    //   fld.readonly   = true
    // }

    if ( fld ) {
      if ( prop.description ) { fld.descr = renderTooltip( prop.description ) }
      fldCnt ++
      fldArr.push( fld )
    }
  }

  if ( fldCnt > 12 ) {
    let rowMax = fldCnt / 5 
    let i = 0
    let formFields = []
    for ( let  fieldSpec of fldArr ) {

      formFields.push( fieldSpec )
      if ( fieldSpec.hidden ) { continue }

      //log.info( fieldSpec )
      if ( fieldSpec.rows ) {
        i += fieldSpec.rows
      } else {
        i++
      }
     
      if ( i > rowMax ) {
        cols.push({ formFields: JSON.parse( JSON.stringify( formFields )) })
        formFields = []
        i = 0
      }
    }
    if ( i != 0 ) {
      cols.push({ formFields: formFields })
    }

  } else {
    for ( fld of  fldArr ) {
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
      log.debug( 'filterMatch >', filter, '"'+ref1+'"', '"'+ref2+'"', '"'+val1+'"', '"'+val2+'"' )
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

  let indexKey = getIndex( entity )
  let indexProp = entity.properties[ indexKey ]
  if ( indexKey && indexProp ) {
    fields.push({ 
      id: indexKey, 
      label: (indexProp.label ? indexProp.label : "Id" ), 
      type: "text", 
      readonly: true, 
      value: rec[ indexKey ]
    })
  }
  
  fields.push({ id: "_state", label: "<b>New State</b>", type: "text", readonly: true, value: newState})
  fields.push({ id: "scopeId", label: "Scope", type: "text", hidden: true, value: rec.scopeId })

  for ( let propId in entity.properties ) {
    if ( propId == indexKey ) { continue }
    let prop = entity.properties[ propId ]
    if ( prop.type == 'API static string' ) { continue }

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
          let ent = prop.selectRef.split('/')
          let opdTbl = await dta.getData( ent[0]+ent[3], user.scopeId )
          for ( let recId in opdTbl ) { 
            fld.options.push({ option: recId }) 
          }
        } catch ( exc ) { log.error( 'genAddDataForm', exc )  }
        break 
      case 'MultiSelectRef':
        fld = { id: propId, label: lbl, type: 'select', options: [], multiple: true }
        try {
          let ent = prop.multiSelectRef.split('/')
          let opdTbl = await dta.getData( ent[0]+ent[3], user.scopeId )
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
        let jsonStr = ( rec[ propId ] ? JSON.str.valueingify( rec[ propId ] , null, ' ' ) : '{}' )
        fld = { id: propId, label: lbl, type: 'text', rows: "5", defaultVal: jsonStr }
        break 
      default:   // String, Number
        fld = { id: propId, label: lbl, type: 'text', value: rec[ propId ] }
        if ( defaultVal ) { fld.value = defaultVal }
        if ( prop.qr ) { fld.qr = true }
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
      
      if ( entity.properties[ propId ].type == 'String' ) {
        if ( entity.properties[ propId ].qr ) {
          
        }

      } else if ( entity.properties[ propId ].type == 'JSON' ) {
      
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
  let indexKey = getIndex( entity )
  let tblRec = { recId: rec[ indexKey ] }
  log.debug( 'getDoc rec', rec, stateModel )
  if ( stateModel ) {
    let stateId = rec[ '_state' ]
    tblRec[ '_state' ]= stateId
    let actions = []
    let state = stateModel.state[ stateId ]
    if ( state ) {
      if ( state.img ) {
        tblRec[ '_state' ] = '<img src="img/'+state.img+'" title="'+( state.label ? state.label : stateId )+'"/>'
      }
      let transitions = ( entity.stateTransition ? entity.stateTransition : {} )

      for ( let actionId in state.actions ) {
        let action =  state.actions[ actionId ]
        log.debug (  stateId +'_'+actionId+'_condition', transitions[ stateId +'_'+actionId+'_condition'] )
        if ( transitions[ stateId +'_'+actionId+'_condition'] ) {
          if ( ! filterMatch( transitions[ stateId +'_'+actionId+'_condition'], rec, rec ) ) {
            continue // TODO make this work for selectRef ...
          }
        }
        if ( action.apiManaged ) { continue }
        let lnkTxt = ( action.label ? action.label : actionId ) +''
        lnkTxt = lnkTxt.replaceAll( ' ', '&nbsp;' )
        // TODO change to button
        if ( action.icon ) {
          let navId = url +'/'+ stateId +'_'+ actionId
          let lnk = '<span class="StatusActionLink"><a href="index.html?layout=AppEntityAction-nonav&id='+navId+'">'+ lnkTxt + '</a></span>'
          actions.push( lnk )
        } else {
          let navId = url +'/'+ stateId +'_'+ actionId
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
        let param = params[0]+'/'+params[1]+'/'+params[2]+','+params[3] + ','+ params[4] +'='+ rec[ indexKey ]
        param += ','+ entity.title + ' &quot;'+  getRefLabel( entity, rec[ indexKey ], rec )  +'&quot;'
        // log.info( '>>>>>>>>>>>>>>>>>>', params)
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
          href = href.replaceAll( '${'+indexKey+'}', rec[ indexKey ] )
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

      case 'API static string': break

      default:   // String, Number, Select
        tblRec[ pId ] = ( recDta ? recDta : '' )
        break 
    }
  }
  return tblRec
}


function reformatDataUpdateInput( entity, rec ) {
  log.debug( 'reformatDataUpdateInput', rec )
  let indexKey = getIndex( entity )
  if ( ! indexKey ) { return { err: 'ERROR: id required' }  }
  if ( ! rec[ indexKey ] || rec[ indexKey ] === '' ) {
    if ( entity.properties[ indexKey ]  &&  entity.properties[ indexKey ].type.startsWith( 'UUID' ) ) {
      rec[ indexKey ] = helper.uuidv4()
      log.info( 'reformatDataUpdateInput', indexKey, rec[ indexKey ] )
    } else {
      rec[ indexKey ] = helper.uuidv4()
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
  log.debug( 'getEntity', refId, propId )
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
  if ( ! rec ) { return }
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