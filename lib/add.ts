/* Copyright © 2026 Voxgig Ltd, MIT License. */

// Add elements (entity, srv, msg, field) to a Voxgig system project by
// appending jsonic blocks to the project's model source files. Appending
// works because aontu unifies repeated paths, and it preserves the user's
// existing formatting and comments.
//
// Each add* function takes either a String(name) - an empty element of
// that name is added - or a Jsonic(spec) - a jsonic definition of the
// element with config options.

import Fs from 'node:fs'
import Path from 'node:path'

import { Jsonic } from '@jsonic/jsonic-next'


// Values emitted bare (aontu type/token names); everything else is quoted.
const BARE_TOKENS = ['String', 'Number', 'Boolean', 'Skip']


export type ModelFiles = {
  folder: string       // the model folder
  model: string        // model.jsonic path
  ent: string          // entity file path
  msg: string          // message file path
  srv: string          // service file path
}

export type AddResult = {
  file: string         // file appended to
  text: string         // the appended block
}


// Locate the model folder from a starting folder: <start>/model,
// <start>/backend/model, or <start> itself if it holds model.jsonic.
function resolveModelFolder(start: string): string {
  const candidates = [
    start,
    Path.join(start, 'model'),
    Path.join(start, 'backend', 'model'),
  ]
  for (const c of candidates) {
    if (Fs.existsSync(Path.join(c, 'model.jsonic'))) {
      return c
    }
  }
  throw new Error('model folder not found (looked for model.jsonic in ' +
    candidates.join(', ') + ')')
}


// Resolve the entity/message/service source files from the @"file" refs
// in model.jsonic (main: ent: @"..."), falling back to conventional names.
function resolveModelFiles(start: string): ModelFiles {
  const folder = resolveModelFolder(start)
  const model = Path.join(folder, 'model.jsonic')
  const src = Fs.readFileSync(model, 'utf8')

  const ref = (key: string, fallback: string) => {
    const m = src.match(
      new RegExp('main:\\s*' + key + ':\\s*@"([^"]+)"'))
    return Path.join(folder, m ? m[1] : fallback)
  }

  return {
    folder,
    model,
    ent: ref('ent', 'ent.jsonic'),
    msg: ref('msg', 'msg.jsonic'),
    srv: ref('srv', 'srv.jsonic'),
  }
}


