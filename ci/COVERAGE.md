# Coverage report

Measured 2026-08-02 (`npm run build && npm run test-cov`). The gate lives
in `package.json`, not here.

## Headline

| | lines | branches | functions |
|---|---|---|---|
| **measured** | **95.43%** | **91.33%** | **98.68%** |
| gate (fails below) | 95% | 88% | 95% |
| margin | **+0.43** | +3.33 | +3.68 |

45 tests, all passing.

**Lines has 0.43 points of headroom** — the tightest margin of any repo in
this set. Roughly a dozen uncovered lines would turn CI red. That is the
gate doing its job, but the next person to add an untested branch will get
a red build for a change that looks unrelated. Worth knowing before it
fires, and worth considering whether 95% is the right number or whether
the suite should grow first.

## Per-file

| File | lines | branches | functions |
|---|---|---|---|
| `make.ts` | **77.78** | 100.00 | 100.00 |
| `cmd.ts` | 94.90 | 93.48 | 100.00 |
| `add.ts` | 94.92 | 90.57 | 95.45 |
| `system.ts` | 95.51 | 90.00 | 100.00 |
| `template.ts` | 96.28 | 88.14 | 100.00 |
| `utility.ts` | 98.85 | 95.24 | 100.00 |

`make.ts` at 77.78% is the outlier and the single biggest contributor to
the thin line margin. It is also small, so a few tests there would buy
back most of the headroom.

`template.ts` has the weakest branch coverage (88.14%), which for a
templating module means template shapes nothing exercises — the same
class of gap that lets a generator emit wrong output while every line
reports as covered.

## Caveat

Node reports only files it actually loaded. Unlike the reference app, no
significant unloaded module was found here — the figures describe the
package.

But note how this number is produced: **without `npm run build` first,
`npm test` reports `0 tests` and `100%` coverage and exits 0.** Any
figure quoted from a run that skipped the build is meaningless. Always
build first.
