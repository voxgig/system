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

import { Jsonic } from '@tabnas/jsonic'


// Values emitted bare (aontu type/token names); everything else is quoted.
const BARE_TOKENS = ['String', 'Number', 'Boolean', 'Skip']


export type ModelFiles = {
  folder: string       // the model folder
  model: string        // root model file path (model.aontu)
  ent: string          // entity file path
  msg: string          // message file path
  srv: string          // service file path
}

export type AddResult = {
  file: string         // file appended to
  text: string         // the appended block ('' when skipped)
  skipped?: boolean    // true when the element already exists (no change)
}


// Model sources use the .aontu extension; .jsonic is legacy.
const MODEL_EXTS = ['aontu', 'jsonic']

// Locate the model folder from a starting folder: <start>/model,
// <start>/backend/model, or <start> itself if it holds model.aontu
// (or legacy model.jsonic).
function resolveModelFolder(start: string): string {
  const candidates = [
    start,
    Path.join(start, 'model'),
    Path.join(start, 'backend', 'model'),
  ]
  for (const c of candidates) {
    for (const ext of MODEL_EXTS) {
      if (Fs.existsSync(Path.join(c, 'model.' + ext))) {
        return c
      }
    }
  }
  throw new Error('model folder not found (looked for model.aontu in ' +
    candidates.join(', ') + ')')
}


