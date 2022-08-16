/* Copyright © 2022 Voxgig Ltd, MIT License. */


import Path from 'path'
import Fs from 'fs'


import type {
  Msg,
} from './lib/types'

import { Utility } from './lib/utility'

import { MakeSrv } from './srv/make'


const { srvmsgs, deep } = Utility


function messages(seneca: any, options: any, reload: any) {
  let srvname = seneca.fixedargs.plugin$.name.replace(/^srv_/, '')

  let model = seneca.context.model
  let srvmodel = model.main.srv[srvname]

  let msgs = srvmsgs(srvmodel, model)
  console.log('SYSTEM: MESSAGES FOUND', srvname,
              msgs.map(m=>m.pattern))

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

  // index by srv name, overrides model
  const srvOptions = options.options || {}

  for (const entry of Object.entries(model.main.srv)) {
    let name: string = entry[0]
    let srv: any = entry[1]

    let srvpath = Path.join(folder, name, name + '-srv.js')

    if (Fs.existsSync(srvpath)) {
      let srvopts = deep({}, srv.options, srvOptions[name])
      this.root.use(srvpath, srvopts)
    }
    else {
      this.log.warn('srv-not-found', { name, srvpath: srvpath })
    }
  }

}


type LiveOptions = {
  srv: {
    name: string,
    folder: string,
  },

  // Srv options by name
  options: Record<string, any>
}


function Live(
  this: any,
  options: LiveOptions
) {
  const model = this.context.model
  const srvname = options.srv.name
  
  let srvdef = model.main.srv[srvname]
  srvdef.name = srvname

  let deps = srvdef.deps || {}

  let srvs = Object
    .entries(deps)
    .reduce(((srvdefs, dep) => {
      let depname = dep[0]
      let depsrv = model.main.srv[depname]
      depsrv.name = depname
      srvdefs.push(depsrv)
      return srvdefs
    }), ([] as any[]))

  srvs.push(srvdef)

  useSrvs(this, srvs, options, model)
}


function useSrvs(seneca: any, srvs: any[], options: LiveOptions, model: any) {
  const folder = options.srv.folder

  // index by srv name, overrides model
  const srvOptions = options.options || {}

  for (const srv of srvs) {
    let name = srv.name
    let srvpath = Path.join(folder, name, name + '-srv.js')

    if (Fs.existsSync(srvpath)) {
      let srvopts = deep({}, srv.options, srvOptions[name])
      seneca.root.use(srvpath, srvopts)
    }
    else {
      seneca.log.warn('srv-not-found', { name, srvpath: srvpath })
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
  Live,
}
