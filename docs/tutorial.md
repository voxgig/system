# Tutorial: grow a project with the CLI

*Diátaxis: tutorial — a hands-on lesson. Starting from an empty Voxgig
system project, you will add an entity, a service, and a message, and see
each one wired into the running system.*

## 1. Start from an empty project

```bash
npm create @voxgig/system my-shop
cd my-shop/backend
npm install
npm test          # green out of the box
```

## 2. Add an entity

```bash
npx voxgig-system add entity 'shop/product'
npx voxgig-system add field shop/product title 'price:Number' 'note:{kind:String,valid:Skip}'
```

Open `model/ent.aontu`: the CLI appended jsonic blocks — your existing
formatting and comments are untouched, because the model is *unified*
(aontu) rather than rewritten. Compile:

```bash
npm run model-build
```

`model/model.json` now carries `main.ent.shop.product`, and the entity is
immediately usable via the Seneca entity layer (and, if the `web` env is
active, appears in the generated app's entity menu on reload).

## 3. Add a service and a message

```bash
npx voxgig-system add srv product
npx voxgig-system add msg product.get.info
npm run model-build
```

The service declaration (in `model/srv.aontu`) makes `MakeSrv` load
`src/srv/product/` at boot; the message `aim:product,get:info` maps by
convention to `src/srv/product/get_info.ts` — create that file with an
action function and the message answers. This is the core convention: *the
model declares, the file system implements, `MakeSrv` connects them by
name*.

## 4. Add an environment

```bash
npx voxgig-system add env web
npm run model-build
npm run build
npm run web
```

`add env web` does more than flip a flag: it also appends the web app's
service declarations (`auth`, the generic `ent` service) and message
patterns to the model, so the generated frontend
(`@voxgig/build` EnvWeb) has a working backend contract.

## Where to next

- All commands and spec syntax: [CLI reference](reference/cli.md)
- Change what generation emits: [Customise templates](how-to/customise-templates.md)
- Why it's wired this way: [How the model wires the runtime](explanation/model-wiring.md)
