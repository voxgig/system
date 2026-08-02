# Reference: API

*Diátaxis: reference — the package's exported surface (`system.ts`).*

```js
const { System, MakeSrv, Local, Live, Add, Template, Utility, gubuify } =
  require('@voxgig/system')
```

## Runtime

| Export | Description |
|---|---|
| `MakeSrv(name, require)` | Build a Seneca service plugin for `src/srv/<name>/`. Wires the model's message patterns for the service to action files by convention (last message pair → file: `save:item` → `save_item`), with hot-reload support |
| `System` | The wiring core used by `MakeSrv`: `System.messages(seneca, options, reload)` registers model-declared messages with gubu-validated params; `System.prepare(seneca, require)` runs the service's `<name>-prepare` module if present |
| `Local(options)` | Seneca plugin assembling a local system: loads every service in `model.main.srv` from `options.srv.folder`, per-service options override the model |
| `Live(...)` | Live (deployed) counterpart of `Local` |
| `gubuify` | Convert model param declarations into Gubu shapes. String values become builder expressions; `'$$': 'Open'` marks an object open (same convention as entity `valid`) |

## Model editing (`Add`)

Programmatic form of the CLI `add` commands. All take the project folder
(the project root or its `backend/`) first and append jsonic to the model
sources, preserving formatting.

| Export | Description |
|---|---|
| `Add.entity(folder, nameOrSpec)` | Add an entity |
| `Add.srv(folder, nameOrSpec)` | Add a service |
| `Add.msg(folder, nameOrSpec)` | Add a message |
| `Add.fields(folder, entref, fieldargs)` | Add fields to an entity |
| `Add.env(folder, nameOrSpec)` | Declare an environment; `web` also appends the auth/ent service + message declarations (idempotent) |
| `Add.resolveModelFiles(folder)` | Locate the model source files for a project |

## Templates (`Template`)

Programmatic form of the CLI `template` commands (implemented over
`@voxgig/build`'s `Fragments` API).

| Export | Description |
|---|---|
| `Template.list(...)` | Templates + the layer providing each |
| `Template.eject(...)` | Copy a fragment into `backend/tm/lambda/` |
| `Template.ejectCode(...)` | Copy a generator into `backend/src/gen/` |
| `Template.diff(...)` | Ejected copies vs the installed package |

## `Utility`

Helpers used across the runtime (`srvmsgs`, `deep`, ...). Internal-ish;
prefer the exports above.
