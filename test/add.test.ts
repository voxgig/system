/* Copyright © 2026 Voxgig Ltd, MIT License */

import Fs from 'node:fs'
import Os from 'node:os'
import Path from 'node:path'

import { addEntity, addSrv, addMsg, addFields, resolveModelFiles }
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
      expect(files.ent.endsWith('ent.aontu')).toEqual(true)
      expect(files.msg.endsWith('msg.aontu')).toEqual(true)
      expect(files.srv.endsWith('srv.aontu')).toEqual(true)
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
    expect(files.model.endsWith('model.jsonic')).toEqual(true)
    expect(files.ent.endsWith('ent.jsonic')).toEqual(true)
    expect(files.msg.endsWith('msg.jsonic')).toEqual(true)
  })


  test('add-entity-name', () => {
    const root = makeProject()
    addEntity(root, 'thing')
    const ent = read(root, 'ent.aontu')
    expect(ent).toContain('app: &: $.main.shape.ent')
    expect(ent).toContain('app: thing: {')
    expect(ent).toContain("'$$': 'Open'")

    // second entity in same zone: no duplicate zone shape line
    addEntity(root, 'other')
    const ent2 = read(root, 'ent.aontu')
    expect(ent2.match(/app: &: /g)!.length).toEqual(1)
    expect(ent2).toContain('app: other: {')
  })


  test('add-entity-zone-and-spec', () => {
    const root = makeProject()
    addEntity(root, 'qaz/foo')
    expect(read(root, 'ent.aontu')).toContain('qaz: foo: {')

    addEntity(root, '{name:bar,zone:qaz,field:{title:{kind:String}}}')
    const ent = read(root, 'ent.aontu')
    expect(ent).toContain('qaz: bar: {')
    expect(ent).toContain('kind: String')
    expect(ent.match(/qaz: &: /g)!.length).toEqual(1)
  })


  test('add-srv', () => {
    const root = makeProject()
    addSrv(root, 'thing')
    const srv = read(root, 'srv.aontu')
    expect(srv).toContain('thing: {')
    expect(srv).toContain("area: 'private/'")
    expect(srv).toContain('required: true')

    addSrv(root, '{name:pub,user:{required:false}}')
    const srv2 = read(root, 'srv.aontu')
    expect(srv2).toContain('pub: {')
    expect(srv2).toContain('required: false')
  })


  test('add-msg', () => {
    const root = makeProject()
    addMsg(root, 'thing.get.info')
    expect(read(root, 'msg.aontu')).toContain('aim: thing: get: info: {}')

    addMsg(root, 'aim:thing:list:item')
    expect(read(root, 'msg.aontu')).toContain('aim: thing: list: item: {}')

    addMsg(root, "{name:thing.save.item,params:{item:{'$$':'Open',title:String}}}")
    const msg = read(root, 'msg.aontu')
    expect(msg).toContain("aim: thing: save: item: '$': {")
    expect(msg).toContain("'$$': 'Open'")
    expect(msg).toContain('title: String')
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
    expect(ent).toContain('app: thing: field: title: {')
    expect(ent).toContain("label: 'Title'")
    expect(ent).toContain('kind: Boolean')
    expect(ent).toContain('valid: Skip')
    expect(ent).toContain("label: 'Owner Id'")
  })


  test('add-errors', () => {
    const root = makeProject()
    expect(() => addEntity(root, '[1,2]')).toThrow(/invalid entity/)
    expect(() => addMsg(root, '{nope:1}')).toThrow(/invalid msg/)
    expect(() => addFields(root, 'thing', [])).toThrow(/no fields/)
    expect(() => resolveModelFiles(Os.tmpdir())).toThrow(/model folder not found/)
  })

})


describe('gubuify-open', () => {

  test('open-marker-allows-extra-props', () => {
    const shape = gubuify({ item: { '$$': 'Open', title: 'String' } }, Gubu)
    const out = shape({ item: { title: 'x', extra: 1 } })
    expect(out.item.extra).toEqual(1)

    // without the marker, extra props are rejected
    const closed = gubuify({ item: { title: 'String' } }, Gubu)
    expect(() => closed({ item: { title: 'x', extra: 1 } })).toThrow()
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

    expect(addEntity(root, 'thing').skipped).toEqual(true)
    expect(addSrv(root, 'thing').skipped).toEqual(true)
    expect(addMsg(root, 'thing.save.item').skipped).toEqual(true)
    expect(addMsg(root, 'aim:thing:save:item').skipped).toEqual(true)

    const fields = addFields(root, 'thing', ['title', 'done:Boolean'])
    expect(fields[0].skipped).toEqual(true)      // title exists
    expect(fields[1].skipped).toBeUndefined()    // done is new

    // nothing appended for the skips
    expect(Fs.readFileSync(Path.join(model, 'ent.aontu'), 'utf8').length)
      .toBeGreaterThan(entlen) // only the new 'done' field grew the file

    // new elements still append
    expect(addEntity(root, 'other').skipped).toBeUndefined()
    expect(addMsg(root, 'thing.load.item').skipped).toBeUndefined()
  })


  test('no-compiled-model-appends', () => {
    const root = makeProject() // no model.json
    expect(addEntity(root, 'thing').skipped).toBeUndefined()
  })

})
