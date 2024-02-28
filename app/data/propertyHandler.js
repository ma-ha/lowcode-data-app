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
      if ( prop.type == 'Select' ) {
        let optArr = [{ option: ' ', value: ' ' }]
        for ( let val of prop.options ) { 
          optArr.push( { option: val, value: val })
        }
        filter.push({ id: propId, label: label, type: 'select', options: optArr  })
      } else {
        filter.push({ id: propId, label: label })
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
    if ( prop.noTable ) { continue }
    let label = ( prop.label ? prop.label : propId )

    if ( propId == 'id' ) { continue }

    switch ( prop.type ) {
      case 'Boolean':
        cols.push({ id: propId, label : label, cellType: 'checkbox', width:width })
        break 
      // case 'Date':
      //   cols.push({ id: propId, label : label, cellType: 'date', width:width }) 
      //   break 
      case 'JSON':
        break 
      default:  // String, Number, Select, Event, Link, RefArray, Ref, DocMap, SelectRef
        cols.push({ id: propId, label : label, cellType: 'text', width:width }) 
        break 
    }
  }
  return cols
}


async function genGuiFormFieldsDef( entity, filter, user, stateTransition ) {
  let cols = []

  if ( entity.properties[ 'id' ] && entity.properties[ 'id' ].type == 'UUID' ) {
    cols.push({ formFields: [{ 
      id: "id", 
      label: ( entity.properties[ 'id' ].label ? entity.properties[ 'id' ].label : "Id (UUID)" ), 
      type: "text", readonly: true 
    } ]})
  } else { // every data rec need an id
    cols.push({ formFields: [{ id: "id", label: "Id", type: "text" } ]})
  }

  for ( let propId in entity.properties ) {
    if ( propId == 'id' ) { continue }
    let prop = entity.properties[ propId ]
    if ( prop.apiManaged ) { continue } 
    if ( prop.noEdit     ) { continue }
    let lbl  = ( prop.label ? prop.label : propId )
    // console.log( 'LBL', lbl)

    if ( stateTransition ) {
      if ( ! prop.stateTransition || ! prop.stateTransition[ stateTransition ] ) {
        continue
      }
    }

    let fld = null

    switch ( prop.type ) {
      case 'Text':
        fld = { id: propId, label: lbl, type: 'text', rows: prop.lines }
        break 
      case 'Boolean':
        fld = { id: propId, label: lbl, type: 'checkbox' }
        break 
      case 'Date':
        fld = { id: propId, label: lbl, type: 'date' }
        break 
      case 'Select':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        for ( let val of prop.options ) { fld.options.push({ option: val }) }
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
        fld = { id: propId, label: lbl, type: 'text', rows: 5 }
        break 
      default:   // String, Number
        fld = { id: propId, label: lbl, type: 'text' }
        break 
    }

    if ( filter && filter.field == propId ) {
      fld.defaultVal = filter.value
      fld.readonly   = "true" 
    }
    
    if ( fld ) {
      cols.push({ formFields: [ fld ] })
    }
  }
  return cols
}



