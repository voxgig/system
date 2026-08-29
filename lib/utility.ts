/* Copyright © 2022 Voxgig Ltd, MIT License. */


import type {
  Msg
} from './types'

import { util } from '@tabnas/jsonic'



import Patrun from 'patrun'


// TODO: perform this during model build?
function srvmsgs(srv: Record<string, any>, model: Record<string, any>): Msg[] {
  const allmsgs = listmsgs(model.main.msg)
  const allpat = Patrun({})
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


// A message definition declares its pattern as a LIST, so it is told apart
// from a chain node - whose values are always maps, the next pattern level or
// the '$' leaf - even when spelled `pat:`. Same discriminator @voxgig/model
// validates the declared shape with.
function ismsgdef(val: any): boolean {
  return null != val && 'object' === typeof val &&
    !Array.isArray(val) && Array.isArray(val.pat)
}


// The pattern pairs of a definition, in the walker's path form. A malformed
// pair is skipped rather than thrown on: @voxgig/model fails the build on
// those, so one reaching here means the model came from somewhere else, and
// dropping it degrades better than crashing srv startup.
function msgdefpath(def: Record<string, any>): string[][] {
  let path: string[][] = []

  for (let pair of def.pat) {
    if (null == pair || 'object' !== typeof pair || Array.isArray(pair)) {
      continue
    }
    let keys = Object.keys(pair)
    if (1 === keys.length) {
      path.push([keys[0], pair[keys[0]]])
    }
  }

  return path
}


function walkmsgs(
  point: Record<string, any>,
  path: string[][],
  handle: (path: string[][], meta: any) => void) {

  // THE DECLARED SHAPE: main.msg is a LIST of definitions, each carrying its
  // pattern as data rather than as its position in the tree.
  //
  // A list rather than a map keyed by message name, because a gateway proxy
  // and the message it forwards to necessarily share their last pattern pair
  // (aim:web,on:todo,save:item proxies aim:todo,save:item), so any key derived
  // from that pair would collide and the two could not both be declared. A
  // list has no key, so the question never arises - and the action file still
  // comes from the last pair, or from `file`, exactly as before.
  if (Array.isArray(point)) {
    for (let def of point) {
      if (ismsgdef(def)) {
        let meta = { ...def }
        delete meta.pat
        handle(path.concat(msgdefpath(def)), meta)
      }
    }
    return
  }

  // THE LEGACY CHAIN: the nesting is the pattern, consumed two levels at a
  // time, with '$' carrying the metadata. Unchanged.
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
  if (0 === points.length || point.$) {
    const meta = point.$ || {}
    handle(path, meta)
  }
}



const Utility = {
  srvmsgs,
  listmsgs,
  deep: util.deep as (base?: any, ...rest: any[]) => any,
}


export {
  Utility
}


