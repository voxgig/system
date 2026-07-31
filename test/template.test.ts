/* Copyright © 2026 Voxgig Ltd, MIT License */

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
    expect(srvgen.kind).toEqual('generator')
    expect(srvgen.layer).toEqual('package')

    const frag = rows.find((r) => 'srv.yml.frag' === r.name)!
    expect(frag.layer).toEqual('package')
  })


  test('eject-fragment-and-shadow', () => {
    const root = makeProject()

    const dest = ejectFragment(root, 'srv.yml.frag')
    expect(dest.endsWith(Path.join('tm', 'lambda', 'srv.yml.frag')))
      .toEqual(true)
    expect(Fs.readFileSync(dest, 'utf8')).toContain('$$name$$:')

    // provenance recorded
    const prov = JSON.parse(Fs.readFileSync(
      Path.join(Path.dirname(dest), '.ejected.json'), 'utf8'))
    expect(prov['srv.yml.frag'].version).toEqual('4.1.0')

    // layer now shows project
    const rows = listTemplates(root)
    expect(rows.find((r) => 'srv.yml.frag' === r.name)!.layer)
      .toContain('project')

    // double eject refuses
    expect(() => ejectFragment(root, 'srv.yml.frag'))
      .toThrow(/already ejected/)

    // generator shorthand maps to its fragment
    const dest2 = ejectFragment(root, 'res_yml')
    expect(dest2.endsWith('res.role.yml.frag')).toEqual(true)
  })


  test('eject-code-rewires-imports', () => {
    const root = makeProject()

    const dest = ejectCode(root, 'srv_yml')
    const src = Fs.readFileSync(dest, 'utf8')
    expect(src).toContain("from '@voxgig/build'")
    expect(src).not.toContain("from './generate'")
    expect(src).toContain('Ejected from @voxgig/build 4.1.0')

    const rows = listTemplates(root)
    expect(rows.find((r) => 'srv_yml' === r.name)!.layer)
      .toContain('src/gen')

    expect(() => ejectCode(root, 'nope')).toThrow(/unknown generator/)
  })


  test('diff-upstream-drift', () => {
    const root = makeProject()
    ejectFragment(root, 'srv.yml.frag')

    // unchanged upstream, identical copy
    let rows = diffTemplates(root)
    expect(rows[0].upstream).toEqual('unchanged')
    expect(rows[0].diff).toEqual('')

    // local edit -> diff appears
    const proj = Path.join(root, 'backend', 'tm', 'lambda', 'srv.yml.frag')
    Fs.appendFileSync(proj, '  memory: 4096\n')
    rows = diffTemplates(root)
    expect(rows[0].diff).toContain('+  memory: 4096')

    // upstream bump -> flagged
    const pkgfrag = Path.join(root, 'backend', 'node_modules',
      '@voxgig', 'build', 'tm', 'lambda', 'srv.yml.frag')
    Fs.appendFileSync(pkgfrag, '  new: line\n')
    rows = diffTemplates(root)
    expect(rows[0].upstream).toEqual('changed')
  })

})
