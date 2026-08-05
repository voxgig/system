/* Copyright © 2026 Voxgig Ltd, MIT License */

import { describe, test } from 'node:test'
import assert from 'node:assert'

import Fs from 'node:fs'
import Os from 'node:os'
import Path from 'node:path'

import { addEntity, addSrv, addMsg, addFields, addEnv, resolveModelFiles }
  from '../lib/add'

import { gubuify } from '../system'

const { Gubu } = require('gubu')


// A minimal project model folder for the add commands to operate on.
function makeProject(): string {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vgs-add-'))
  const model = Path.join(root, 'backend', 'model')
  Fs.mkdirSync(model, { recursive: true })

  Fs.writeFileSync(Path.join(model, 'model.aontu'), `
main: msg: @"msg.aontu"
main: srv: @"srv.aontu"
main: ent: @"ent.aontu"
`)
  Fs.writeFileSync(Path.join(model, 'ent.aontu'), `
sys: &: $.main.shape.ent

sys: user: {
  field: {}
}
`)
  Fs.writeFileSync(Path.join(model, 'msg.aontu'), '\naim: {}\n')
  Fs.writeFileSync(Path.join(model, 'srv.aontu'),
    '\n&: $.sys.shape.srv.std_ts\n')

  return root
}

function read(root: string, file: string) {
  return Fs.readFileSync(
    Path.join(root, 'backend', 'model', file), 'utf8')
}


describe('add', () => {

  test('resolve-model-files', () => {
    const root = makeProject()
    // from project root, backend/, and model/ itself
    for (const start of [root, Path.join(root, 'backend'),
      Path.join(root, 'backend', 'model')]) {
      const files = resolveModelFiles(start)
      assert.deepEqual(files.ent.endsWith('ent.aontu'), true)
      assert.deepEqual(files.msg.endsWith('msg.aontu'), true)
      assert.deepEqual(files.srv.endsWith('srv.aontu'), true)
    }
  })


  test('resolve-legacy-jsonic', () => {
    // legacy projects with .jsonic model files still resolve
    const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vgs-add-'))
    const model = Path.join(root, 'model')
    Fs.mkdirSync(model, { recursive: true })
    Fs.writeFileSync(Path.join(model, 'model.jsonic'),
      '\nmain: ent: @"ent.jsonic"\n')
    Fs.writeFileSync(Path.join(model, 'ent.jsonic'), '\nsys: user: {}\n')
    Fs.writeFileSync(Path.join(model, 'msg.jsonic'), '\naim: {}\n')
    Fs.writeFileSync(Path.join(model, 'srv.jsonic'), '\n')

    const files = resolveModelFiles(root)
    assert.deepEqual(files.model.endsWith('model.jsonic'), true)
    assert.deepEqual(files.ent.endsWith('ent.jsonic'), true)
    assert.deepEqual(files.msg.endsWith('msg.jsonic'), true)
  })


  test('add-entity-name', () => {
    const root = makeProject()
    addEntity(root, 'thing')
    const ent = read(root, 'ent.aontu')
    assert.ok((ent).includes('app: &: $.main.shape.ent'))
    assert.ok((ent).includes('app: thing: {'))
    assert.ok((ent).includes("'$$': 'Open'"))

    // second entity in same zone: no duplicate zone shape line
    addEntity(root, 'other')
    const ent2 = read(root, 'ent.aontu')
    assert.deepEqual(ent2.match(/app: &: /g)!.length, 1)
    assert.ok((ent2).includes('app: other: {'))
  })


  test('add-entity-zone-and-spec', () => {
    const root = makeProject()
    addEntity(root, 'qaz/foo')
    assert.ok((read(root, 'ent.aontu')).includes('qaz: foo: {'))

    addEntity(root, '{name:bar,zone:qaz,field:{title:{kind:String}}}')
    const ent = read(root, 'ent.aontu')
    assert.ok((ent).includes('qaz: bar: {'))
    assert.ok((ent).includes('kind: String'))
    assert.deepEqual(ent.match(/qaz: &: /g)!.length, 1)
  })


  test('add-srv', () => {
    const root = makeProject()
    addSrv(root, 'thing')
    const srv = read(root, 'srv.aontu')
    assert.ok((srv).includes('thing: {'))
    assert.ok((srv).includes("area: 'private/'"))
    assert.ok((srv).includes('required: true'))

    addSrv(root, '{name:pub,user:{required:false}}')
    const srv2 = read(root, 'srv.aontu')
    assert.ok((srv2).includes('pub: {'))
    assert.ok((srv2).includes('required: false'))
  })


  test('add-msg', () => {
    const root = makeProject()
    addMsg(root, 'thing.get.info')
    assert.ok((read(root, 'msg.aontu')).includes('aim: thing: get: info: {}'))

    addMsg(root, 'aim:thing:list:item')
    assert.ok((read(root, 'msg.aontu')).includes('aim: thing: list: item: {}'))

    addMsg(root, "{name:thing.save.item,params:{item:{'$$':'Open',title:String}}}")
    const msg = read(root, 'msg.aontu')
    assert.ok((msg).includes("aim: thing: save: item: '$': {"))
    assert.ok((msg).includes("'$$': 'Open'"))
    assert.ok((msg).includes('title: String'))
  })


  test('add-fields', () => {
    const root = makeProject()
    addEntity(root, 'thing')
    addFields(root, 'thing', [
      'title',
      'done:Boolean',
      'note:{kind:String,valid:Skip}',
      'owner_id',
    ])
    const ent = read(root, 'ent.aontu')
    assert.ok((ent).includes('app: thing: field: title: {'))
    assert.ok((ent).includes("label: 'Title'"))
    assert.ok((ent).includes('kind: Boolean'))
    assert.ok((ent).includes('valid: Skip'))
    assert.ok((ent).includes("label: 'Owner Id'"))
  })


  test('add-errors', () => {
    const root = makeProject()
    assert.throws(() => addEntity(root, '[1,2]'), { message: new RegExp(/invalid entity/) })
    assert.throws(() => addMsg(root, '{nope:1}'), { message: new RegExp(/invalid msg/) })
    assert.throws(() => addFields(root, 'thing', []), { message: new RegExp(/no fields/) })
    assert.throws(() => resolveModelFiles(Os.tmpdir()), { message: new RegExp(/model folder not found/) })
  })

})