async function genGuiFormStateChangeDef( entity, filter, user, stateTransition, rec, stateModel ) {
  let fields = []

  fields.push({ id: "id", label: "Id", type: "text", readonly: true, value: rec.id })
  let stateId = stateTransition.split('_')[0] 
  let actionId = stateTransition.split('_')[1] 
  let newState = stateModel.state[ stateId ].actions[ actionId ].to
  fields.push({ id: "_state", label: "New State", type: "text", readonly: true, value: newState})
  fields.push({ id: "scopeId", label: "New State", type: "text", hidden: true, value: rec.scopeId })

  for ( let propId in entity.properties ) {
    if ( propId == 'id' ) { continue }
    let prop = entity.properties[ propId ]
    if ( prop.apiManaged ){ 
      fields.push({ id: propId, label: lbl, type: "text", readonly: true, value: rec[ propId ] })
      continue 
    } 
    let lbl  = ( prop.label ? prop.label : propId )
    // console.log( 'LBL', lbl)

    if ( stateTransition ) {
      if ( ! prop.stateTransition || ! prop.stateTransition[ stateTransition ] ) {
        if ( rec[ propId ] ) {
          fields.push({ id: propId, label: lbl, type: "text", readonly: true, value: rec[ propId ] })
        }
        continue
      }
    }

    let fld = null

    switch ( prop.type ) {
      case 'Text':
        fld = { id: propId, label: lbl, type: 'text', rows: prop.lines, value: rec[ propId ] }
        break 
      case 'Boolean':
        fld = { id: propId, label: lbl, type: 'checkbox', value: rec[ propId ] }
        break 
      case 'Date':
        fld = { id: propId, label: lbl, type: 'date', value: rec[ propId ] }
        break 
      case 'Select':
        fld = { id: propId, label: lbl, type: 'select', options: [] }
        for ( let val of prop.options ) { fld.options.push({ option: val }) }
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
        fld = { id: propId, label: lbl, type: 'text', rows: 5, value: rec[ propId ] }
        break 
      default:   // String, Number
        fld = { id: propId, label: lbl, type: 'text', value: rec[ propId ] }
        break 
    }

    if ( filter && filter.field == propId ) {
      fld.defaultVal = filter.value
      fld.readonly   = "true" 
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
        } catch ( exc ) { log.warn('getDoc nz id> stringify JSON', exc ) }
      
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


function reformatDataTableReturn( entity, rec, url, stateModel  ) {
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
    let label = ( prop.label ? prop.label : propId )
    log.debug( 'getDoc', propId, prop.type )

    switch ( prop.type ) {
      case 'Text':
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) 
        if ( tblRec[ propId ].length > 100 ) { tblRec[ propId ] = tblRec[ propId ].substr(0,100) +'...' }
        break 
      case 'SelectRef':
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) // TODO
        break 
      case 'DocMap':
        let params = prop.docMap.split('/')
        let param = params[0]+'/'+params[1]+'/'+params[2]+','+params[3] + ','+ params[4] +'='+ rec.id
        tblRec[ propId ] = '<a href="index.html?layout=AppEntity-nonav&id='+param+'">'+label+'</a>'
        break 
      case 'Ref':
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) // TODO
        break 
      case 'RefArray':
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' ) // TODO
        break 
      case 'Link': 
        if ( prop.link ) {
          let href = prop.link
          href = href.replaceAll( '${id}', rec[ 'id' ] )
          href = href.replaceAll( '${scopeId}', rec[ 'scopeId' ] )
          for ( let replaceId in entity.properties ) {
            href = href.replaceAll( '${'+replaceId+'}', rec[ replaceId ] )
          }
          tblRec[ propId ] = '<a href="'+href+'" target="_blank">'+label+'</a>'
        } else { tblRec[ propId ] = '' }
        break 
      case 'JSON': 
        tblRec[ propId ] = ( rec[ propId ] ? JSON.stringify( rec[ propId ], null, ' ' ) : '{}' )
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

        tblRec[ propId ] = eventLnk //rec[ propId ].event
        break 
      default:   // String, Number, Select
        tblRec[ propId ] = ( rec[ propId ] ? rec[ propId ] : '' )
        break 
    }
  }
  return tblRec
}


function reformatDataUpdateInput( entity, rec ) {
  if ( ! rec.id ) {
    if ( entity.properties[ 'id' ]  &&  entity.properties[ 'id' ].type == 'UUID' ) {
      rec.id = helper.uuidv4()
    } else {
      return { err: 'ERROR: id required' }
    }
  }


  for ( let propId in entity.properties ) try {

    // JSOM input must be parsed to obj tree
    if (entity.properties[ propId ].type == 'JSON' ) { 

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
        log.info( 'MultiSelectRef', propId, rec[ propId ], rec )
        rec[ propId ] = []
        if ( rec[ propId+'[]' ] ) {
          if ( Array.isArray( rec[ propId+'[]' ] ) ) {
            rec[ propId ] = rec[ propId+'[]' ]
          } else {
            rec[ propId ].push( rec[ propId+'[]' ] )
          }
        } 
      } catch ( exc ) { 
        log.warn( 'addDoc: Parse MultiSelectRef', exc ) 
        rec[ propId ] = {}
      }
    }

  } catch ( exc ) { log.warn( 'reformatDataUpdateInput', exc ) }
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