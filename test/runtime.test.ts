/* Copyright © 2026 Voxgig Ltd, MIT License */

// Runtime coverage: System.messages/prepare (message wiring by the
// MakeSrv convention, gubu param shapes from the model), MakeSrv itself,
// and the Local/Live service assemblers.
//
// Two techniques keep this a fast unit test with no transport and no
// real backend:
//   - MakeSrv takes the service's `require`, so a FAKE require hands it
//     action factories directly - no files, no module-loader games.
//   - Other services are stood in for with MOCK MESSAGES
//     (seneca.message(...)), the Seneca-native way to isolate a unit.

import { describe, test } from 'node:test'
import assert from 'node:assert'

import Fs from 'fs'
import Os from 'os'
import Path from 'path'

import Seneca from 'seneca'

import { System, MakeSrv, Local, Live, Utility } from '../system'


// A model with two services: 'alpha' (own messages + a gateway route +
// params, including an Open object) and 'beta' (a dependency of alpha).
function makeModel(): any {
  return {
    main: {
      srv: {
        alpha: {
          options: { fromModel: true },
          deps: { beta: {} },
          in: {
            aim: {
              alpha: {},
              req: { on: { alpha: { $: { allow: true } } } },
            },
          },
        },
        beta: {
          in: { aim: { beta: {} } },
        },
      },
      msg: {
        aim: {
          alpha: {
            get: { info: {} },
            save: {
              item: {
                $: {
                  params: {
                    item: { '$$': 'Open', title: 'String', size: 'Number' },
                    flag: 'Boolean',
                    // A key already in name:expression form is left
                    // alone by gubuify (no second rename).
                    'raw:String': 'String',
                  },
                },
              },
            },
          },
          beta: { get: { info: {} } },
          req: {
            on: {
              alpha: {
                save: { item: { $: { file: './web_save_item' } } },
              },
            },
          },
        },
      },
    },
  }
}


// Stand-in for @seneca/reload: MakeSrv calls
// this.export('reload/make')(require) to obtain a loader that turns an
// action path into the action function. Here it requires (through the
// service's own require) and calls the factory - no reload machinery.
function reload(this: any) {
  return {
    name: 'reload',
    exports: {
      make: (req: any) => (path: string, _opts: any) => req(path)(),
    },
  }
}


function makeSeneca(model: any) {
  const seneca = Seneca({ legacy: false }).test()
  seneca.context.model = model
  seneca.use(reload)
  return seneca
}


// A fake `require` for a service: resolves action paths from a map, and
// raises MODULE_NOT_FOUND for anything absent (the same signal the real
// loader gives for an optional <srv>-prepare module).
function fakeRequire(files: Record<string, any>) {
  return (path: string) => {
    if (path in files) {
      return files[path]
    }
    const err: any = new Error('Cannot find module ' + path)
    err.code = 'MODULE_NOT_FOUND'
    throw err
  }
}


