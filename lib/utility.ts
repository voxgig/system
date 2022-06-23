/* Copyright © 2022 Voxgig Ltd, MIT License. */


import type {
  Msg
} from './types'

import { util } from '@jsonic/jsonic-next'


// const Seneca = require('seneca')
const Patrun = require('patrun')


// TODO: perform this during model build?
function srvmsgs(srv: Record<string, any>, model: Record<string, any>): Msg[] {
  const allmsgs = listmsgs(model.main.msg)

  // const allpat = Seneca.util.Patrun()
  const allpat = Patrun()
  allmsgs.forEach((msg: Msg) => allpat.add(msg.props, msg))

  // TODO: need an option to listmsgs to just list patterns
  const srvpats = listmsgs(srv.in).map(m => m.props)

  const srvmsgs: Msg[] = []
  srvpats.reduce((a, pat) =>
  (a.push(...(allpat
    .list(pat)
    .map((o: any) => o.data) as Msg[])), a), srvmsgs)

  return srvmsgs
}


function listmsgs(point?: Record<string, any>): Msg[] {
  if (null == point) return []
  let msgs: Msg[] = []

  walkmsgs(point, [], (path: string[][], meta: any) => {
    let msg = {
      pattern:
        path.map((part: string[]) => part[0] + ':' + part[1]).join(','),
      props:
        path.reduce((a: any, part: string[]) => (a[part[0]] = part[1], a), {}),
      meta,
    }
    msgs.push(msg)
  })

  return msgs
}


function walkmsgs(
  point: Record<string, any>,
  path: string[][],
  handle: (path: string[][], meta: any) => void) {

  // console.log('WM', point, path)

  let points = 'object' === typeof point ?
    Object.entries(point).filter(entry => !entry[0].includes('$')) : []
  for (let step of points) {
    let key = step[0]
    // TODO: capture error log if step[1] empty (key with no vals)
    for (let val of Object.keys(step[1])) {
      walkmsgs(step[1][val], path.concat([[key, val]]), handle)
    }
  }

  // if any $ meta props, or no points, we found a msg
  if (0 === points.length) {
    const meta = point.$ || {}
    handle(path, meta)
  }
}



const Utility = {
  srvmsgs,
  listmsgs,
  deep: util.deep,
}


export {
  Utility
}


