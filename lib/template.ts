/* Copyright © 2026 Voxgig Ltd, MIT License. */

// Template customization tooling: list / eject / diff for the generation
// templates provided by @voxgig/build.
//
// Layered resolution (first hit wins):
//   1. backend/src/gen/<name>.ts   compiled generator override (deep custom)
//   2. backend/tm/lambda/<frag>    project fragment (text-level custom)
//   3. @voxgig/build               package defaults
//
// eject copies a package fragment (or, with code=true, a template source
// rewired to the package's public API) into the project, recording
// provenance in tm/lambda/.ejected.json so diff can show upstream drift
// after package upgrades.

import Crypto from 'node:crypto'
import Fs from 'node:fs'
import Path from 'node:path'
import { spawnSync } from 'node:child_process'

import { resolveModelFiles } from './add'


// The code-level template generators (env/lambda/<name>.ts in the package).
const GENERATORS = ['srv_yml', 'srv_handler', 'res_yml']

// Generator shorthand -> default fragment.
const GENERATOR_FRAG: Record<string, string> = {
  srv_yml: 'srv.yml.frag',
  srv_handler: 'srv_handler.ts.frag',
  res_yml: 'res.role.yml.frag',
}


export type Project = {
  backend: string     // the project backend folder (holds model/, tm/, src/)
  tm: string          // backend/tm/lambda
  gen: string         // backend/src/gen
  pkg: string         // resolved @voxgig/build package folder
  pkgtm: string       // package tm/lambda
}


function resolveProject(start: string): Project {
  const files = resolveModelFiles(start)
  const backend = Path.dirname(files.folder)

  let pkgjson: string
  try {
    pkgjson = require.resolve('@voxgig/build/package.json', {
      paths: [backend, files.folder, start],
    })
  }
  catch (e: any) {
    throw new Error('@voxgig/build not found from ' + backend +
      ' - is it installed? (npm install)')
  }
  const pkg = Path.dirname(pkgjson)

  return {
    backend,
    tm: Path.join(backend, 'tm', 'lambda'),
    gen: Path.join(backend, 'src', 'gen'),
    pkg,
    pkgtm: Path.join(pkg, 'tm', 'lambda'),
  }
}


function pkgVersion(project: Project): string {
  return JSON.parse(
    Fs.readFileSync(Path.join(project.pkg, 'package.json'), 'utf8')).version
}

function sha256(content: string | Buffer): string {
  return Crypto.createHash('sha256').update(content).digest('hex')
}


type Provenance = Record<string, {
  package: string, version: string, sha256: string
}>

function readProvenance(project: Project): Provenance {
  const p = Path.join(project.tm, '.ejected.json')
  return Fs.existsSync(p) ? JSON.parse(Fs.readFileSync(p, 'utf8')) : {}
}

function writeProvenance(project: Project, prov: Provenance) {
  Fs.mkdirSync(project.tm, { recursive: true })
  Fs.writeFileSync(Path.join(project.tm, '.ejected.json'),
    JSON.stringify(prov, null, 2) + '\n')
}


export type TemplateRow = {
  name: string        // fragment or generator name
  kind: 'fragment' | 'generator'
  layer: string       // which layer currently provides it
}

// List each template with the layer that currently provides it.
function listTemplates(start: string): TemplateRow[] {
  const project = resolveProject(start)

  const rows: TemplateRow[] = []

  for (const gen of GENERATORS) {
    const override = Path.join(project.gen, gen + '.ts')
    rows.push({
      name: gen,
      kind: 'generator',
      layer: Fs.existsSync(override) ?
        'project (src/gen/' + gen + '.ts)' : 'package',
    })
  }

  const frags = Fs.readdirSync(project.pkgtm)
    .filter((f) => f.endsWith('.frag')).sort()
  for (const frag of frags) {
    rows.push({
      name: frag,
      kind: 'fragment',
      layer: Fs.existsSync(Path.join(project.tm, frag)) ?
        'project (tm/lambda/' + frag + ')' : 'package',
    })
  }

  return rows
}


