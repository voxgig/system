/* Copyright © 2026 Voxgig Ltd, MIT License */


import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

import { context } from '../system'


// A Seneca stand-in: context() only ever touches seneca.context.
const fakeSeneca = () => ({ context: {} as Record<string, any> })

const model = (envs?: any) => ({
  main: {
    env: envs || {},
  },
})

const PKG = { name: 'demo', version: '1.2.3' }


describe('context', () => {

  let STAGE: string | undefined

  beforeEach(() => {
    STAGE = process.env.STAGE
    delete process.env.STAGE
  })

  afterEach(() => {
    if (undefined === STAGE) {
      delete process.env.STAGE
    }
    else {
      process.env.STAGE = STAGE
    }
  })


  test('sets all five, deriving what it can', () => {
    const seneca: any = fakeSeneca()
    const m = model({ local: {} })

    const out = context(seneca, m, PKG, { env: 'local' })

    assert.strictEqual(out, seneca, 'returns seneca for chaining')
    assert.strictEqual(seneca.context.model, m)
    assert.strictEqual(seneca.context.pkg, PKG)
    assert.strictEqual(seneca.context.env, 'local')
    assert.strictEqual(seneca.context.stage, 'local')
    assert.strictEqual(seneca.context.srvname, 'all')
  })


  test('stage resolution order: spec, STAGE, model, env name', () => {
    // 1. explicit spec.stage wins over everything.
    process.env.STAGE = 'from-env-var'
    const a: any = fakeSeneca()
    context(a, model({ aws: { stage: 'dev' } }), PKG,
      { env: 'aws', stage: 'explicit' })
    assert.strictEqual(a.context.stage, 'explicit')

    // 2. STAGE beats the model - a deploy-time override.
    const b: any = fakeSeneca()
    context(b, model({ aws: { stage: 'dev' } }), PKG, { env: 'aws' })
    assert.strictEqual(b.context.stage, 'from-env-var')

    delete process.env.STAGE

    const c: any = fakeSeneca()
    context(c, model({ aws: { stage: 'dev' } }), PKG, { env: 'aws' })
    assert.strictEqual(c.context.stage, 'dev')

    // 4. nothing to go on: the env name.
    const d: any = fakeSeneca()
    context(d, model({ aws: {} }), PKG, { env: 'aws' })
    assert.strictEqual(d.context.stage, 'aws')
  })


  test('empty strings do not count as values', () => {
    process.env.STAGE = ''
    const seneca: any = fakeSeneca()
    context(seneca, model({ docker: { stage: '' } }), PKG,
      { env: 'docker', stage: '' })
    assert.strictEqual(seneca.context.stage, 'docker')
  })


  test('srvname defaults to all, and is overridable per service', () => {
    const a: any = fakeSeneca()
    context(a, model(), PKG, { env: 'lambda' })
    assert.strictEqual(a.context.srvname, 'all')

    // AWS Lambda is one function per service.
    const b: any = fakeSeneca()
    context(b, model(), PKG, { env: 'lambda', srvname: 'thing' })
    assert.strictEqual(b.context.srvname, 'thing')
  })


  test('env is required, and an entry need not be a model env', () => {
    for (const bad of [undefined, null, '', 0]) {
      assert.throws(
        () => context(fakeSeneca(), model(), PKG, { env: bad } as any),
        /requires a non-empty `env` string/,
        'accepted ' + JSON.stringify(bad))
    }
    assert.throws(
      () => context(fakeSeneca(), model(), PKG, undefined as any),
      /requires a non-empty `env` string/)

    const seneca: any = fakeSeneca()
    context(seneca, model({ aws: {} }), PKG, { env: 'lambda' })
    assert.strictEqual(seneca.context.env, 'lambda')
  })


  test('survives a model with no env section', () => {
    const seneca: any = fakeSeneca()
    context(seneca, {}, PKG, { env: 'test' })
    assert.strictEqual(seneca.context.stage, 'test')
    context(seneca, null, PKG, { env: 'test' })
    assert.strictEqual(seneca.context.stage, 'test')
  })
})
