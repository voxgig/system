/* Copyright © 2022 Voxgig Ltd, MIT License. */


import Path from 'path'
import Fs from 'fs'


import type {
  Msg,
} from './lib/types'

import { Utility } from './lib/utility'

import { MakeSrv } from './srv/make'


const { srvmsgs } = Utility


function messages(seneca: any, options: any, reload: any) {
  let srvname = seneca.fixedargs.plugin$.name.replace(/^srv_/, '')

  let model = seneca.context.model
  let srvmodel = model.main.srv[srvname]

  let msgs = srvmsgs(srvmodel, model)
  console.log('SYSTEM: MESSAGES FOUND', srvname, msgs)

  for (let msg of msgs) {
    seneca.message(msg.pattern, reload(actpath(msg), { options }))
  }
}


function actpath(msg: Msg) {
  if (msg.meta.file) {
    return msg.meta.file
  }

  let pairs = msg.pattern.split(/\s*,\s*/)

  // TODO: maybe take more than just the last one!
  let path = './' + pairs[pairs.length - 1].replace(/:/g, '_')
  return path
}


function prepare(seneca: any, require: any) {
  let srvname = seneca.fixedargs.plugin$.name.replace(/^srv_/, '')

  try {
    const makePrepare = require('./' + srvname + '-prepare.js')
    seneca.prepare(makePrepare())
  }
  catch (e: any) {
    if ('MODULE_NOT_FOUND' !== e.code) {
      throw e
    }
  }
}



function Local(this: any, options: any) {
  const model = this.context.model
  const folder = options.srv.folder

  for (const entry of Object.entries(model.main.srv)) {
    let name: string = entry[0]
    let srv: any = entry[1]

    let srvpath = Path.join(folder, name, name + '-srv.js')

    if (Fs.existsSync(srvpath)) {
      this.root.use(srvpath, srv.options)
    }
    else {
      this.log.warn('srv-not-found', { name, srvpath: srvpath })
    }
  }

}



const System = {
  messages,
  prepare,
}


export type {
  Msg
}

export {
  System,
  MakeSrv,
  Utility,
  Local,
}
