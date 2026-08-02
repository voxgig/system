/* Copyright © 2026 Voxgig Ltd, MIT License */

// The voxgig-system CLI. main() reads process.argv and process.cwd() and
// ends with process.exit, so each case runs it with those stubbed and
// the console captured.

import { describe, test } from 'node:test'
import assert from 'node:assert'

import Fs from 'node:fs'
import Os from 'node:os'
import Path from 'node:path'

import { main } from '../cmd'


// A project with model sources and a stub @voxgig/build installed.
function makeProject(): string {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vgs-cmd-'))
  const model = Path.join(root, 'backend', 'model')
  Fs.mkdirSync(model, { recursive: true })
  Fs.writeFileSync(Path.join(model, 'model.aontu'), `
main: ent: @"ent.aontu"
main: msg: @"msg.aontu"
main: srv: @"srv.aontu"
main: env: @"env.aontu"
`)
  for (const f of ['ent', 'msg', 'srv', 'env']) {
    Fs.writeFileSync(Path.join(model, f + '.aontu'), '\n')
  }

  const pkg = Path.join(root, 'backend', 'node_modules', '@voxgig', 'build')
  Fs.mkdirSync(Path.join(pkg, 'tm', 'lambda'), { recursive: true })
  Fs.mkdirSync(Path.join(pkg, 'env', 'lambda'), { recursive: true })
  Fs.writeFileSync(Path.join(pkg, 'package.json'), JSON.stringify({
    name: '@voxgig/build', version: '4.1.0', main: 'dist/build.js',
  }))
  Fs.writeFileSync(Path.join(pkg, 'tm', 'lambda', 'srv.yml.frag'), 'x\n')
  Fs.writeFileSync(Path.join(pkg, 'env', 'lambda', 'srv_yml.ts'),
    'const srv_yml = async () => {}\nexport { srv_yml }\n')
  return root
}


// Run main() with argv/cwd stubbed; returns the exit code and output.
// process.exit is made to throw so main() unwinds where it would exit.
async function run(argv: string[], cwd?: string) {
  const out: string[] = []
  const err: string[] = []

  const origArgv = process.argv
  const origCwd = process.cwd
  const origExit = process.exit
  const origLog = console.log
  const origErr = console.error

  let code: number | undefined

  process.argv = ['node', 'voxgig-system', ...argv]
  if (cwd) {
    process.cwd = () => cwd
  }
  ;(process as any).exit = (c?: number) => {
    // Only the FIRST exit counts: the stub unwinds by throwing, and some
    // command branches catch that on the way out.
    code = undefined === code ? c : code
    const e: any = new Error('__exit__')
    e.__exit__ = true
    throw e
  }
  console.log = (...a: any[]) => out.push(a.join(' '))
  console.error = (...a: any[]) => err.push(a.join(' '))

  try {
    await main()
  }
  catch (e: any) {
    if (!e.__exit__) {
      throw e
    }
  }
  finally {
    process.argv = origArgv
    process.cwd = origCwd
    ;(process as any).exit = origExit
    console.log = origLog
    console.error = origErr
  }

  // A command that returns normally exits 0.
  return { code: undefined === code ? 0 : code, out: out.join('\n'), err: err.join('\n') }
}


describe('cmd', () => {

  test('no args prints usage and exits non-zero', async () => {
    const r = await run([])
    assert.strictEqual(r.code, 1)
    assert.ok(r.out.includes('Usage: voxgig-system'))
  })

  test('--help prints usage and exits zero', async () => {
    const r = await run(['--help'])
    assert.strictEqual(r.code, 0)
    assert.ok(r.out.includes('add entity'))
  })

  test('add entity/srv/msg/field/env append to the model', async () => {
    const root = makeProject()

    assert.strictEqual((await run(['add', 'entity', 'shop/product'], root)).code, 0)
    assert.strictEqual((await run(['add', 'srv', 'thing'], root)).code, 0)
    assert.strictEqual((await run(['add', 'msg', 'thing.get.info'], root)).code, 0)
    assert.strictEqual((await run(
      ['add', 'field', 'shop/product', 'title'], root)).code, 0)
    assert.strictEqual((await run(
      ['add', 'fields', 'shop/product', 'note:String'], root)).code, 0)
    assert.strictEqual((await run(['add', 'env', 'docker'], root)).code, 0)

    const model = Path.join(root, 'backend', 'model')
    assert.ok(Fs.readFileSync(Path.join(model, 'ent.aontu'), 'utf8')
      .includes('product'))
    assert.ok(Fs.readFileSync(Path.join(model, 'srv.aontu'), 'utf8')
      .includes('thing'))
    assert.ok(Fs.readFileSync(Path.join(model, 'msg.aontu'), 'utf8')
      .includes('thing'))
    assert.ok(Fs.readFileSync(Path.join(model, 'env.aontu'), 'utf8')
      .includes('docker'))
  })

  test('add reports a bad element and bad args', async () => {
    const root = makeProject()

    const bad = await run(['add', 'nope', 'x'], root)
    assert.strictEqual(bad.code, 1)
    assert.ok(bad.err.includes('unknown'))

    const missing = await run(['add', 'field'], root)
    assert.strictEqual(missing.code, 1)
  })

  test('unknown top-level command is reported', async () => {
    const r = await run(['wat'])
    assert.strictEqual(r.code, 1)
    assert.ok(r.err.includes('unknown') || r.out.includes('Usage'))
  })

  test('template list/eject/diff', async () => {
    const root = makeProject()

    const list = await run(['template', 'list'], root)
    assert.strictEqual(list.code, 0)
    assert.ok(list.out.includes('srv_yml'))

    const eject = await run(['template', 'eject', 'srv.yml.frag'], root)
    assert.strictEqual(eject.code, 0)
    assert.ok(eject.out.includes('ejected fragment'))

    const diff = await run(['template', 'diff'], root)
    assert.strictEqual(diff.code, 0)
    assert.ok(diff.out.includes('srv.yml.frag'))

    const code = await run(['template', 'eject', 'srv_yml', '--code'], root)
    assert.strictEqual(code.code, 0)
    assert.ok(code.out.includes('ejected generator'))
  })

  test('template errors and unknown subcommands exit non-zero', async () => {
    const root = makeProject()

    const noname = await run(['template', 'eject'], root)
    assert.strictEqual(noname.code, 1)
    assert.ok(noname.err.includes('missing template name'))

    const unknown = await run(['template', 'wat'], root)
    assert.strictEqual(unknown.code, 1)

    const nothing = await run(['template', 'diff'], makeProject())
    assert.strictEqual(nothing.code, 0)
    assert.ok(nothing.out.includes('nothing ejected'))
  })
})
