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

`npm install` → `npm run build` → `npm test`, on every push and pull
request. The coverage gate lives in `npm test`: lines 95%, functions 95%,
branches 88%. That one script both enforces the gate and emits the `lcov`
artifact.

`npm install`, not `npm ci`: this repo **gitignores** `package-lock.json`
(`.gitignore:109`), and `npm ci` refuses to run without a committed
lockfile (`EUSAGE`) — it would fail before reaching the build. `cache: npm`
is omitted for the same reason: it hashes a lockfile that is not there.

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

The lcov reporters were folded into `test` itself rather than added as a
separate `test-cov` script. A second script would have duplicated every
threshold, exclusion and glob literal, so editing one and not the other
would silently let a developer's local gate differ from CI's.

Do **not** try to append the reporter flags with
`npm test -- --test-reporter=...` — they land after the positional glob
and node silently ignores them, yielding TAP and no lcov file. That is
why the flags live inside the script, before the glob.
