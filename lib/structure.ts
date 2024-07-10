
import { dive, get, pinify, camelify } from '@voxgig/model'



function entity(model: any) {
  let entries = dive(model.main.ent)
  let entMap: any = {}
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    let path = entry[0]

    // TODO: move EntShape to @voxgig/model
    // let ent = EntShape(entry[1])
    let ent = entry[1]

    // console.log('ENT', path, ent)

    let valid = ent.valid || {}

    Object.entries(ent.field).map((n: any[]) => {
      let name = n[0]
      let field = n[1]

      // console.log('FV', name, field)

      let fv = field.kind
      if (field.valid) {
        let vt = typeof field.valid
        if ('string' === vt) {
          fv += '.' + field.valid
        }
        else {
          fv = field.valid
        }
      }
      valid[name] = fv
    })

    // console.log(path, valid)

    entMap[path[0] + '/' + path[1]] = {
      valid_json: valid
    }
  }
  return entMap
}



const Structure = {
  entity
}



export {
  Structure
}
