# Changelog — eval history

Eval runs use the Claude Code CLI provider via `claude.js` (responses: `haiku`; `llm-rubric`
grading: `sonnet`), invoked with `npx promptfoo eval --no-cache`. Result snapshots live in
[`results/`](results/).

## ADO Story Discovery — `buildable-vs-blocked` reliability

| Stage | Prompt commit | Test 1 (partially-blocked) pass rate | Full suite |
|-------|---------------|--------------------------------------|------------|
| Baseline | `7cf73a7` | **75%** (3/4 local runs; evaluator also measured 75%) | flaky |
| After fix | `c1ea026` | **100%** (6/6 runs) | 4/4 every run |

**Delta: Test 1 pass rate 75% → 100% at commit `c1ea026`.**

### Root cause (baseline `7cf73a7`)

The `buildable-vs-blocked` `llm-rubric` on the partially-blocked scenario failed intermittently.
Reading the grader output across runs showed two recurring causes:

- Phase 1 of the implementation plan was framed as "Verify / Confirm / Ensure" (audit work) rather
  than concrete implementation tasks, and omitted tests.
- The model sometimes went *thin* — deferring nearly all frontend work to the blocker instead of
  building against the expected contract.

Artifact: [`results/baseline.json`](results/baseline.json)

### Fix (commit `c1ea026`)

Hardened `prompt-under-test.md`:

1. Phase 1 tasks must begin with an implementation verb (Add / Implement / Write / Refactor / Wire /
   Create / Update) and must include at least one test task; "Verify / Confirm / Ensure / Review /
   Audit" are disallowed as Phase 1 work.
2. Added a **build-to-the-contract** rule: when blocked on a missing endpoint, implement the frontend
   against the *expected* contract now; reserve only end-to-end wiring/verification for Phase 2.

Re-measured over 6 runs: Test 1 passed 100% (full suite 4/4 every run).
Artifact: [`results/after-fix.json`](results/after-fix.json)

## PR Review template (commit `8d29b18`)

Added a second reusable prompt template, `pr-review-prompt.md`, with its own eval config
(`promptfooconfig.pr-review.yaml`) and two scenarios: a buggy PR that must be blocked (a stale-closure
`useEffect` dependency bug plus a missing test) and a trivial, tested PR that must be approved without
inventing blockers.

While building it, the eval caught the review **over-escalating a minor test nit to "Request changes"**
on the trivial PR. Calibrated the prompt so test-strength and style nits stay non-blocking. Stable at
2/2 across 4 runs.

Artifact: [`results/pr-review.json`](results/pr-review.json)
