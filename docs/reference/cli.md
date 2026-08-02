# Reference: the voxgig-system CLI

*Diátaxis: reference — commands and argument syntax. Run inside a Voxgig
system project (or its `backend/` folder).*

```
voxgig-system <command> [args...]
```

## add

| Command | Effect |
|---|---|
| `add entity [name\|spec]` | Add an entity (name may be `zone/name`; zone defaults to `'app'` or the file's zone) |
| `add srv [name\|spec]` | Add a service |
| `add msg [name\|spec]` | Add a message (path form `thing.save.item`; `aim` prepended if missing) |
| `add field <entity> [field...]` | Add field(s) to an entity |
| `add fields <entity> [field...]` | Alias of `add field` |
| `add env [name\|spec]` | Declare a target environment (`local`, `basic`, `docker`, `vm`, `aws`, `azure`, `cloudflare`, `web`) |

All `add` commands append jsonic blocks to the model source files; aontu
unification merges them and preserves existing formatting and comments.
Run `npm run model-build` afterwards to compile.

**name** — a plain element name; an empty element of that name is added.

**spec** — a jsonic definition with config options:

```bash
add entity '{name:thing,field:{title:{kind:String}}}'
add srv    '{name:pub,user:{required:false}}'
add msg    "{name:thing.save.item,params:{item:{'\$\$':'Open',title:String}}}"
add env    '{name:aws,region:eu-west-1,stage:prd}'
```

**field** forms — `name` | `name:Kind` | `name:{...def}` |
`{name:...,...def}`:

```bash
add field thing title 'done:Boolean' 'note:{kind:String,valid:Skip}'
```

`add env web` additionally appends the web app's service declarations
(`auth` + generic `ent`) and message patterns to `srv.aontu` /
`msg.aontu`, idempotently (skipped when `main.srv.auth` already exists).

## template

| Command | Effect |
|---|---|
| `template list` | Every template + the layer providing it |
| `template eject <name>` | Copy a fragment into `backend/tm/lambda/` |
| `template eject <name> --code` | Copy a generator into `backend/src/gen/` |
| `template diff` | Compare ejected copies against the installed package |

See [Customise generation templates](../how-to/customise-templates.md).