describe('MakeSrv + System.messages', () => {

  test('wires model messages to action files by convention', async () => {
    const seneca = makeSeneca(makeModel())

    const calls: string[] = []
    let prepared = false
    const alpha = MakeSrv('alpha', fakeRequire({
      // Convention: last pattern pair -> file name.
      './get_info': () => async () => (calls.push('get_info'), { ok: true, srv: 'alpha' }),
      './save_item': () => async (msg: any) => (calls.push('save_item'), { ok: true, item: msg.item }),
      // The gateway route declares $.file, overriding the convention.
      './web_save_item': () => async () => (calls.push('web_save_item'), { ok: true, web: true }),
      // Optional prepare module: present here.
      './alpha-prepare': () => async function () {
        prepared = true
      },
    }))

    seneca.use(alpha)
    await seneca.ready()

    assert.partialDeepStrictEqual(await seneca.post('aim:alpha,get:info'), { ok: true, srv: 'alpha' })
    assert.partialDeepStrictEqual(await seneca.post('aim:req,on:alpha,save:item'), { web: true })
    assert.deepEqual(calls, ['get_info', 'web_save_item'])

    // prepare() ran the optional <srv>-prepare module.
    assert.ok(prepared)
  })

  test('model params become gubu validation on the message', async () => {
    const seneca = makeSeneca(makeModel())

    seneca.use(MakeSrv('alpha', fakeRequire({
      './get_info': () => async () => ({ ok: true }),
      './save_item': () => async (msg: any) => ({ ok: true, item: msg.item }),
      './web_save_item': () => async () => ({ ok: true }),
    })))
    await seneca.ready()

    // The item object is marked Open, so extra properties are allowed.
    const good = await seneca.post('aim:alpha,save:item', {
      item: { title: 'a', size: 1, extra: 'allowed' },
      flag: true,
      raw: 'v',
    })
    assert.strictEqual(good.item.extra, 'allowed')

    // A wrong type is rejected by the generated shape before the action
    // is reached.
    await assert.rejects(
      seneca.post('aim:alpha,save:item', {
        item: { title: 'a', size: 'not-a-number' },
        flag: true,
        raw: 'v',
      }),
      { message: /invalid message/ })
  })

  test('a missing prepare module is not an error, other errors propagate', async () => {
    // No './alpha-prepare' entry: MODULE_NOT_FOUND is swallowed.
    const seneca = makeSeneca(makeModel())
    seneca.use(MakeSrv('alpha', fakeRequire({
      './get_info': () => async () => ({ ok: true }),
      './save_item': () => async () => ({ ok: true }),
      './web_save_item': () => async () => ({ ok: true }),
    })))
    await seneca.ready()
    assert.partialDeepStrictEqual(await seneca.post('aim:alpha,get:info'), { ok: true })

    // A prepare module that fails to load for any OTHER reason must
    // propagate. System.prepare only needs the plugin name and a require.
    const fakeSeneca: any = {
      fixedargs: { plugin$: { name: 'srv_alpha' } },
      prepare: () => undefined,
    }
    assert.throws(() => System.prepare(fakeSeneca, (path: string) => {
      const err: any = new Error('bad prepare: ' + path)
      err.code = 'SYNTAX_ERROR'
      throw err
    }), { message: /bad prepare/ })
  })

  test('MakeSrv names the plugin srv_<name>', () => {
    assert.strictEqual((MakeSrv('zed', fakeRequire({})) as any).name, 'srv_zed')
  })
})


describe('mock messages stand in for other services', () => {

  test('a service action can call a mocked dependency', async () => {
    const seneca = makeSeneca(makeModel())

    // The real 'beta' service is replaced by a mock message: this unit
    // test needs neither the other service nor a transport.
    seneca.message('aim:beta,get:info', async () => ({ ok: true, mocked: true }))

    seneca.use(MakeSrv('alpha', fakeRequire({
      './get_info': () => async function (this: any) {
        const dep = await this.post('aim:beta,get:info')
        return { ok: true, via: dep.mocked }
      },
      './save_item': () => async () => ({ ok: true }),
      './web_save_item': () => async () => ({ ok: true }),
    })))
    await seneca.ready()

    assert.partialDeepStrictEqual(await seneca.post('aim:alpha,get:info'), { ok: true, via: true })
  })
})


// Local/Live load service PLUGIN FILES from a folder, so these need real
// files - but they can be plain Seneca plugins (no MakeSrv), which is all
// the assemblers care about.
function makePluginFolder(names: string[], omit: string[] = []): string {
  const folder = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'system-srv-'))
  for (const name of names) {
    if (omit.includes(name)) {
      continue
    }
    const dir = Path.join(folder, name)
    Fs.mkdirSync(dir, { recursive: true })
    Fs.writeFileSync(Path.join(dir, name + '-srv.js'), `
module.exports = function srv_${name}(options) {
  this.message('aim:${name},get:info', async function () {
    return { ok: true, srv: '${name}', options }
  })
}
`)
  }
  return folder
}


