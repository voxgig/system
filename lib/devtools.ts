/* Copyright © 2026 Voxgig Ltd, MIT License. */



const DEFAULT_PREFIX = 'SENECA_'


type DevtoolsSpec = {
  env: string        // which entry is running
  prefix?: string    // env var prefix; default SENECA_
}


// Parse an env var as a boolean. Absent or empty means "not set", so the
// next source down decides. Anything other than a recognised true/false
// word is an error rather than a silent false - `SENECA_REPL=yes` meaning
// "off" would be a miserable half hour.
function envFlag(name: string, raw: string | undefined): boolean | undefined {
  if (null == raw || '' === raw) {
    return undefined
  }

  const val = raw.trim().toLowerCase()

  if ('true' === val || '1' === val || 'yes' === val || 'on' === val) {
    return true
  }
  if ('false' === val || '0' === val || 'no' === val || 'off' === val) {
    return false
  }

  throw new Error(
    'voxgig-system: ' + name + ' must be a boolean ' +
    '(true/false, 1/0, yes/no, on/off), got: ' + JSON.stringify(raw))
}


function envPrefix(model: any, spec: DevtoolsSpec): string {
  if (null != spec.prefix) {
    if ('string' !== typeof spec.prefix) {
      throw new Error('voxgig-system: devtools `prefix` must be a string')
    }
    return spec.prefix
  }

  const core = model && model.main && model.main.conf && model.main.conf.core
  if (core && 'string' === typeof core.envprefix && '' !== core.envprefix) {
    return core.envprefix
  }

  return DEFAULT_PREFIX
}


function devFlag(
  model: any, spec: DevtoolsSpec, flag: string, env: NodeJS.ProcessEnv
): boolean {
  const name = envPrefix(model, spec) + flag.toUpperCase()

  const fromEnv = envFlag(name, env[name])
  if (undefined !== fromEnv) {
    return fromEnv
  }

  const main = (model && model.main) || {}

  const envdef = main.env && main.env[spec.env]
  if (envdef && envdef.dev && null != envdef.dev[flag]) {
    return !!envdef.dev[flag]
  }

  const conf = main.conf
  if (conf && conf.dev && null != conf.dev[flag]) {
    return !!conf.dev[flag]
  }

  return false
}


// The REPL port: <PREFIX>REPL_PORT, else the model's conf.port.repl.
function replPort(model: any, spec: DevtoolsSpec, env: NodeJS.ProcessEnv):
  number | undefined {
  const name = envPrefix(model, spec) + 'REPL_PORT'
  const raw = env[name]

  if (null != raw && '' !== raw) {
    // Test the RAW string, not parseInt's result: parseInt('40404x') is
    // 40404 and parseInt('12.5') is 12, so checking only the number back
    // would silently accept a malformed port.
    const val = raw.trim()
    if (!/^\d+$/.test(val)) {
      throw new Error(
        'voxgig-system: ' + name + ' must be an integer, got: ' +
        JSON.stringify(raw))
    }
    return parseInt(val, 10)
  }

  const port = model && model.main && model.main.conf &&
    model.main.conf.port && model.main.conf.port.repl

  return 'number' === typeof port ? port : undefined
}


function devtools(seneca: any, model: any, spec: DevtoolsSpec): {
  test: boolean, repl: boolean, port?: number
} {
  if (null == spec || 'string' !== typeof spec.env || '' === spec.env) {
    throw new Error('voxgig-system: devtools requires a non-empty `env` string')
  }

  const procenv = 'undefined' === typeof process ? {} : (process.env || {})

  const test = devFlag(model, spec, 'test', procenv)
  const repl = devFlag(model, spec, 'repl', procenv)
  const port = repl ? replPort(model, spec, procenv) : undefined

  if (test) {
    seneca.test()
  }

  if (repl) {
    seneca.use('repl', null == port ? {} : { port })
  }

  return { test, repl, port }
}


export type {
  DevtoolsSpec,
}

export {
  devtools,
  envFlag,
  DEFAULT_PREFIX,
}
