# CI workflow (dormant)

GitHub only runs workflows found under `.github/workflows/`. This lives in
`ci/`, so it is **inert** until deliberately activated.

## Activate

```bash
mkdir -p .github/workflows
git mv ci/ci.yml .github/workflows/ci.yml
git commit -m 'ci: activate workflow'
```

## What runs

`npm ci` → `npm run build` → `npm run test-cov`, on every push and pull
request. The coverage gate is the one already in `npm test`: lines 95%,
functions 95%, branches 88%. Coverage uploads as an `lcov` artifact.

## The build step is not optional

`npm test` runs compiled output from `dist-test/`. Without a build it
finds nothing and reports:

```
# tests 0
# pass 0
# all files | 100.00 | 100.00 | 100.00
```

Exit code 0. Green, 100% coverage, and completely meaningless — this is
exactly what a CI job that forgot `npm run build` would report, forever,
while the suite never ran. Keep the build step ahead of the test step.

## Will it pass today?

Yes — 45 tests, all passing, with the gate met. Every dependency is
published; nothing needs credentials.

## Note

`test-cov` was added alongside this workflow: it mirrors `test` exactly
plus lcov output, so the thresholds stay single-sourced in
`package.json`. Do **not** try to append reporter flags with
`npm test -- --test-reporter=...` — they land after the positional glob
and node silently ignores them, yielding TAP and no lcov file.