// Eject a fragment (text template) into backend/tm/lambda/.
function ejectFragment(start: string, name: string): string {
  const project = resolveProject(start)

  const frag = GENERATOR_FRAG[name] || name
  const srcpath = Path.join(project.pkgtm, frag)
  if (!Fs.existsSync(srcpath)) {
    const avail = Fs.readdirSync(project.pkgtm)
      .filter((f) => f.endsWith('.frag')).sort()
    throw new Error('unknown fragment: ' + frag +
      ' (available: ' + avail.join(', ') + ')')
  }

  const dest = Path.join(project.tm, frag)
  if (Fs.existsSync(dest)) {
    throw new Error('already ejected: ' + Path.relative(start, dest))
  }

  const content = Fs.readFileSync(srcpath, 'utf8')
  Fs.mkdirSync(project.tm, { recursive: true })
  Fs.writeFileSync(dest, content)

  const prov = readProvenance(project)
  prov[frag] = {
    package: '@voxgig/build',
    version: pkgVersion(project),
    sha256: sha256(content),
  }
  writeProvenance(project, prov)

  return dest
}


// Eject a generator source (compiled component override) into
// backend/src/gen/<name>.ts, rewiring package-internal imports to the
// public '@voxgig/build' API.
function ejectCode(start: string, name: string): string {
  const project = resolveProject(start)

  if (!GENERATORS.includes(name)) {
    throw new Error('unknown generator: ' + name +
      ' (available: ' + GENERATORS.join(', ') + ')')
  }

  const srcpath = Path.join(project.pkg, 'env', 'lambda', name + '.ts')
  if (!Fs.existsSync(srcpath)) {
    throw new Error('template source not shipped by installed ' +
      '@voxgig/build (' + pkgVersion(project) + ') - needs >= 4.1.0')
  }

  const dest = Path.join(project.gen, name + '.ts')
  if (Fs.existsSync(dest)) {
    throw new Error('already ejected: ' + Path.relative(start, dest))
  }

  let src = Fs.readFileSync(srcpath, 'utf8')

  // Package-internal imports -> public API.
  src = src
    .replace(/from '\.\/generate'/g, "from '@voxgig/build'")
    .replace(/from '\.\.\/\.\.\/shape\/msg'/g, "from '@voxgig/build'")
    .replace(/from '\.\.\/\.\.\/shape\/conf'/g, "from '@voxgig/build'")
    .replace(/from '\.\.\/\.\.\/yml\/res_dynamo_yml'/g, "from '@voxgig/build'")

  const version = pkgVersion(project)
  src = '// Ejected from @voxgig/build ' + version +
    ' (env/lambda/' + name + '.ts).\n' +
    '// This project copy now OWNS this generator: the build action uses\n' +
    '// it instead of the package default. After editing, run:\n' +
    '//   npm run build && npm run model-build\n' +
    '// Compare with the package version: voxgig-system template diff\n' +
    src

  Fs.mkdirSync(project.gen, { recursive: true })
  Fs.writeFileSync(dest, src)

  const prov = readProvenance(project)
  prov['code:' + name] = {
    package: '@voxgig/build',
    version,
    sha256: sha256(Fs.readFileSync(srcpath)),
  }
  writeProvenance(project, prov)

  return dest
}


export type DiffRow = {
  name: string
  upstream: 'unchanged' | 'changed' | 'missing'
  diff?: string       // unified diff of package vs project copy
}

// For each ejected template, report upstream drift (package version now
// differs from what was ejected) and show package-vs-project diffs.
function diffTemplates(start: string): DiffRow[] {
  const project = resolveProject(start)
  const prov = readProvenance(project)

  const rows: DiffRow[] = []

  for (const key of Object.keys(prov).sort()) {
    const rec = prov[key]
    const isCode = key.startsWith('code:')
    const name = isCode ? key.substring(5) : key

    const pkgfile = isCode ?
      Path.join(project.pkg, 'env', 'lambda', name + '.ts') :
      Path.join(project.pkgtm, name)
    const projfile = isCode ?
      Path.join(project.gen, name + '.ts') :
      Path.join(project.tm, name)

    if (!Fs.existsSync(pkgfile)) {
      rows.push({ name: key, upstream: 'missing' })
      continue
    }

    const upstream =
      sha256(Fs.readFileSync(pkgfile)) === rec.sha256 ?
        'unchanged' : 'changed'

    let diff: string | undefined = undefined
    if (Fs.existsSync(projfile)) {
      const res = spawnSync('diff', ['-u', pkgfile, projfile],
        { encoding: 'utf8' })
      diff = 0 === res.status ? '' : res.stdout
    }

    rows.push({ name: key, upstream, diff })
  }

  return rows
}


export {
  resolveProject,
  listTemplates,
  ejectFragment,
  ejectCode,
  diffTemplates,
  GENERATORS,
}
