# @voxgig/system

Runtime and tooling for Voxgig system projects (as created by
`npm create @voxgig/system`):

- **Runtime** — service loading by convention (`MakeSrv`), local and live
  system assembly (`Local`, `Live`, `System`) wired from the compiled
  [voxgig-model](https://github.com/voxgig/model).
- **`voxgig-system` CLI** — add model elements (`entity`, `srv`, `msg`,
  `field`, `env`) and manage generation templates (`template
  list/eject/diff`). Commands append jsonic blocks to the model sources;
  aontu unification merges them, preserving your formatting and comments.

## Documentation

Organised by the [Diátaxis](https://diataxis.fr) framework:

- **Tutorial**: [Grow a project with the CLI](docs/tutorial.md)
- **How-to guides**:
  - [Add model elements](docs/how-to/add-elements.md)
  - [Customise generation templates](docs/how-to/customise-templates.md)
- **Reference**:
  - [CLI](docs/reference/cli.md)
  - [API](docs/reference/api.md)
- **Explanation**: [How the model wires the runtime](docs/explanation/model-wiring.md)

Working on this repo with an AI agent? See [AGENTS.md](AGENTS.md).

## Quick start

```bash
# inside a Voxgig system project (or its backend/ folder)
voxgig-system add entity shop/product
voxgig-system add field shop/product title 'price:Number'
voxgig-system add env web
npm run model-build
```

## Develop

```bash
npm install
npm run build
npm test
```

## License

MIT. Copyright (c) Voxgig Ltd.
