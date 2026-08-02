# How to customise generation templates

*Diátaxis: how-to guide — take ownership of a generation template in your
project.*

Generation templates resolve in layers — first hit wins:

1. `backend/src/gen/<name>.ts` — compiled generator override (deep custom)
2. `backend/tm/lambda/<frag>` — project fragment (text-level custom)
3. `@voxgig/build` defaults

## See what's in effect

```bash
voxgig-system template list            # each template + its providing layer
```

## Text-level: eject a fragment

```bash
voxgig-system template eject srv.yml.frag      # copy fragment -> tm/lambda/
```

Fragments are jostraca-style text templates with `$$slot$$` placeholders —
edit and re-run `npm run model-build`; no compile step.

Ejecting records provenance (`tm/lambda/.ejected.json`) so that after a
`@voxgig/build` upgrade you can flag upstream template drift:

```bash
voxgig-system template diff            # ejected copies vs installed package
```

## Code-level: eject a generator

```bash
voxgig-system template eject srv_yml --code    # copy generator -> src/gen/
```

The copy is rewired to `@voxgig/build`'s public API; the project then owns
that generator. After edits: `npm run build && npm run model-build`.
