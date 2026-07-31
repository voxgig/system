#!/usr/bin/env node
/* Copyright © 2026 Voxgig Ltd, MIT License. */

// voxgig-system: command line for working with a Voxgig system project.
//
//   voxgig-system add entity [String(name)|Jsonic(spec)]
//   voxgig-system add srv    [String(name)|Jsonic(spec)]
//   voxgig-system add msg    [String(name)|Jsonic(spec)]
//   voxgig-system add field  <entity> [String(name)|Jsonic(spec)] ...
//   voxgig-system add fields <entity> [String(name)|Jsonic(spec)] ...
//
// String(name): the element name - an empty element is added.
// Jsonic(spec): a jsonic definition of the element with config options.
//
// Run inside a project (or its backend/ folder); the model source files
// are found via model/model.jsonic and appended to. Run the project's
// model build (npm run model-build) afterwards to compile.

import { addEntity, addSrv, addMsg, addFields } from './lib/add'
import {
  listTemplates, ejectFragment, ejectCode, diffTemplates,
} from './lib/template'


const USAGE = `Usage: voxgig-system <command> [args...]

  add entity [name|spec]           add an entity (name may be zone/name)
  add srv    [name|spec]           add a service
  add msg    [name|spec]           add a message (path: thing.save.item)
  add field  <entity> [field...]   add field(s) to an entity
  add fields <entity> [field...]   alias of add field

  template list                    templates + the layer providing each
  template eject <name>            copy a fragment into backend/tm/lambda/
  template eject <name> --code     copy a generator into backend/src/gen/
  template diff                    ejected copies vs the installed package

name:  plain element name - an empty element is added
spec:  jsonic definition with config options, e.g.
       add entity '{name:thing,field:{title:{kind:String}}}'
       add srv    '{name:thing,user:{required:false}}'
       add msg    '{name:thing.save.item,params:{title:String}}'
       add field  thing title 'done:Boolean' 'note:{kind:String,valid:Skip}'

Generation templates resolve in layers (first hit wins): project
src/gen/<name>.ts (code override) -> project tm/lambda/<frag> (text
fragment) -> @voxgig/build defaults. Eject a fragment to customize the
text shape with no compile step; eject --code for structural changes.

Run inside the project (or backend/) folder. Then: npm run model-build
`


async function main() {
  const argv = process.argv.slice(2)

  if (0 === argv.length || argv.includes('-h') || argv.includes('--help')) {
    console.log(USAGE)
    process.exit(0 === argv.length ? 1 : 0)
  }

  const [cmd, element, ...args] = argv

  const start = process.cwd()

  if ('template' === cmd || 'templates' === cmd) {
    try {
      if ('list' === element) {
        for (const row of listTemplates(start)) {
          console.log(
            row.kind.padEnd(10) + row.name.padEnd(24) + row.layer)
        }
      }
      else if ('eject' === element) {
        const name = args.filter((a) => !a.startsWith('-'))[0]
        if (null == name) {
          throw new Error('template eject: missing template name')
        }
        if (args.includes('--code')) {
          const dest = ejectCode(start, name)
          console.log('ejected generator: ' + dest)
          console.log('\nThis project copy now owns the ' + name +
            ' generator. After editing:')
          console.log('  npm run build && npm run model-build')
        }
        else {
          const dest = ejectFragment(start, name)
          console.log('ejected fragment: ' + dest)
          console.log('\nEdit the fragment, then: npm run model-build')
        }
      }
      else if ('diff' === element) {
        const rows = diffTemplates(start)
        if (0 === rows.length) {
          console.log('nothing ejected')
        }
        for (const row of rows) {
          console.log('== ' + row.name + '  (upstream: ' +
            row.upstream + ')')
          if (row.diff) {
            console.log(row.diff)
          }
          else if ('' === row.diff) {
            console.log('   identical to package')
          }
        }
      }
      else {
        console.error('voxgig-system: unknown template command: ' + element)
        console.log(USAGE)
        process.exit(1)
      }
      process.exit(0)
    }
    catch (e: any) {
      console.error('voxgig-system: ' + e.message)
      process.exit(1)
    }
  }

  if ('add' !== cmd) {
    console.error('voxgig-system: unknown command: ' + cmd)
    console.log(USAGE)
    process.exit(1)
  }

  try {
    if ('entity' === element) {
      requireArgs(args, 1, 'add entity')
      const res = addEntity(start, args[0])
      report([res])
    }
    else if ('srv' === element) {
      requireArgs(args, 1, 'add srv')
      const res = addSrv(start, args[0])
      report([res])
    }
    else if ('msg' === element) {
      requireArgs(args, 1, 'add msg')
      const res = addMsg(start, args[0])
      report([res])
    }
    else if ('field' === element || 'fields' === element) {
      requireArgs(args, 2, 'add field')
      const res = addFields(start, args[0], args.slice(1))
      report(res)
    }
    else {
      console.error('voxgig-system: unknown element: ' + element)
      console.log(USAGE)
      process.exit(1)
    }

    console.log('\nNow run: npm run model-build')
  }
  catch (e: any) {
    console.error('voxgig-system: ' + e.message)
    process.exit(1)
  }
}


function requireArgs(args: string[], n: number, what: string) {
  if (args.length < n) {
    throw new Error(what + ': missing argument(s)')
  }
}

function report(results: { file: string, text: string }[]) {
  for (const res of results) {
    console.log('appended to ' + res.file + ':')
    console.log(res.text)
  }
}


if (require.main === module) {
  main()
}


export {
  main,
}
