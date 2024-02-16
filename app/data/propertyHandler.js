const log     = require( '../helper/log' ).logger
const dta     = require( '../persistence/app-dta' )

// All property type specific handling is done here

exports: module.exports = {
  genGuiTableFilterDef,
  genGuiTableColsDef,
  genGuiFormFieldsDef,
  reformatDataReturn,
  genEmptyDataReturn,
  reformatDataTableReturn,
  reformatDataUpdateInput
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


async function genGuiFormFieldsDef( entity, filter, user ) {
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
    if ( prop.apiManaged ){ continue } 
    let lbl  = ( prop.label ? prop.label : propId )
    // console.log( 'LBL', lbl)

    let fld = null

    switch ( prop.type ) {
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


function reformatDataTableReturn( entity, rec, url  ) {
  let tblRec = { recId: rec.id }
  log.debug( 'getDoc rec', rec )
  for ( let propId in entity.properties ) {
    let prop = entity.properties[ propId ]
    let label = ( prop.label ? prop.label : propId )
    log.debug( 'getDoc', propId, prop.type )

    switch ( prop.type ) {
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