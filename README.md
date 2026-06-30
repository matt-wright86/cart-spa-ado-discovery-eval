# ADO Story Discovery — Prompt & Evaluation Suite

A production prompt I use **multiple times a day** on a **cart SPA** team, with a full
[promptfoo](https://promptfoo.dev) evaluation suite, developed using Evaluation Driven Development (EDD).

## Purpose

This prompt turns an **Azure DevOps (ADO) work item** — a user story or a bug — into a
**structured engineering investigation** before any code is written. Given the work item
(title, type, acceptance criteria) and codebase findings gathered from the relevant repos, it
produces a consistent Markdown document with:

- **TL;DR** — what already exists, the real gap, and whether the story is buildable now, partially blocked, or fully blocked
- **Affected Repos** — the specific repo(s) the work lives in, mapped from the symptom
- **Acceptance Criteria** — each AC labeled *Buildable now*, *Blocked*, or *Needs clarification*
- **Blockers** — the precise missing dependency (an API field/endpoint, an upstream story, a design gap)
- **Affected Files** — concrete files to change, grounded in the findings
- **Open Questions** — what UX, API, or the PO must clarify
- **Implementation Plan** — phased so unblocked work can start immediately

## The problem it solves

On a multi-repo commerce platform (the cart SPA, two shared UI component libraries, the Java Cart API,
a headless CMS, several upstream services), the expensive failure mode is **starting a story and
discovering halfway through that it's blocked on a backend endpoint that doesn't exist yet** — or
burning a sprint on a ticket whose acceptance criteria were ambiguous from the start.

This prompt front-loads that risk. Its single most important job is to **separate what can be built
now from what is blocked**, name the exact blocker and the contract the frontend needs, and surface
the open questions early. The output drops straight into `web-cart-spa/docs/<story>/investigation.md`
and drives sprint planning and the work itself.

## How often I run it

**Multiple times daily** — on essentially every story or bug I pick up, and again when re-checking a
blocked story to see whether its backend dependency has landed.

## Why it needs evaluations

The output is only useful if it's *reliable*: it must consistently produce the full structure, ground
its claims in the actual findings (never fabricate files or API contracts), and — above all — get the
**buildable-vs-blocked** call right. The eval suite below is the regression net that keeps the prompt
honest as I tune it.

## Evaluation suite

`promptfooconfig.yaml` runs the prompt against four representative scenarios, using all three EDD
evaluation types:

| Scenario | What it guards against | Eval types |
|---|---|---|
| **Partially blocked** (ship-mode persistence) | Missing the backend-endpoint blocker; failing to split buildable-now from blocked work | `contains`, `llm-rubric` ×3, `javascript` ×4 |
| **Fully buildable** (styling/token change) | *Inventing* a backend blocker that doesn't exist | `contains`, `llm-rubric` ×2, `javascript` ×2 |
| **Needs clarification** (unspecified fallback UX) | Failing to surface a design gap as an open question | `contains`, `llm-rubric`, `javascript` ×2 |
| **Bug** (code-vs-sequence mismatch) | Failing to pinpoint the root-cause location and scope | `contains`, `llm-rubric`, `javascript` ×2 |

Custom script assertions live in `eval-script.js`:

| Function | Checks |
|---|---|
| `hasRequiredSections` | All seven investigation sections are present |
| `citesFiles` | Plan is grounded in concrete source files (≥2 references) |
| `separatesBuildableFromBlocked` | Output explicitly distinguishes buildable-now from blocked work |
| `hasActionablePlan` | Implementation plan has ordered, numbered steps |

## Running it

```bash
npx promptfoo eval --no-cache                                  # ADO Story Discovery suite
npx promptfoo eval -c promptfooconfig.pr-review.yaml --no-cache # PR Review suite
npx promptfoo view        # interactive results UI
```

Always use `--no-cache`: the provider script (`claude.js`) and the prompt (`prompt-under-test.md`)
are external files, and promptfoo's cache key doesn't track changes inside them.

### Provider / grader

Both the response provider and the rubric grader run through the **Claude Code CLI** via `claude.js`
(provider mode uses `haiku`; the rubric grader uses `sonnet` for reliable JSON scoring). See
[`docs/install-claude.md`](docs/install-claude.md) to install and authenticate the CLI.

> **Auth note:** if your `claude` login lives in a non-default `CLAUDE_CONFIG_DIR`, export it before
> running, or the spawned `claude` falls back to `~/.claude` and the eval fails with
> `401 Invalid authentication credentials`:
> ```bash
> CLAUDE_CONFIG_DIR="$HOME/.claude-personal" npx promptfoo eval --no-cache
> ```

## Eval history (EDD in practice)

This prompt was iterated using its own eval suite. Full detail in [`CHANGELOG.md`](CHANGELOG.md); snapshots in [`results/`](results/).

| Stage | Prompt commit | Test 1 (partially-blocked) pass rate |
|---|---|---|
| Baseline | `7cf73a7` | **75%** (flaky on the `buildable-vs-blocked` rubric) |
| After fix | `c1ea026` | **100%** (6/6 runs) |

The eval caught that the prompt framed buildable-now work as "review/audit" and went thin on partially-blocked stories. The fix (require implementation-verb Phase 1 tasks + a test task, and a "build to the contract" rule) took Test 1 from **75% → 100%**.

## Files

```
.
├── promptfooconfig.yaml            # ADO Story Discovery eval: 4 scenarios
├── prompt-under-test.md            # the ADO Story Discovery prompt
├── promptfooconfig.pr-review.yaml  # PR Review eval: 2 scenarios
├── pr-review-prompt.md             # the PR Review prompt (2nd template)
├── eval-script.js                  # custom JavaScript assertions
├── claude.js                       # Claude Code CLI provider + grader (auto-detects mode)
├── results/                        # committed before/after eval snapshots
├── CHANGELOG.md                    # eval history + measured deltas
├── docs/install-claude.md          # CLI install + auth notes
└── README.md
```
