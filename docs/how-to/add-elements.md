# How to add model elements

*Diátaxis: how-to guide — recipes for each `voxgig-system add` command.
Run inside the project (or its `backend/` folder); always finish with
`npm run model-build`.*

Every element accepts either a **name** (an empty element is added) or a
**jsonic spec** (a definition with config options).

## Add an entity

```bash
voxgig-system add entity thing            # zone defaults ('app', or the file's zone)
voxgig-system add entity shop/order       # zone-qualified
voxgig-system add entity '{name:thing,field:{title:{kind:String}}}'
```

## Add fields

```bash
voxgig-system add field thing title 'done:Boolean' 'note:{kind:String,valid:Skip}'
```

Field forms: `name` | `name:Kind` | `name:{...def}` | `{name:...,...def}`.

To add a **relationship**, use a `ref` attribute (the field stays
`kind: String` — it stores the target's id):

```bash
voxgig-system add field shop/order 'product_id:{kind:String,ref:"shop/product",valid:Skip}'
```

The generated web app derives pickers, links, and drill-down navigation
from `ref` fields.

## Add a service

```bash
voxgig-system add srv thing
voxgig-system add srv '{name:pub,user:{required:false}}'
```

## Add a message

```bash
voxgig-system add msg thing.get.info      # 'aim' is prepended if missing
voxgig-system add msg "{name:thing.save.item,params:{item:{'\$\$':'Open',title:String}}}"
```

`params` validate the full message (data usually rides under a property
like `item`). Gubu param objects are closed by default; mark an object
with `'$$': 'Open'` (the same convention as entity `valid`) to allow
additional properties. Each message maps to an action file in
`src/srv/<srv>/` (`save:item` → `save_item.ts`); add a message only when
its action file exists (or will).

## Add an environment

```bash
voxgig-system add env docker
voxgig-system add env '{name:aws,region:eu-west-1,stage:prd}'
voxgig-system add env web
```

`add env web` additionally appends the web app's service declarations
(`auth` + generic `ent`) and message patterns (`aim:auth`, `aim:ent`,
gateway routes) — idempotently, only when absent — so the
`@voxgig/build` EnvWeb frontend has its backend contract.

## Programmatic use

```js
const { Add } = require('@voxgig/system')
Add.entity(folder, 'thing')
Add.fields(folder, 'thing', ['title', 'done:Boolean'])
Add.env(folder, 'web')
```
