# Agent guide: @voxgig/system

Runtime (MakeSrv/Local/Live) and the `voxgig-system` CLI for Voxgig system
projects. Concepts: [README.md](README.md) + [docs/](docs/); this file is
operational guidance.

## Commands

```bash
npm run build   # tsc -> dist/ + dist-test/ (tests)
npm test        # node:test + coverage thresholds
```

## Layout

- `system.ts` — exports (`System`, `MakeSrv`, `Local`, `Live`, `Add`,
  `Template`, `gubuify`, `Utility`); `srv/make.ts` — `MakeSrv`.
- `cmd.ts` — the `voxgig-system` CLI (usage text at the top).
- `lib/add.ts` — model-editing (`add entity/srv/msg/field/env`). `addEnv`
  kind `web` appends `WEB_SRV_DECL` / `WEB_MSG_DECL` / `WEB_ENT_DECL`
  (auth + generic ent + REST api services, their messages, and the
  sys/apikey entity) — idempotent, guarded on `main.srv.auth` being
  absent. The messages define **the browser surface**: `aim:web` proxies
  only (`web_*` action files). A browser may send nothing else — the
  generated gateway allows just `aim:web` — so new browser operations are
  added as proxies here, never by widening the allow-list.
- `lib/template.ts` — template list/eject/diff over `@voxgig/build`'s
  `Fragments` API.

## Hard rules

- **`dist/` is committed** — always `npm run build` before committing.
- `add` commands APPEND jsonic to model files (aontu unifies); never
  change them to rewrite files — preserving user formatting/comments is a
  feature under test.
- **Re-adding MERGES, and cannot change an existing value.** `add env`
  appends only the paths the compiled model does not already carry; a path
  already set to a DIFFERENT value is returned in `conflicts` and left
  alone. This is not timidity — aontu unifies rather than overrides, so
  appending `stage: 'prd'` beside `stage: 'dev'` does not win, it fails the
  next model build with `[aontu/scalar_value]: Cannot unify values`.
  Changing a value is a hand edit. The CLI prints conflicts loudly; never
  make them silent.
- The aontu appended by `WEB_SRV_DECL`/`WEB_MSG_DECL` must stay in sync
  with what `@voxgig/build` EnvWeb's generated services implement (the
  reference pairing is `metsitaba/todo-app`'s model). If you change one,
  change the other and verify a fresh project compiles
  (`npm run model-build` + `tsc`).
- MakeSrv convention: a model message maps to the action file named after
  its LAST pattern pair (`save:item` → `save_item.ts`). Only declare
  messages whose action files exist — boot fails otherwise.

## Model gotchas

- Aontu/jsonic comments are `#`; quote values containing `-`, `/`, `#`.
- Gubu message params are closed by default; `'$$': 'Open'` opens them.
- Relationship fields: `kind: String` + `ref: 'zone/name'` attr (+
  usually `valid: Skip`); `kind: 'Ref'` is invalid.
