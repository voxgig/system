/* Copyright © 2022 Voxgig Ltd, MIT License. */

import type {
  Msg,
} from './lib/types'

import { Utility } from './lib/utility'

import { MakeSrv } from './srv/make'


const { srvmsgs } = Utility


function messages(seneca: any, options: any, reload: any) {
  let srvname = seneca.fixedargs.plugin$.name
  let model = seneca.context.model
  let srvmodel = model.main.srv[srvname]

  let msgs = srvmsgs(srvmodel, model)

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





const System = {
  messages
}


export type {
  Msg
}

export {
  System,
  MakeSrv,
  Utility,
}
