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

  Fs.writeFileSync(Path.join(model, 'model.jsonic'), `
main: msg: @"msg.jsonic"
main: srv: @"srv.jsonic"
main: ent: @"ent.jsonic"
`)
  Fs.writeFileSync(Path.join(model, 'ent.jsonic'), `
sys: &: $.main.shape.ent

sys: user: {
  field: {}
}
`)
  Fs.writeFileSync(Path.join(model, 'msg.jsonic'), '\naim: {}\n')
  Fs.writeFileSync(Path.join(model, 'srv.jsonic'),
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
      expect(files.ent.endsWith('ent.jsonic')).toEqual(true)
      expect(files.msg.endsWith('msg.jsonic')).toEqual(true)
      expect(files.srv.endsWith('srv.jsonic')).toEqual(true)
    }
  })


  test('add-entity-name', () => {
    const root = makeProject()
    addEntity(root, 'thing')
    const ent = read(root, 'ent.jsonic')
    expect(ent).toContain('app: &: $.main.shape.ent')
    expect(ent).toContain('app: thing: {')
    expect(ent).toContain("'$$': 'Open'")

    // second entity in same zone: no duplicate zone shape line
    addEntity(root, 'other')
    const ent2 = read(root, 'ent.jsonic')
    expect(ent2.match(/app: &: /g)!.length).toEqual(1)
    expect(ent2).toContain('app: other: {')
  })


  test('add-entity-zone-and-spec', () => {
    const root = makeProject()
    addEntity(root, 'qaz/foo')
    expect(read(root, 'ent.jsonic')).toContain('qaz: foo: {')

    addEntity(root, '{name:bar,zone:qaz,field:{title:{kind:String}}}')
    const ent = read(root, 'ent.jsonic')
    expect(ent).toContain('qaz: bar: {')
    expect(ent).toContain('kind: String')
    expect(ent.match(/qaz: &: /g)!.length).toEqual(1)
  })


  test('add-srv', () => {
    const root = makeProject()
    addSrv(root, 'thing')
    const srv = read(root, 'srv.jsonic')
    expect(srv).toContain('thing: {')
    expect(srv).toContain("area: 'private/'")
    expect(srv).toContain('required: true')

    addSrv(root, '{name:pub,user:{required:false}}')
    const srv2 = read(root, 'srv.jsonic')
    expect(srv2).toContain('pub: {')
    expect(srv2).toContain('required: false')
  })


  test('add-msg', () => {
    const root = makeProject()
    addMsg(root, 'thing.get.info')
    expect(read(root, 'msg.jsonic')).toContain('aim: thing: get: info: {}')

    addMsg(root, 'aim:thing:list:item')
    expect(read(root, 'msg.jsonic')).toContain('aim: thing: list: item: {}')

    addMsg(root, "{name:thing.save.item,params:{item:{'$$':'Open',title:String}}}")
    const msg = read(root, 'msg.jsonic')
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
    const ent = read(root, 'ent.jsonic')
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
