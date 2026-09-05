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
- `STYLE-GUIDE.md`, `.vale.ini`, `.vale/`, `tools/check_prose.py` — the
  prose gate over `README.md` and `docs/` (see below).

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
- `main.msg` has TWO shapes and `listmsgs` (`lib/utility.ts`) reads both:
  - the legacy CHAIN, where the nesting is the pattern and `'$'` escapes the
    leaf — `aim: web: { save: item: { '$': { file: './web_save_item' } } }`;
  - the DECLARED shape, a **LIST** of definitions each carrying its pattern as
    data — `[ { pat: [ {aim: web}, {save: item} ], params: {...} } ]`.

  A LIST, not a map keyed by message name. A gateway proxy and the message it
  forwards to necessarily share their last pattern pair
  (`aim:web,on:todo,save:item` proxies `aim:todo,save:item`), so any key
  derived from that pair would collide and the two could not both be declared.
  A list has no key. The action file is unchanged: the last pattern pair, or
  `file` when declared — which is exactly what a proxy uses.

  A definition's `meta` is the definition minus `pat`, so `params` and `file`
  keep working. `srv.in` is a pattern-PREFIX tree, never definitions, so it is
  unaffected. Requires `@voxgig/model` 11+ to build such a model.

  Not yet migrated: `add`'s generators (`WEB_MSG_DECL`, `addMsg`) still emit
  and path-check the chain form.


## Model gotchas

- Aontu/jsonic comments are `#`; quote values containing `-`, `/`, `#`.
- Gubu message params are closed by default; `'$$': 'Open'` opens them.
- Relationship fields: `kind: String` + `ref: 'zone/name'` attr (+
  usually `valid: Skip`); `kind: 'Ref'` is invalid.

## Prose follows STYLE-GUIDE.md

[`STYLE-GUIDE.md`](STYLE-GUIDE.md) is normative for the reader-facing pages:
the root `README.md` and every page under `docs/`. Two gates enforce it and
both run in CI (`.github/workflows/docs.yml`):

| Gate | Checks |
|---|---|
| `vale --minAlertLevel=error $(python3 tools/check_prose.py --files)` | Google's rules plus the banned list, at the levels in `.vale.ini` |
| `python3 tools/check_prose.py` | the banned list across line wraps, em-dash spacing and ration, first person, no emoji, no citations of a working document, resolving relative links, a complete page set |

`npm run scan-prose` runs the second locally; run Vale by hand (`vale sync`
once, then the command in the table) for the first. Neither is chained into
`npm test`. The banned list is
`.vale/styles/config/vocabularies/System/reject.txt`, read by both gates. The
page set is the configuration block at the top of `tools/check_prose.py`;
a new documentation page must be reachable from it or neither gate reads it.

Three things trip agents most often: a page must not name or link
`AGENTS.md`, `NEXT.org` or `ci/COVERAGE.md` (state the fact instead); the
em dash is spaced (` — `) and rationed to one aside per line; and a word
Vale's dictionary does not know goes into `accept.txt` one entry at a time,
never as a suffix pattern.