describe('gubuify-open', () => {

  test('open-marker-allows-extra-props', () => {
    const shape = gubuify({ item: { '$$': 'Open', title: 'String' } }, Gubu)
    const out = shape({ item: { title: 'x', extra: 1 } })
    assert.deepEqual(out.item.extra, 1)

    // without the marker, extra props are rejected
    const closed = gubuify({ item: { title: 'String' } }, Gubu)
    assert.throws(() => closed({ item: { title: 'x', extra: 1 } }))
  })

})


describe('add-idempotency', () => {

  // With a compiled model.json present, re-adding an existing element is
  // a no-op (skipped) - the check is semantic, so source formatting does
  // not matter.
  test('skip-existing-elements', () => {
    const root = makeProject()
    const model = Path.join(root, 'backend', 'model')

    Fs.writeFileSync(Path.join(model, 'model.json'), JSON.stringify({
      main: {
        ent: { app: { thing: { field: { title: { kind: 'String' } } } } },
        srv: { thing: {} },
        msg: { aim: { thing: { save: { item: {} } } } },
      },
    }))

    const entlen = Fs.readFileSync(Path.join(model, 'ent.aontu'), 'utf8').length

    assert.deepEqual(addEntity(root, 'thing').skipped, true)
    assert.deepEqual(addSrv(root, 'thing').skipped, true)
    assert.deepEqual(addMsg(root, 'thing.save.item').skipped, true)
    assert.deepEqual(addMsg(root, 'aim:thing:save:item').skipped, true)

    const fields = addFields(root, 'thing', ['title', 'done:Boolean'])
    assert.deepEqual(fields[0].skipped, true)      // title exists
    assert.strictEqual(fields[1].skipped, undefined)    // done is new

    // nothing appended for the skips
    assert.ok(((Fs.readFileSync(Path.join(model, 'ent.aontu'), 'utf8').length) > (entlen))) // only the new 'done' field grew the file

    // new elements still append
    assert.strictEqual(addEntity(root, 'other').skipped, undefined)
    assert.strictEqual(addMsg(root, 'thing.load.item').skipped, undefined)
  })


  test('no-compiled-model-appends', () => {
    const root = makeProject() // no model.json
    assert.strictEqual(addEntity(root, 'thing').skipped, undefined)
  })

})


