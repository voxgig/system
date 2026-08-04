/* Copyright © 2026 Voxgig Ltd, MIT License */

// devtools(): the dev-only behaviour an entry switches on.
//
// The point of the test is the resolution order - env var, then the
// model's per-env dev block, then the project default, then OFF - and that
// "off" is the default, so a deployment never picks up a REPL by accident.

import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

import { devtools } from '../system'


// A Seneca stand-in recording what devtools did to it.
function fakeSeneca() {
  const calls: any = { test: 0, use: [] as any[] }
  const seneca: any = {
    test: () => { calls.test++; return seneca },
    use: (name: string, options?: any) => {
      calls.use.push({ name, options })
      return seneca
    },
    calls,
  }
  return seneca
}

const model = (main?: any) => ({ main: main || {} })

const PORT_CONF = { port: { repl: 50412 } }


describe('devtools', () => {

  const VARS = ['SENECA_TEST', 'SENECA_REPL', 'SENECA_REPL_PORT',
    'VG_TEST', 'VG_REPL', 'REPL']
  let saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    saved = {}
    for (const v of VARS) {
      saved[v] = process.env[v]
      delete process.env[v]
    }
  })

  afterEach(() => {
    for (const v of VARS) {
      if (undefined === saved[v]) delete process.env[v]
      else process.env[v] = saved[v] as string
    }
  })


  test('off by default: a deployment opts in, never in by accident', () => {
    const seneca = fakeSeneca()
    const res = devtools(seneca, model({ conf: PORT_CONF }), { env: 'aws' })

    assert.deepEqual(res, { test: false, repl: false, port: undefined })
    assert.strictEqual(seneca.calls.test, 0)
    assert.deepEqual(seneca.calls.use, [])
  })


  test('the project default in conf.dev turns them on', () => {
    const seneca = fakeSeneca()
    const res = devtools(seneca,
      model({ conf: { ...PORT_CONF, dev: { test: true, repl: true } } }),
      { env: 'local' })

    assert.deepEqual(res, { test: true, repl: true, port: 50412 })
    assert.strictEqual(seneca.calls.test, 1)
    assert.deepEqual(seneca.calls.use, [{ name: 'repl', options: { port: 50412 } }])
  })


  test('a per-env dev block overrides the project default', () => {
    const m = model({
      conf: { ...PORT_CONF, dev: { test: true, repl: true } },
      env: { aws: { dev: { test: false, repl: false } } },
    })

    const dev = fakeSeneca()
    devtools(dev, m, { env: 'local' })
    assert.strictEqual(dev.calls.test, 1)

    const prod = fakeSeneca()
    const res = devtools(prod, m, { env: 'aws' })
    assert.deepEqual(res, { test: false, repl: false, port: undefined })
    assert.strictEqual(prod.calls.test, 0)
    assert.deepEqual(prod.calls.use, [])
  })


  test('env vars beat the model, both ways', () => {
    const m = model({ conf: { ...PORT_CONF, dev: { test: true, repl: true } } })

    process.env.SENECA_REPL = 'false'
    const off = fakeSeneca()
    assert.strictEqual(devtools(off, m, { env: 'local' }).repl, false)
    assert.deepEqual(off.calls.use, [])

    delete process.env.SENECA_REPL
    process.env.SENECA_TEST = 'true'
    const on = fakeSeneca()
    assert.strictEqual(
      devtools(on, model({ conf: PORT_CONF }), { env: 'aws' }).test, true)
    assert.strictEqual(on.calls.test, 1)
  })


  test('SENECA_REPL_PORT overrides the model port', () => {
    process.env.SENECA_REPL_PORT = '40404'
    const seneca = fakeSeneca()
    const res = devtools(seneca,
      model({ conf: { ...PORT_CONF, dev: { repl: true } } }), { env: 'local' })

    assert.strictEqual(res.port, 40404)
    assert.deepEqual(seneca.calls.use, [{ name: 'repl', options: { port: 40404 } }])
  })


  test('repl with no port anywhere loads the plugin on its own default', () => {
    const seneca = fakeSeneca()
    const res = devtools(seneca, model({ conf: { dev: { repl: true } } }),
      { env: 'local' })

    assert.strictEqual(res.port, undefined)
    assert.deepEqual(seneca.calls.use, [{ name: 'repl', options: {} }])
  })


  test('the env var prefix is configurable, by spec and by model', () => {
    const m = model({ conf: { ...PORT_CONF, core: { envprefix: 'VG_' } } })

    process.env.VG_TEST = 'true'
    const a = fakeSeneca()
    assert.strictEqual(devtools(a, m, { env: 'local' }).test, true)

    // A spec prefix wins over the model's.
    process.env.SENECA_TEST = 'true'
    const b = fakeSeneca()
    assert.strictEqual(
      devtools(b, m, { env: 'local', prefix: 'SENECA_' }).test, true)

    // ...and the model prefix means SENECA_ is NOT consulted.
    delete process.env.VG_TEST
    const c = fakeSeneca()
    assert.strictEqual(devtools(c, m, { env: 'local' }).test, false,
      'SENECA_TEST must not apply when the prefix is VG_')
  })


  test('a bare REPL env var is ignored - the names are namespaced now', () => {
    process.env.REPL = 'false'
    const seneca = fakeSeneca()
    const res = devtools(seneca,
      model({ conf: { ...PORT_CONF, dev: { repl: true } } }), { env: 'local' })

    assert.strictEqual(res.repl, true, 'bare REPL must not disable the repl')
  })


  test('an unparseable flag is an error, not a silent false', () => {
    process.env.SENECA_REPL = 'sure'
    assert.throws(
      () => devtools(fakeSeneca(), model({ conf: PORT_CONF }), { env: 'local' }),
      /SENECA_REPL must be a boolean/)

    delete process.env.SENECA_REPL
    process.env.SENECA_REPL_PORT = 'wat'
    assert.throws(
      () => devtools(fakeSeneca(),
        model({ conf: { dev: { repl: true } } }), { env: 'local' }),
      /SENECA_REPL_PORT must be an integer/)
  })


  test('env is required', () => {
    for (const bad of [undefined, null, '', 7]) {
      assert.throws(
        () => devtools(fakeSeneca(), model(), { env: bad } as any),
        /requires a non-empty `env` string/,
        'accepted ' + JSON.stringify(bad))
    }
  })


  test('a non-string prefix is rejected', () => {
    assert.throws(
      () => devtools(fakeSeneca(), model({ conf: PORT_CONF }),
        { env: 'local', prefix: 7 } as any),
      /`prefix` must be a string/)
  })
})
