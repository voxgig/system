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


// A message definition declares its pattern as a LIST; a chain node never
// does, because every value in a chain node is a map - the next pattern level,
// or the '$' leaf. So this tells the two shapes apart even for a legacy
// pattern pair spelled `pat:`. It is the same discriminator @voxgig/model
// validates the declared shape with (see its producer/msg.ts).
function ismsgdef(val: any): boolean {
  return null != val && 'object' === typeof val &&
    !Array.isArray(val) && Array.isArray(val.pat)
}


// The pattern pairs of a declared-shape definition, in the walker's path form.
// A malformed pair is skipped rather than thrown on: @voxgig/model fails the
// build on those, so one reaching here means the model came from somewhere
// else, and dropping it degrades better than crashing srv startup.
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

  let entries = 'object' === typeof point ?
    Object.entries(point).filter(entry => !entry[0].includes('$')) : []

  // A declared-shape definition carries its pattern as data, so it IS a
  // message here, not a node to descend into. Everything else is a chain node
  // and walks as before, which is what lets both shapes appear in one model.
  let points: [string, any][] = []
  for (let entry of entries) {
    if (ismsgdef(entry[1])) {
      let meta = { ...entry[1] }
      delete meta.pat
      handle(path.concat(msgdefpath(entry[1])), meta)
    }
    else {
      points.push(entry)
    }
  }

  for (let step of points) {
    let key = step[0]
    // TODO: capture error log if step[1] empty (key with no vals)
    for (let val of Object.keys(step[1])) {
      walkmsgs(step[1][val], path.concat([[key, val]]), handle)
    }
  }

  // if any $ meta props, or nothing here at all, we found a msg.
  //
  // This asks about ENTRIES, not the chain nodes among them: a node holding
  // only declared-shape definitions is a container, and must not also emit a
  // patternless message of its own. With no definitions present the two are
  // the same set, so legacy models walk exactly as before.
  if (0 === entries.length || point.$) {
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


