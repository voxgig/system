/* Copyright © 2026 Voxgig Ltd, MIT License */

import { describe, test } from 'node:test'
import assert from 'node:assert'

import Fs from 'node:fs'
import Os from 'node:os'
import Path from 'node:path'

import { listTemplates, ejectFragment, ejectCode, diffTemplates }
  from '../lib/template'


// A minimal project with a stub @voxgig/build installed.
function makeProject(): string {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vgs-tmpl-'))
  const backend = Path.join(root, 'backend')
  const model = Path.join(backend, 'model')
  Fs.mkdirSync(model, { recursive: true })
  Fs.writeFileSync(Path.join(model, 'model.aontu'), '\nmain: {}\n')

  const pkg = Path.join(backend, 'node_modules', '@voxgig', 'build')
  Fs.mkdirSync(Path.join(pkg, 'tm', 'lambda'), { recursive: true })
  Fs.mkdirSync(Path.join(pkg, 'env', 'lambda'), { recursive: true })
  Fs.writeFileSync(Path.join(pkg, 'package.json'), JSON.stringify({
    name: '@voxgig/build', version: '4.1.0', main: 'dist/build.js',
  }))
  Fs.writeFileSync(Path.join(pkg, 'tm', 'lambda', 'srv.yml.frag'),
    '$$name$$:\n  handler: $$handler$$\n')
  Fs.writeFileSync(Path.join(pkg, 'tm', 'lambda', 'res.role.yml.frag'),
    'role: $$AppName$$\n')
  Fs.writeFileSync(Path.join(pkg, 'env', 'lambda', 'srv_yml.ts'),
    "import { generate, TM } from './generate'\n" +
    "import { CoreConfShape } from '../../shape/conf'\n" +
    'const srv_yml = async (model: any, spec: any) => {}\n' +
    'export { srv_yml }\n')

  return root
}


describe('template', () => {

  test('list-layers', () => {
    const root = makeProject()
    const rows = listTemplates(root)

    const srvgen = rows.find((r) => 'srv_yml' === r.name)!
    assert.deepEqual(srvgen.kind, 'generator')
    assert.deepEqual(srvgen.layer, 'package')

    const frag = rows.find((r) => 'lambda/srv.yml.frag' === r.name)!
    assert.deepEqual(frag.layer, 'package')
  })


  test('eject-fragment-and-shadow', () => {
    const root = makeProject()

    const dest = ejectFragment(root, 'srv.yml.frag')
    assert.deepEqual(dest.endsWith(Path.join('tm', 'lambda', 'srv.yml.frag')), true)
    assert.ok((Fs.readFileSync(dest, 'utf8')).includes('$$name$$:'))

    // provenance recorded
    const prov = JSON.parse(Fs.readFileSync(Path.join(
      Path.dirname(Path.dirname(dest)), '.ejected.json'), 'utf8'))
    assert.deepEqual(prov['lambda/srv.yml.frag'].version, '4.1.0')

    // layer now shows project
    const rows = listTemplates(root)
    assert.ok((rows.find((r) => 'lambda/srv.yml.frag' === r.name)!.layer).includes('project'))

    // double eject refuses
    assert.throws(() => ejectFragment(root, 'srv.yml.frag'), { message: new RegExp(/already ejected/) })

    // generator shorthand maps to its fragment
    const dest2 = ejectFragment(root, 'res_yml')
    assert.deepEqual(dest2.endsWith('res.role.yml.frag'), true)
  })


  test('eject-code-rewires-imports', () => {
    const root = makeProject()

    const dest = ejectCode(root, 'srv_yml')
    const src = Fs.readFileSync(dest, 'utf8')
    assert.ok((src).includes("from '@voxgig/build'"))
    assert.ok(!(src).includes("from './generate'"))
    assert.ok((src).includes('Ejected from @voxgig/build 4.1.0'))

    const rows = listTemplates(root)
    assert.ok((rows.find((r) => 'srv_yml' === r.name)!.layer).includes('src/gen'))

    assert.throws(() => ejectCode(root, 'nope'), { message: new RegExp(/unknown generator/) })
  })


  test('diff-upstream-drift', () => {
    const root = makeProject()
    ejectFragment(root, 'srv.yml.frag')

    // unchanged upstream, identical copy
    let rows = diffTemplates(root)
    assert.deepEqual(rows[0].upstream, 'unchanged')
    assert.deepEqual(rows[0].diff, '')

    // local edit -> diff appears
    const proj = Path.join(root, 'backend', 'tm', 'lambda', 'srv.yml.frag')
    Fs.appendFileSync(proj, '  memory: 4096\n')
    rows = diffTemplates(root)
    assert.ok(String(rows[0].diff).includes('+  memory: 4096'))

    // upstream bump -> flagged
    const pkgfrag = Path.join(root, 'backend', 'node_modules',
      '@voxgig', 'build', 'tm', 'lambda', 'srv.yml.frag')
    Fs.appendFileSync(pkgfrag, '  new: line\n')
    rows = diffTemplates(root)
    assert.deepEqual(rows[0].upstream, 'changed')
  })

})


describe('template errors', () => {

  test('missing @voxgig/build is reported', () => {
    const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vgs-nobuild-'))
    const model = Path.join(root, 'backend', 'model')
    Fs.mkdirSync(model, { recursive: true })
    Fs.writeFileSync(Path.join(model, 'model.aontu'), '\nmain: {}\n')
    assert.throws(() => listTemplates(root), { message: /@voxgig\/build not found/ })
  })

  test('unknown fragment lists the available ones', () => {
    const root = makeProject()
    assert.throws(() => ejectFragment(root, 'nope.frag'),
      { message: /unknown fragment: lambda\/nope.frag/ })
  })

  test('a fragment cannot be ejected twice', () => {
    const root = makeProject()
    ejectFragment(root, 'srv.yml.frag')
    assert.throws(() => ejectFragment(root, 'srv.yml.frag'),
      { message: /already ejected/ })
  })

  test('a generator cannot be ejected twice', () => {
    const root = makeProject()
    ejectCode(root, 'srv_yml')
    assert.throws(() => ejectCode(root, 'srv_yml'), { message: /already ejected/ })
  })

  test('unknown generator names are rejected', () => {
    const root = makeProject()
    assert.throws(() => ejectCode(root, 'nope'), { message: /unknown generator/ })
  })

  test('a generator missing from the installed package is reported', () => {
    const root = makeProject()
    Fs.rmSync(Path.join(root, 'backend', 'node_modules', '@voxgig', 'build',
      'env', 'lambda', 'srv_yml.ts'))
    assert.throws(() => ejectCode(root, 'srv_yml'),
      { message: /not shipped by installed/ })
  })

  test('diff flags a fragment the package no longer ships', () => {
    const root = makeProject()
    ejectFragment(root, 'srv.yml.frag')
    Fs.rmSync(Path.join(root, 'backend', 'node_modules', '@voxgig', 'build',
      'tm', 'lambda', 'srv.yml.frag'))
    const rows = diffTemplates(root)
    assert.deepEqual(rows[0].upstream, 'missing')
  })
})
