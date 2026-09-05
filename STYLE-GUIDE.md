# Documentation style guide

How the Voxgig System documentation is written. This guide is normative
for the root [`README.md`](./README.md) and every page under
[`docs/`](./docs/tutorial.md) — 7 pages, the ones a reader lands on from
GitHub and npm. It exists so that a page written next year sounds like a
page written this year, and so that a reviewer can point at a rule
instead of arguing taste.

It is a port of [jostraca/jostraca](https://github.com/jostraca/jostraca)'s
guide, by way of [voxgig/struct](https://github.com/voxgig/struct)'s,
which share an author and a house voice with this project. The structure
and most of the rules are those projects'. Where this one differs — the
spaced em dash, the working-document set, the shape of the four kinds —
the difference is recorded with the measurement behind it, because a
divergence nobody wrote down reads later as drift.

Three sources feed the guide, in a fixed priority order. The same order is
encoded in [`.vale.ini`](./.vale.ini), and every rule switched off there
names the reason and the count it produced:

    house voice  ->  Google  ->  Vale defaults

1. **This file.** Where it rules, it rules. The house voice is Richard
   Rodger's blog register, and the places it wins are listed with their
   reasons rather than left as silent exceptions: the spaced em dash,
   first-person plural in the tutorial, British spellings, and quotation
   punctuation outside the quotes.
2. The [Google developer documentation style
   guide](https://developers.google.com/style) for everything this file
   does not cover: second person, present tense, active voice,
   sentence-style capitalisation in headings, serial commas, one idea per
   sentence.
3. [Vale](https://vale.sh) defaults, which mostly means spelling.

Two gates check it, and both run in CI:

| Gate | Runs | Checks |
|---|---|---|
| `vale --minAlertLevel=error $(python3 tools/check_prose.py --files)` | `.github/workflows/docs.yml`, and by hand with Vale installed | Google's rules plus the banned list, at the levels set in `.vale.ini` |
| `python3 tools/check_prose.py` | `npm run scan-prose`, and the same workflow | the banned list, the em-dash spacing and ration, the first-person rules, no emoji, no citations of a working document, that every relative link resolves, and that the page set is complete |

The banned list is read from one file by both, so they cannot drift. The
page set comes from one function, `tools/check_prose.py --files`, for the
same reason: a gate reading a smaller set than the other is a gate that
reports green on a page nobody checked. `npm run scan-prose` is the local
convenience and is not chained into `npm test`, which runs on platforms
without Python; the workflow is the gate.

A Google rule sitting at `warning` rather than `error` was tried at error
level first and found wrong for these pages; `.vale.ini` records what it
produced and why it was demoted.

## The structure: four kinds, enforced by placement

Every page under `docs/` is exactly one of four kinds, and the kind
decides what the page may do:

| Kind | Files | May | May not |
|---|---|---|---|
| Tutorial | `docs/tutorial.md` | teach step by step, show output for every step, defer detail with a link | argue design, list every command, assume the reader's goal |
| How-to | `docs/how-to/add-elements.md`, `docs/how-to/customise-templates.md` | solve one named task per section, assume competence, link the reference | teach basics, explain design, let a recipe drift into a second task |
| Reference | `docs/reference/cli.md`, `docs/reference/api.md` | state facts exhaustively and dryly, pin claims to tests | narrate, persuade, teach |
| Explanation | `docs/explanation/model-wiring.md` | argue, compare, admit trade-offs, tell the design's story | be the only place a fact lives |

`README.md` is a doorway and belongs to no kind: it routes, gives the
quick start, and states no fact of its own that a page below it does not
also state. `ci/README.md` and `ci/COVERAGE.md` are notes on the CI
harness for the people maintaining it, and are outside the set.

One fact appears in all four kinds at different altitudes — met in the
tutorial, used in a how-to, specified in the reference, argued in the
explanation — but the normative statement lives in the reference and
everything else links to it. The action-file convention is the example:
the tutorial meets it when `get_info.ts` answers a message, the how-to
uses it to say when to add a message, the CLI reference states it, and the
explanation argues why it is the whole design.

**Documentation never names the framework.** The four kinds come from
`Diátaxis`, and that is a fact about how these pages were planned, not
one a reader needs in order to read them. Say **tutorial**, **how-to**,
**reference** and **explanation**, which are ordinary words that describe
themselves, and let the structure do the explaining. This guide and the
contributor guides are where the name belongs, because there it answers a
question somebody is actually asking. Every page used to open with the
framework's name and its kind in italics; the kind now speaks for itself.

### The CLI reference owns the command syntax

This project has two surfaces for one set of operations: the
`voxgig-system` commands and their programmatic form under `Add` and
`Template`. The rule that falls out of it keeps the two from drifting in
the documentation the way they must not drift in the code.

**Command syntax is documented once, on the CLI reference page.** The
spec forms, the field grammar, and what `add env web` appends are stated
there. The API reference says that `Add.entity` is the programmatic form
of `add entity` and documents what differs (the folder argument, the
return value), not the grammar again. A how-to shows a command in use and
links to the reference for its syntax.

## Documentation does not cite a working document

**A documentation page never sends a reader to a plan, a to-do list, a
set of harness notes, or an agent instruction file.** Those are working
documents: written for the people changing this repository, argued rather
than stated, and stale the moment the code moves past them. A reader who
follows a link out of the documentation and lands in one has been handed
the project's notes in place of an answer.

The banned set, by name:

| Document | What it is |
|---|---|
| `AGENTS.md`, `CLAUDE.md` | instructions to contributors and agents working in the repository (`CLAUDE.md` is guarded in advance; only `AGENTS.md` exists today) |
| `NEXT.org` | the running to-do list |
| `ci/COVERAGE.md` | notes on the coverage gate, for whoever maintains the CI harness |
| any `*_PLAN.md` or `*_REVIEW.md`, and `BUILD_LOG.md` | the shapes this project has not needed yet, guarded in advance |

The ban covers the name as much as the link. "The full checklist is in
`AGENTS.md`" fails for the same reason the URL does: the reader still
cannot act on the sentence without leaving the documentation.

State the fact instead. "`dist/` is committed, so run `npm run build`
before you commit" is what a reader needs, and a link to the file that
also says so adds nothing to it. The root README used to close by sending
the reader to the agent guide; it now states the two rules that guide
carries for a contributor, the committed `dist/` and the append-only
`add` commands. Where the fact belongs in the documentation and is
missing, write it into the page that owns it rather than pointing
outside.

The rule runs one way. Working documents cite each other and cite the
documentation freely. Only the direction out of documentation is closed.

### What stays linkable, and why

| Linkable | Because |
|---|---|
| source (`system.ts`, `cmd.ts`, `lib/`, `srv/`) and the tests under `test/` | code is the thing a claim is pinned to |
| this guide | normative rather than exploratory, and it names the working documents in order to ban them |
| `.github/workflows/` | the CI definitions are what a page describes when it says what runs, and a reader can act on them |

The rule behind the split: **a specification is citable, an argument is
not.**

`tools/check_prose.py` enforces this over the reader-facing pages. Vale
does not, because Vale cannot tell a working document from a page.

## The voice

The house voice is Richard Rodger's blog register, adapted per document
kind. The portable part of that voice is its *rhythm*, not its stock
phrases. Ten habits, with the register they apply in:

1. **Open with a concrete fact or a plainly stated problem, then a short
   dry beat.** Tutorial and how-to pages. Reference pages open by stating
   what the thing is.
2. **Introduce code with a short colon-terminated sentence** —
   "Compile:", "To add a relationship, use a `ref` attribute:". Never
   "The following code snippet demonstrates". Everywhere.
3. **After a code block, point at the one interesting thing.** Do not
   recap the code. Everywhere.
4. **Parentheses carry definitions, caveats, and at most one dry aside per
   page.** Tutorial and how-to pages. In reference pages, parentheses
   carry facts only — a type, a default, a test name.
5. **A trade-off gets bolted on with a dash, and the dash earns its
   place.** One per paragraph at most, never two in a sentence.
6. **Alternate one long explanatory sentence with one short verdict
   sentence.** The short sentence is the payoff. Everywhere.
7. **Talk to the reader as "you", and route them** ("If you only want
   the command syntax, skip to the CLI reference"). "We" appears only in
   the tutorial, walking through code together. "I" appears nowhere.
8. **Show that the code is real.** No gate executes the examples on these
   pages, so a claim names the test that covers it: the `add` commands'
   append-and-merge behaviour is pinned by `test/add.test.ts`, the CLI by
   `test/cmd.test.ts`, template listing and ejection by
   `test/template.test.ts`, and the message-to-action-file wiring by
   `test/system.test.ts` and `test/runtime.test.ts`. A reference entry
   that states an edge case can name the test that pins it.
9. **Jokes are self-directed or about the industry's mundanity, and the
   register goes fully serious the moment correctness or a user's data is
   on the table.** Never joke about the reader, other tools, or what an
   `add` would do to a hand-edited model file.
10. **Close by handing the reader something**: a link, a next step, one
    sentence. No summary paragraphs that restate the page.

Exclamation marks: at most one per page, in the tutorial only, on a
genuine payoff.

## Banned phrases and patterns

These read as generated filler. Do not use them, in any document,
including commit messages that quote the docs.

**The list itself lives in
[`.vale/styles/config/vocabularies/System/reject.txt`](./.vale/styles/config/vocabularies/System/reject.txt)**,
one regular expression per line. That file is the single source of truth:
Vale reads it in CI, and `tools/check_prose.py` reads the same file rather
than keeping a second copy, so the two gates cannot disagree about what is
banned. Add a phrase there and both pick it up. What follows is a reader's
summary of it, not a second list; every phrase is shown as code so that
quoting a banned phrase in this guide does not fail the gate.

The list is upstream's, unchanged, and it draws on two sources: that
project's original house list, and [claudisms.ai](https://claudisms.ai/),
a catalogue of the patterns that mark machine-written prose. **It was
measured against these pages before it was adopted.** Nothing fired: not
one entry, on any of the 7 pages, in either gate. The list was adopted
whole, and nothing was dropped from it.

**Filler and false emphasis**: `worth noting` · `important to note` ·
`it cannot be overstated` · `at its core` · `when it comes to` ·
`let's break it down` · `here's where it gets interesting` ·
`the point is` · `because it matters`.

**Inflated vocabulary**: `delve` · `dive into` · `robust` · `seamless` ·
`comprehensive` · `holistic` · `intricate` · `leverage` · `foster` ·
`shed light on` · `pave the way` · `pivotal` · `transformative` ·
`game-changing` · `cutting-edge` · `groundbreaking` · `testament to` ·
`paradigm shift` · `realm` · `landscape of` · `underscores the` ·
`lean into` · `throughline` · `double-click on` · `mature setup`.

**Consultant register**: `north star` · `key takeaways` ·
`best practices` (name the practice instead) · `at the end of the day` ·
`pressure-test` · `right-size` · `strategic imperative` ·
`three things to know` · `dispatches from` · `best operators` ·
`lessons learned`.

**Metaphor inflation**: `load-bearing` · `heavy lifting` ·
`is doing the work` · `different physics` · `hits hardest` ·
`quietly` (say `silently`, which is the term of art for a failure that
reports nothing).

**The contrast frame and its cousins**: `not just` · `not only X but Y` ·
`it's not about` · `the whole game` · `the entire point` ·
`the only thing that matters`. Say what the thing is.

**False singularity**: `the right way/answer/tool/question` ·
`the best thing you can do` · `if I had to pick` · `what struck me` ·
`stuck with me` · `struck a chord` · `hit a nerve` ·
`we've seen this movie before`.

**Reflective pose**: `sit with` · `worth exploring/considering/asking` ·
`keeps coming back to` · `that's the tell` · `where I landed`.

**Invented observation about people**: `most people` ·
`everyone I've worked with` · `a lot of folks` · `nobody I know`. If it
did not happen, do not claim to have noticed it.

**Signposting**: `let's explore` · `now let's turn to` · `moving on to` ·
`in today's rapidly evolving` · `reflecting a broader trend` ·
`great question`.

**`honest`, and every form of it**, is banned differently from the rest.
The word is fine English; it is on the list because it had become a tic
across the repositories that share this list, where it flattered a
sentence rather than said anything the sentence did not already say. It
had not reached these pages when the list arrived.

**The gate is absolute, and the lack of an inline exemption is the
point.** There is no `allow` comment and no suppression the second gate
would honour, because an escape hatch that exists is an escape hatch that
gets used. A use the author wants kept is approved by changing
`reject.txt`: one line, in one file, visible in review, which is where an
approval belongs.

### What is not banned, and why

Several entries on claudisms.ai are deliberately absent, because they name
things this project documents. A gate that fires on the subject matter is
a gate people learn to switch off. The same standard governs
`System.WordChoice`, which carries three of Google's substitutions and
leaves the rest at warning.

| Not banned | Because |
|---|---|
| `model` | It is the thing `add` edits and `model-build` compiles: the aontu sources and the `model.json` they become. |
| `surface` | `the package's exported surface` is the API reference's opening line, and `the browser surface` is the set of messages a browser may send. |
| `shape` | Message params become Gubu shapes, and the model's `main.msg` has two shapes. The word names both. |
| `hold`, `carry` | The file system holds the action files, and `model.json` carries `main.ent.shop.product` after a build. |
| `lives` | `the normative statement lives in the reference` is this guide, one section up. |

The rule behind the list: ban the phrase that adds nothing, never the word
that names a thing.

**Matching spans a line wrap.** These pages hard-wrap, and most of the
list is multi-word, so the gate joins each paragraph before matching:
`worth\nnoting` fails exactly as `worth noting` does. Upstream records
that the day its gate started reading paragraphs it found two phrases that
had been passing since the gate was written, each saved only by where its
line happened to break.

**Patterns** (not mechanically checkable, enforced at review):

- Announcing structure before delivering it ("There are three things to
  understand").
- Restating the question before answering it.
- A closing one-liner that restates the thesis.
- Stacked short declaratives (four or more in a row).
- Superlative self-ranking ("the most important thing", "the part that
  matters most").
- A list of `**Bold term**: explanation` pairs, which is the single most
  recognisable machine-written list. Write sentences, or a table.

## Punctuation rulings

**The em dash is spaced here**: `a dash — like this`. This is the one
place where the guide contradicts both Google and jostraca, and it is the
Voxgig convention rather than drift — 23 spaced dashes across the 7 pages
when the gate was written, and not one unspaced. `Google.EmDash` is
therefore off, and `tools/check_prose.py` `em-dashes-are-spaced` enforces
the convention in the other direction: an unspaced dash fails.

Dashes stay **rationed to one aside per line**: either a single dash
before a trailing clause, or one matched pair around a parenthetical,
never both and never two asides. Three on a line is the stacking the
ration exists to stop. Prefer a comma or parentheses when the aside is
mild.

The rest:

- In a link list, separate the link from its gloss with a full stop, not a
  dash:

  ```markdown
  - [Add model elements](docs/how-to/add-elements.md). A recipe for each `add` command.
  ```

- **Every relative link must resolve, and stay inside the repository.**
  `tools/check_prose.py` checks the path, not the anchor, since a heading
  slug depends on the renderer; it reads both `[text](target)` and
  `[text][label]` with its definition. A target that resolves on a Linux
  runner but climbs out of the checkout resolves nowhere on GitHub or in a
  published package, so it fails too. Every link resolved the day the
  check was written; the one link removed, the README's pointer at the
  agent guide, was banned for where it went rather than broken.
- No emoji in documentation.
- Sentence-style capitalisation in headings (Google style), except where
  the heading names a proper noun or a code identifier: `Local vs. Live`,
  `template`.
- British spellings (`-ise`, `-isation`) for new prose. Google style is US
  English and so is the dictionary; this is one of the places the house
  voice wins, and
  [`accept.txt`](./.vale/styles/config/vocabularies/System/accept.txt)
  carries the British forms — **listed one by one**, never matched by
  suffix, because `\w+ise` accepts any word ending in those three letters
  and punches a hole straight through the spelling gate. A US spelling
  already on a page is not a defect, and a filename keeps whatever
  spelling it was created with.
- Quotation punctuation goes **outside** the quotes, against US
  convention, because putting a period inside a quoted `code span` is
  actively wrong when the quote is a literal.

## Terminology

- The project is **Voxgig System**, or **the package** in prose; the npm
  package is `@voxgig/system` and the command is `voxgig-system`. What
  `npm create @voxgig/system` makes is **a system project**, never "an
  app": the app is the thing the project generates.
- **the CLI** — `voxgig-system`, once the page has named it. Not "the
  tool", and not "the command-line tool", which Google's word list wants
  and `.vale.ini` leaves at warning for that reason.
- **model** — the aontu sources under `model/*.aontu` and the
  `model.json` that `npm run model-build` compiles from them. **Model
  wiring** is what `MakeSrv` does with it at boot: connect each declared
  message to its action file. Say **declares** for the model and
  **implements** for the file system; the model never "contains code".
- **element** — anything an `add` command puts into the model: an
  **entity**, a **service**, a **message**, a **field**, an
  **environment**. Say the full word in prose and the short form (`srv`,
  `msg`, `env`) only as the command or the model key.
- **message** and **pattern** — a message is declared by its pattern
  pairs (`aim:product,get:info`), and it **answers**; its **action file**
  is named after the last pair (`get_info.ts`). Not "handler", not
  "route", not "endpoint".
- **append** and **unify** — the `add` commands append jsonic, and aontu
  unifies the sources. Never "rewrite" or "overwrite", which are the
  things they do not do; "merge" is acceptable for what unification
  produces.
- **template**, **fragment**, **generator** — a template resolves in
  layers; the text-level piece you **eject** is a fragment, the code-level
  piece is a generator. Ejecting is the verb, not "copying out" or
  "overriding".
- **aontu** and **jostraca** — the unification engine behind the model
  and the text-template engine behind the fragments. Lowercase, as their
  packages are, and named only where the mechanism matters to the reader.
- **Local** and **Live** — the two assemblies of the same services, one
  process and a deployed topology. Not "dev" and "prod", which are
  stages an environment declares.
- **the browser surface** — the `aim:web` messages, the only messages a
  browser may send. A new browser operation is a new proxy message, never
  a wider gateway allow-list.

## Templates, kind by kind

**Tutorial** (`docs/tutorial.md`): goal sentence → snippet → output → the
one observation → forward link. Every step's output shown.

**How-to** (`docs/how-to/`): the title is the task in imperative or "-ing"
form; one sentence of situation; the recipe; one paragraph of what to
watch for; a link to the reference for the constructs.

**Reference** (`docs/reference/`): definition, then behaviour, then edge
cases, then a pinned example. Every claim that has a test can name it.

**Explanation** (`docs/explanation/`): the question, the answer, the
argument, the trade-off admitted. May quote history when the history is
the argument.

## Updating this guide

Change it the way behaviour changes: in the same commit as the first page
that follows the new rule, with the reasoning in the commit message.

To ban a phrase, add the regular expression to
[`reject.txt`](./.vale/styles/config/vocabularies/System/reject.txt) and
summarise it in the preceding list. Both gates pick it up from that one
file; there is no second list to update, and `tools/check_prose.py` names
this file, so a drift is a build failure with a pointer.

To change a Google rule's level, edit [`.vale.ini`](./.vale.ini) and write
down what the rule produced on a clean run. "It was noisy" is not a
reason; "it wants `command-line tool` for CLI, on pages about a
command-line tool whose own name is a CLI — 9 hits" is. A rule demoted
without that note reads later as an oversight, and gets re-promoted by
someone repeating the work.

To widen what the gates read, change the configuration block at the top
of `tools/check_prose.py`. Both gates take their file set from it, so
widening it once widens both — and a page added to the repository without
being added there is a page neither gate has ever read.