describe('Local and Live', () => {

  test('Local loads every service in the model, merging options', async () => {
    const seneca = makeSeneca(makeModel())
    const folder = makePluginFolder(['alpha', 'beta'])

    seneca.use(Local, { srv: { folder }, options: { alpha: { extra: 1 } } })
    await seneca.ready()

    const out = await seneca.post('aim:alpha,get:info')
    assert.partialDeepStrictEqual(out, { ok: true, srv: 'alpha' })
    // Model options merged with the per-service override.
    assert.partialDeepStrictEqual(out.options, { fromModel: true, extra: 1 })
    assert.partialDeepStrictEqual(await seneca.post('aim:beta,get:info'), { srv: 'beta' })
  })

  test('Local warns when a service file is missing', async () => {
    const seneca = makeSeneca(makeModel())
    const folder = makePluginFolder(['alpha', 'beta'], ['beta'])

    const warns: any[] = []
    ;(seneca as any).log.warn = (...args: any[]) => warns.push(args)

    seneca.use(Local, { srv: { folder } })
    await seneca.ready()

    assert.partialDeepStrictEqual(await seneca.post('aim:alpha,get:info'), { ok: true })
    assert.ok((JSON.stringify(warns)).includes('srv-not-found'))
  })

  test('Live loads the named service and its declared deps', async () => {
    const seneca = makeSeneca(makeModel())
    const folder = makePluginFolder(['alpha', 'beta'])

    seneca.use(Live, { srv: { name: 'alpha', folder }, options: {} })
    await seneca.ready()

    assert.partialDeepStrictEqual(await seneca.post('aim:alpha,get:info'), { srv: 'alpha' })
    assert.partialDeepStrictEqual(await seneca.post('aim:beta,get:info'), { srv: 'beta' })
  })

  test('Live with no deps loads just the service, and warns if absent', async () => {
    const model = makeModel()
    delete model.main.srv.alpha.deps
    const seneca = makeSeneca(model)
    const folder = makePluginFolder(['alpha'])

    seneca.use(Live, { srv: { name: 'alpha', folder }, options: { alpha: { o: 2 } } })
    await seneca.ready()
    assert.partialDeepStrictEqual(await seneca.post('aim:alpha,get:info'), { srv: 'alpha' })

    // A service with no file on disk only warns.
    const model2 = makeModel()
    delete model2.main.srv.alpha.deps
    const seneca2 = makeSeneca(model2)
    const warns: any[] = []
    ;(seneca2 as any).log.warn = (...args: any[]) => warns.push(args)
    seneca2.use(Live, {
      srv: { name: 'alpha', folder: makePluginFolder(['alpha'], ['alpha']) },
      options: {},
    })
    await seneca2.ready()
    assert.ok((JSON.stringify(warns)).includes('srv-not-found'))
  })
})


describe('Utility.srvmsgs', () => {

  test('selects the model messages a service declares', () => {
    const model = makeModel()
    const pats = Utility.srvmsgs(model.main.srv.alpha, model).map((m: any) => m.pattern)
    assert.ok((pats).includes('aim:alpha,get:info'))
    assert.ok((pats).includes('aim:alpha,save:item'))
    assert.ok((pats).includes('aim:req,on:alpha,save:item'))
    assert.ok(!(pats).includes('aim:beta,get:info'))

    const betapats = Utility.srvmsgs(model.main.srv.beta, model).map((m: any) => m.pattern)
    assert.deepEqual(betapats, ['aim:beta,get:info'])
  })

  test('a service declaring nothing selects nothing', () => {
    assert.deepEqual(Utility.srvmsgs({}, makeModel()), [])
  })
})


describe('System exports', () => {

  test('messages and prepare are exposed', () => {
    assert.strictEqual(typeof System.messages, 'function')
    assert.strictEqual(typeof System.prepare, 'function')
    assert.strictEqual(typeof MakeSrv, 'function')
  })
})
