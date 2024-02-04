/* LOWCODE-DATA-APP / copyright 2024 by ma-ha https://github.com/ma-ha  /  MIT License */

exports: module.exports = { 
  uuidv4
}


function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  .replace( /[xy]/g, 
    (c) => {
      let r = Math.random() * 16 | 0
      let v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString( 16 )
    }
  )
}


// const crypto = require('crypto')
// crypto.randomUUID()