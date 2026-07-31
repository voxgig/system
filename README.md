# @voxgig/system

Runtime and tooling for Voxgig system projects: service loading
(`MakeSrv`, `Local`, `Live`), message wiring from the model (`System`),
and the `voxgig-system` command line.

## voxgig-system CLI

Add elements to a Voxgig system project (as created by
`npm create @voxgig/system`). Run inside the project (or its `backend/`
folder); the commands append jsonic blocks to the model source files —
aontu unification merges them, and your formatting and comments are
preserved. Run `npm run model-build` afterwards to compile.

```
voxgig-system add entity [name|spec]           add an entity (name may be zone/name)
voxgig-system add srv    [name|spec]           add a service
voxgig-system add msg    [name|spec]           add a message (path: thing.save.item)
voxgig-system add field  <entity> [field...]   add field(s) to an entity
voxgig-system add fields <entity> [field...]   alias of add field
```

Each element takes either a **String(name)** — an empty element of that
name is added — or a **Jsonic(spec)** — a jsonic definition with config
options:

```bash
# empty elements by name
voxgig-system add entity thing            # zone defaults ('app', or the file's zone)
voxgig-system add entity shop/order       # zone-qualified
voxgig-system add srv thing
voxgig-system add msg thing.get.info      # 'aim' is prepended if missing

# jsonic specs with config options
voxgig-system add entity '{name:thing,field:{title:{kind:String}}}'
voxgig-system add srv    '{name:pub,user:{required:false}}'
voxgig-system add msg    "{name:thing.save.item,params:{item:{'\$\$':'Open',title:String}}}"

# fields: name | name:Kind | name:{...def} | {name:...,...def}
voxgig-system add field thing title 'done:Boolean' 'note:{kind:String,valid:Skip}'
```

Message `params` validate the full message (data usually rides under a
property like `item`). Gubu param objects are closed by default; mark an
object with `'$$': 'Open'` (the same convention as entity `valid`) to
allow additional properties.

The add API is also exported for programmatic use:

```js
const { Add } = require('@voxgig/system')
Add.entity(folder, 'thing')
Add.fields(folder, 'thing', ['title', 'done:Boolean'])
```

## License

MIT. Copyright (c) Voxgig Ltd.

## Custom generation templates

Generation templates resolve in layers — first hit wins:

1. `backend/src/gen/<name>.ts` — compiled generator override (deep custom)
2. `backend/tm/lambda/<frag>` — project fragment (text-level custom)
3. `@voxgig/build` defaults

```bash
voxgig-system template list            # each template + its providing layer
voxgig-system template eject srv.yml.frag      # copy fragment -> tm/lambda/
voxgig-system template eject srv_yml --code    # copy generator -> src/gen/
voxgig-system template diff            # ejected copies vs installed package
```

Fragments are jostraca-style text templates with `$$slot$$` placeholders —
edit and re-run `npm run model-build`, no compile step. Ejecting records
provenance (`tm/lambda/.ejected.json`) so `template diff` can flag
upstream template changes after a `@voxgig/build` upgrade. `--code`
copies the template source rewired to `@voxgig/build`'s public API; the
project then owns that generator (`npm run build && npm run model-build`
after edits).