// Format a value as jsonic source. Objects use multiline path-free style;
// known aontu tokens (String, Skip, ...) are emitted bare.
function fmt(val: any, depth: number): string {
  const pad = '  '.repeat(depth)
  const padIn = '  '.repeat(depth + 1)

  if (null == val) {
    return 'null'
  }
  else if ('string' === typeof val) {
    return BARE_TOKENS.includes(val) ? val :
      "'" + val.replace(/'/g, "\\'") + "'"
  }
  else if ('object' !== typeof val) {
    return String(val)
  }
  else if (Array.isArray(val)) {
    return '[' + val.map((v) => fmt(v, depth + 1)).join(', ') + ']'
  }

  const entries = Object.entries(val)
  if (0 === entries.length) {
    return '{}'
  }

  return '{\n' +
    entries.map(([k, v]) => padIn + fmtKey(k) + ': ' + fmt(v, depth + 1))
      .join('\n') +
    '\n' + pad + '}'
}

function fmtKey(k: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k :
    "'" + k.replace(/'/g, "\\'") + "'"
}


function append(file: string, text: string): AddResult {
  const existing = Fs.readFileSync(file, 'utf8')
  const sep = existing.endsWith('\n') ? '\n' : '\n\n'
  Fs.appendFileSync(file, sep + text + '\n')
  return { file, text }
}


// Parse a name-or-spec argument. Returns { name, def } where def is the
// element definition object ({} for the plain-name form).
function parseArg(arg: string, kind: string): { name: string, def: any } {
  let parsed: any
  try {
    parsed = Jsonic(arg)
  }
  catch (e: any) {
    throw new Error('invalid ' + kind + ' argument (jsonic parse failed): ' +
      arg + ' - ' + e.message)
  }

  if ('string' === typeof parsed) {
    return { name: parsed, def: {} }
  }

  if (null != parsed && 'object' === typeof parsed && !Array.isArray(parsed)) {
    // { name: 'foo', ...def }
    if ('string' === typeof parsed.name) {
      const def = { ...parsed }
      delete def.name
      return { name: parsed.name, def }
    }

    // { foo: {...def} } - single-key form
    const keys = Object.keys(parsed)
    if (1 === keys.length && 'object' === typeof parsed[keys[0]]) {
      return { name: keys[0], def: parsed[keys[0]] }
    }
  }

  throw new Error('invalid ' + kind + ' argument: ' + arg +
    ' - provide a name, {name:...,...spec}, or {thename:{...spec}}')
}


// Default zone for entities: the single non-sys zone shape spread already
// in the entity file (`<zone>: &: ...`), else 'app'.
function defaultZone(entFile: string): string {
  const src = Fs.readFileSync(entFile, 'utf8')
  const zones = [...src.matchAll(/^([a-z][a-z0-9_]*):\s*&:/mg)]
    .map((m) => m[1])
    .filter((z) => 'sys' !== z)
  const uniq = [...new Set(zones)]
  return 1 === uniq.length ? uniq[0] : 'app'
}


// add entity [String(name)|Jsonic(spec)]
// Names may be zone-qualified: app/thing. Spec: { name, zone?, ...def }.
function addEntity(start: string, arg: string): AddResult {
  const files = resolveModelFiles(start)
  const { name: rawname, def } = parseArg(arg, 'entity')

  let zone = def.zone
  delete def.zone
  let name = rawname
  if (rawname.includes('/')) {
    const parts = rawname.split('/')
    zone = parts[0]
    name = parts[1]
  }
  zone = zone || defaultZone(files.ent)

  if (null == def.field) {
    def.field = {}
  }
  if (null == def.valid) {
    def.valid = { '$$': 'Open' }
  }

  const src = Fs.readFileSync(files.ent, 'utf8')
  const shapeLine = new RegExp('^' + zone + ':\\s*&:', 'm').test(src) ? '' :
    zone + ': &: $.main.shape.ent\n\n'

  const text = '\n' + shapeLine +
    zone + ': ' + name + ': ' + fmt(def, 0)

  return append(files.ent, text)
}


// add srv [String(name)|Jsonic(spec)]
// The plain-name form wires the service to its aim messages and a private
// web area (matching the standard project scaffold).
function addSrv(start: string, arg: string): AddResult {
  const files = resolveModelFiles(start)
  const { name, def } = parseArg(arg, 'srv')

  if (null == def.in) {
    def.in = {
      aim: { [name]: {} },
    }
  }
  if (null == def.user) {
    def.user = { required: true }
  }
  if (null == def.api) {
    def.api = { web: { path: { area: 'private/', suffix: '' } } }
  }
  if (null == def.env) {
    def.env = { lambda: { active: true } }
  }

  const text = '\n' + name + ': ' + fmt(def, 0)

  return append(files.srv, text)
}


// add msg [String(name)|Jsonic(spec)]
// Name form: a message path like thing.save.item (or thing:save:item);
// 'aim' is prepended if missing. Spec: { name: 'thing.save.item', ...meta }
// where meta (params, transport, file, ...) lands under the '$' key.
function addMsg(start: string, arg: string): AddResult {
  const files = resolveModelFiles(start)

  // A pure message path (thing.save.item, aim:thing:save:item) is taken
  // as-is - jsonic would otherwise parse the colon form as a nested map.
  const pathform = /^[a-z0-9_-]+([.:/][a-z0-9_-]+)+$/i.test(arg.trim())

  let parsed: any
  try {
    parsed = pathform ? arg.trim() : Jsonic(arg)
  }
  catch (e: any) {
    throw new Error('invalid msg argument (jsonic parse failed): ' +
      arg + ' - ' + e.message)
  }

  let path: string[]
  let meta: any = {}

  if ('string' === typeof parsed) {
    path = parsed.split(/[.:/]/).filter((p) => '' !== p)
  }
  else if (null != parsed && 'string' === typeof parsed.name) {
    path = parsed.name.split(/[.:/]/).filter((p: string) => '' !== p)
    meta = { ...parsed }
    delete meta.name
  }
  else {
    throw new Error('invalid msg argument: ' + arg +
    " - provide a message path like thing.save.item, or {name:'path',...meta}")
  }

  if ('aim' !== path[0]) {
    path.unshift('aim')
  }
  if (path.length < 2) {
    throw new Error('invalid msg path: ' + path.join('.'))
  }

  const prefix = path.join(': ')
  const text = 0 === Object.keys(meta).length ?
    '\n' + prefix + ': {}' :
    '\n' + prefix + ": '$': " + fmt(meta, 0)

  return append(files.msg, text)
}


// add field <entity> [String(name)|Jsonic(spec)] ...
// Field forms: title | title:String | title:{kind:String,valid:'Min(1)'}
//            | {name:title,kind:String}
// A label is derived from the name when not given.
function addFields(start: string, entref: string, fieldargs: string[])
  : AddResult[] {
  const files = resolveModelFiles(start)

  let zone: string
  let name: string
  if (entref.includes('/')) {
    [zone, name] = entref.split('/')
  }
  else {
    zone = defaultZone(files.ent)
    name = entref
  }

  if (0 === fieldargs.length) {
    throw new Error('no fields given')
  }

  const out: AddResult[] = []

  for (const arg of fieldargs) {
    let parsed: any
    try {
      parsed = Jsonic(arg)
    }
    catch (e: any) {
      throw new Error('invalid field argument (jsonic parse failed): ' +
        arg + ' - ' + e.message)
    }

    let fname: string
    let def: any

    if ('string' === typeof parsed) {
      fname = parsed
      def = {}
    }
    else if (null != parsed && 'object' === typeof parsed) {
      if ('string' === typeof parsed.name) {
        fname = parsed.name
        def = { ...parsed }
        delete def.name
      }
      else {
        const keys = Object.keys(parsed)
        if (1 !== keys.length) {
          throw new Error('invalid field argument: ' + arg)
        }
        fname = keys[0]
        const val = parsed[fname]
        def = 'string' === typeof val ? { kind: val } : { ...val }
      }
    }
    else {
      throw new Error('invalid field argument: ' + arg)
    }

    if (null == def.kind) {
      def.kind = 'String'
    }
    if (null == def.label) {
      def.label = fname
        .split('_')
        .map((p: string) => '' === p ? p : p[0].toUpperCase() + p.substring(1))
        .join(' ')
    }

    // Emit label before kind, matching scaffold convention.
    const ordered: any = { label: def.label, kind: def.kind }
    for (const k of Object.keys(def)) {
      if ('label' !== k && 'kind' !== k) {
        ordered[k] = def[k]
      }
    }

    const text = '\n' + zone + ': ' + name + ': field: ' + fname + ': ' +
      fmt(ordered, 0)

    out.push(append(files.ent, text))
  }

  return out
}


export {
  resolveModelFolder,
  resolveModelFiles,
  addEntity,
  addSrv,
  addMsg,
  addFields,
  fmt,
}
