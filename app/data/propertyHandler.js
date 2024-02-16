const log     = require( '../helper/log' ).logger
const dta     = require( '../persistence/app-dta' )

exports: module.exports = {
  genGuiTableFilterDef,
  genGuiTableColsDef,
  genGuiFormFieldsDef
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