// Resolve the entity/message/service source files from the @"file" refs
// in the root model file (main: ent: @"..."), falling back to
// conventional names.
function resolveModelFiles(start: string): ModelFiles {
  const folder = resolveModelFolder(start)

  let model = Path.join(folder, 'model.' + MODEL_EXTS[0])
  for (const ext of MODEL_EXTS) {
    const p = Path.join(folder, 'model.' + ext)
    if (Fs.existsSync(p)) {
      model = p
      break
    }
  }
  const src = Fs.readFileSync(model, 'utf8')

  const ref = (key: string, base: string) => {
    const m = src.match(
      new RegExp('main:\\s*' + key + ':\\s*@"([^"]+)"'))
    if (m) {
      return Path.join(folder, m[1])
    }
    for (const ext of MODEL_EXTS) {
      const p = Path.join(folder, base + '.' + ext)
      if (Fs.existsSync(p)) {
        return p
      }
    }
    return Path.join(folder, base + '.' + MODEL_EXTS[0])
  }

  return {
    folder,
    model,
    ent: ref('ent', 'ent'),
    msg: ref('msg', 'msg'),
    srv: ref('srv', 'srv'),
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


// The last compiled model (model.json next to the model source), used to
// make the add operations idempotent: an element that already exists in
// the compiled model is skipped rather than appended again. Formatting
// of the sources is irrelevant since the check is semantic. Returns null
// when the model has not been compiled yet (adds then simply append -
// aontu unification of an identical element converges anyway).
function compiledModel(files: ModelFiles): any {
  const p = Path.join(files.folder, 'model.json')
  try {
    return JSON.parse(Fs.readFileSync(p, 'utf8'))
  }
  catch (e: any) {
    return null
  }
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

  // Idempotent: entity already in the compiled model.
  const model = compiledModel(files)
  if (model?.main?.ent?.[zone]?.[name]) {
    return { file: files.ent, text: '', skipped: true }
  }

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

  // Idempotent: service already in the compiled model.
  const model = compiledModel(files)
  if (model?.main?.srv?.[name]) {
    return { file: files.srv, text: '', skipped: true }
  }

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

  // Idempotent: message path already in the compiled model.
  const model = compiledModel(files)
  if (null != model) {
    let node: any = model.main?.msg
    for (const p of path) {
      node = node?.[p]
    }
    if (null != node) {
      return { file: files.msg, text: '', skipped: true }
    }
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

  const model = compiledModel(files)

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

    // Idempotent: field already on the entity in the compiled model.
    if (model?.main?.ent?.[zone]?.[name]?.field?.[fname]) {
      out.push({ file: files.ent, text: '', skipped: true })
      continue
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
  addEnv,
  ENV_KINDS,
  fmt,
}


// The environment kinds @voxgig/build's EnvGen supports (kind defaults
// to the env name; an unknown kind fails generation with this list too).
const ENV_KINDS =
  ['local', 'basic', 'docker', 'vm', 'aws', 'azure', 'cloudflare', 'web']


// add env [String(name)|Jsonic(spec)]
// Declares a target environment in the model (main: env: <name>: {...}).
// Name form: `add env aws`. Spec form: `add env
// '{name:aws2,kind:aws,region:eu-west-1,stage:prd}'`. Appends to the
// model file referenced as `main: env: @"..."` when present, else to the
// root model file.
// Service declarations the web env needs so MakeSrv wires the generated
// auth + generic-entity service files. Appended to srv.aontu / msg.aontu by
// `add env web` (idempotent: only when the auth service is not yet declared).
const WEB_SRV_DECL = `
# Auth service (signin/signout/session + settings/security).
auth: {
  user: {
    required: false
  }
  in: {
    aim: {
      auth: {}
      req: {
        on: {
          auth: {
            '$': {
              allow: true
            }
          }
        }
      }
    }
  }
  api: {
    web: {
      path: {
        area: 'private/'
        suffix: ''
      }
    }
  }
  env: {
    lambda: {
      active: true
    }
  }
}


# Generic entity service: one CRUD implementation parameterised by the entity
# canon carried in the message (aim:ent,cmd:<verb> with ent:'zone/name').
# Access is scoped by project membership (see src/srv/ent/access.ts).
ent: {
  in: {
    aim: ent: {}
    aim: req: on: ent: '$': allow: true
  }
  user: required: true
  api: web: path: { area: 'private/', suffix: '' }
  env: lambda: active: true
}


# REST API service (strict JSON): answers aim:api messages; the express
# router in src/env/web/api.ts maps <prefix>/<version> REST calls onto
# them, resolving the principal from the API access key. Entity data
# validation comes from the model via the GENERATED shapes in
# src/srv/api/valid_gen.ts (api_gen action).
api: {
  in: {
    aim: api: {}
  }
  user: required: true
  env: lambda: active: true
}`

const WEB_MSG_DECL = `
# Auth messages + gateway (web) wrappers.
aim: auth: get: info: {}
aim: auth: signin: user: {}
aim: auth: signout: user: {}
aim: auth: load: auth: {}
aim: auth: change: pass: {}
aim: auth: update: user: {}
aim: auth: remind: pass: {}

# Generic entity CRUD (parameterised by ent:'zone/name' in the message).
aim: ent: {
  get: info: {}
  cmd: list: {}
  cmd: load: {}
  cmd: save: {}
  cmd: remove: {}
}

aim: req: on: auth: signin: user: '$': { file: './web_signin_user' }
aim: req: on: auth: signout: user: '$': { file: './web_signout_user' }
aim: req: on: auth: load: auth: '$': { file: './web_load_auth' }
aim: req: on: auth: change: pass: '$': { file: './web_change_pass' }
aim: req: on: auth: update: user: '$': { file: './web_update_user' }
aim: req: on: auth: remind: pass: '$': { file: './web_remind_pass' }

# REST API messages (see src/env/web/api.ts for the HTTP mapping).
aim: api: get: info: {}
aim: api: on: ent: '$': params: { '$$': 'Open', op: String, ent: String }

# API access keys (Settings & security).
aim: auth: create: apikey: {}
aim: auth: list: apikey: {}
aim: auth: revoke: apikey: {}

aim: req: on: auth: create: apikey: '$': { file: './web_create_apikey' }
aim: req: on: auth: list: apikey: '$': { file: './web_list_apikey' }
aim: req: on: auth: revoke: apikey: '$': { file: './web_revoke_apikey' }`

const WEB_ENT_DECL = `
# API access keys (REST API auth). The raw key is shown ONCE at creation;
# only a sha-256 hash is stored. Managed via aim:auth,{create,list,revoke}:apikey
# (Settings & security in the web app). Never exposed via the REST API or
# the generic ent service (sys zone), and hidden from the web UI nav.
sys: apikey: {
  ux: { hide: true }
  field: {
    id:      { label: 'ID'      kind: String }
    user_id: { label: 'User'    kind: String  ref: 'sys/user' valid: Skip }
    name:    { label: 'Name'    kind: String  valid: 'Min(1).Max(99)' }
    hash:    { label: 'Hash'    kind: String  valid: Skip }
    prefix:  { label: 'Prefix'  kind: String  valid: Skip }
    revoked: { label: 'Revoked' kind: Boolean valid: Skip }
    t_c:     { label: 'Created' kind: Number  valid: Skip }
  }
  valid: '$$': 'Open'
}`


function addEnv(start: string, arg: string): AddResult {
  const files = resolveModelFiles(start)
  const { name, def } = parseArg(arg, 'env')

  const kind = def.kind || name
  if (!ENV_KINDS.includes(kind)) {
    throw new Error('unknown environment kind: ' + kind +
      ' (known: ' + ENV_KINDS.join(', ') +
      '; use {name:..., kind:...} for a custom-named env)')
  }

  // Idempotent: environment already in the compiled model.
  const model = compiledModel(files)
  if (model?.main?.env?.[name]) {
    return { file: files.model, text: '', skipped: true }
  }

  if (null == def.active) {
    def.active = true
  }

  // The web env needs the auth + generic entity services declared in the
  // model so MakeSrv wires the generated service files (idempotent: only when
  // the auth service is not already declared).
  if ('web' === kind && null == model?.main?.srv?.auth) {
    append(files.srv, WEB_SRV_DECL)
    append(files.msg, WEB_MSG_DECL)
    append(files.ent, WEB_ENT_DECL)
  }

  // Target: the env model file when referenced, else the root model file.
  const src = Fs.readFileSync(files.model, 'utf8')
  const m = src.match(/main:\s*env:\s*@"([^"]+)"/)
  const target = m ? Path.join(files.folder, m[1]) : files.model
  const prefix = m ? '' : 'main: env: '

  const text = '\n' + prefix + name + ': ' + fmt(def, 0)

  return append(target, text)
}