describe('add-env', () => {

  test('name-and-spec-forms', () => {
    const root = makeProject()

    const r1 = addEnv(root, 'aws')
    assert.deepEqual(r1.file.endsWith('model.aontu'), true)
    assert.ok((r1.text).includes('main: env: aws: {'))
    assert.ok((r1.text).includes('active: true'))

    const r2 = addEnv(root, '{name:aws2,kind:aws,region:eu-west-1,stage:prd}')
    assert.ok((r2.text).includes('main: env: aws2: {'))
    assert.ok((r2.text).includes("region: 'eu-west-1'"))

    assert.throws(() => addEnv(root, 'mainframe'), { message: new RegExp(/unknown environment kind/) })
  })


  test('env-file-ref-and-idempotency', () => {
    const root = makeProject()
    const model = Path.join(root, 'backend', 'model')

    // reference an env model file
    Fs.appendFileSync(Path.join(model, 'model.aontu'),
      '\nmain: env: @"env.aontu"\n')
    Fs.writeFileSync(Path.join(model, 'env.aontu'), '\nlocal: { active: true }\n')

    const r = addEnv(root, 'docker')
    assert.deepEqual(r.file.endsWith('env.aontu'), true)
    assert.ok((r.text).includes('docker: {'))
    assert.ok(!(r.text).includes('main: env:'))

    // idempotent via compiled model
    Fs.writeFileSync(Path.join(model, 'model.json'), JSON.stringify({
      main: { env: { docker: { active: true } } },
    }))
    assert.deepEqual(addEnv(root, 'docker').skipped, true)
  })


  // Re-adding an env MERGES: the keys the model does not already carry are
  // appended, and aontu unifies them in. Keys it does carry are left alone
  // - re-stating one with a different value would not override it, it would
  // fail the next model build.
  test('env-merge-on-readd', () => {
    const root = makeProject()
    const model = Path.join(root, 'backend', 'model')

    Fs.appendFileSync(Path.join(model, 'model.aontu'),
      '\nmain: env: @"env.aontu"\n')
    Fs.writeFileSync(Path.join(model, 'env.aontu'), '\nlocal: { active: true }\n')

    addEnv(root, "{name:aws,region:'us-east-1',stage:dev}")
    Fs.writeFileSync(Path.join(model, 'model.json'), JSON.stringify({
      main: { env: { aws: { active: true, region: 'us-east-1', stage: 'dev' } } },
    }))

    // Nothing new: still a plain skip.
    const same = addEnv(root, "{name:aws,region:'us-east-1'}")
    assert.deepEqual(same.skipped, true)
    assert.deepEqual(same.conflicts, undefined)

    // New keys only: appended, and reported as a merge.
    const add = addEnv(root, '{name:aws,profile:voxgig,lambda:{memory:512}}')
    assert.deepEqual(add.skipped, undefined)
    assert.ok((add.text).includes("profile: 'voxgig'"))
    assert.ok((add.text).includes('memory: 512'))
    // Only the fresh keys - the ones already set are NOT restated.
    assert.ok(!(add.text).includes('region'))
    assert.ok(!(add.text).includes('stage'))
    assert.deepEqual(add.merged,
      ['main.env.aws.profile', 'main.env.aws.lambda.memory'])

    // A CHANGED value cannot be applied by appending: aontu unifies, so
    // `stage: 'prd'` next to `stage: 'dev'` is a build error, not an
    // override. It is reported instead of written.
    const clash = addEnv(root, '{name:aws,stage:prd}')
    assert.deepEqual(clash.skipped, true)
    assert.deepEqual(clash.text, '')
    assert.deepEqual(clash.conflicts, [
      { path: 'main.env.aws.stage', current: 'dev', wanted: 'prd' },
    ])

    // Fresh and clashing together: the fresh part still lands, the clash
    // is still reported, and neither hides the other.
    const both = addEnv(root, '{name:aws,stage:prd,newkey:1}')
    assert.ok((both.text).includes('newkey: 1'))
    assert.ok(!(both.text).includes('prd'))
    assert.deepEqual(both.merged, ['main.env.aws.newkey'])
    assert.deepEqual(both.conflicts?.[0].path, 'main.env.aws.stage')

    // An empty map is a leaf for reporting - it declares the key exists.
    const empty = addEnv(root, '{name:aws,extra:{}}')
    assert.deepEqual(empty.merged, ['main.env.aws.extra'])
  })


  // `add env web` also declares the services the generated web app needs,
  // and is guarded on the auth service being absent.
  test('env-web-declares-services', () => {
    const root = makeProject()
    const model = Path.join(root, 'backend', 'model')

    const r = addEnv(root, 'web')
    assert.ok((r.text).includes('web: {'))

    const srv = Fs.readFileSync(Path.join(model, 'srv.aontu'), 'utf8')
    assert.ok((srv).includes('auth: {'), 'auth service declared')
    assert.ok((srv).includes('ent: {'), 'generic entity service declared')

    const msg = Fs.readFileSync(Path.join(model, 'msg.aontu'), 'utf8')
    assert.ok((msg).includes('aim:'), 'messages declared')

    // Guarded: with auth already in the compiled model the service
    // declarations are not appended a second time.
    Fs.writeFileSync(Path.join(model, 'model.json'), JSON.stringify({
      main: { srv: { auth: {} } },
    }))
    const before = Fs.readFileSync(Path.join(model, 'srv.aontu'), 'utf8')
    addEnv(root, '{name:web2,kind:web}')
    assert.deepEqual(
      Fs.readFileSync(Path.join(model, 'srv.aontu'), 'utf8'), before)
  })

})
