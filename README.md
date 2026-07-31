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
