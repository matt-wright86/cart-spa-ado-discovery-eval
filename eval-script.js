/**
 * Custom evaluation functions for the ADO Story Discovery prompt.
 * Called from promptfooconfig.yaml via: file://eval-script.js:functionName
 *
 * Each function receives the LLM output string and returns { pass, score, reason }.
 */

const REQUIRED_SECTIONS = [
  'TL;DR',
  'Affected Repos',
  'Acceptance Criteria',
  'Blockers',
  'Affected Files',
  'Open Questions',
  'Implementation Plan',
];

/** All required investigation sections are present (order-independent, heading-tolerant). */
function hasRequiredSections(output) {
  const text = output.toLowerCase();
  const missing = REQUIRED_SECTIONS.filter((s) => !text.includes(s.toLowerCase()));
  const pass = missing.length === 0;
  return {
    pass,
    score: (REQUIRED_SECTIONS.length - missing.length) / REQUIRED_SECTIONS.length,
    reason: pass ? 'All required sections present' : `Missing sections: ${missing.join(', ')}`,
  };
}

/** Cites concrete source files (so the plan is grounded, not hand-wavy). */
function citesFiles(output) {
  const fileRefs = output.match(/[\w./-]+\.(tsx?|ts|js|java|yaml|yml)\b/gi) || [];
  const unique = [...new Set(fileRefs.map((f) => f.toLowerCase()))];
  const pass = unique.length >= 2;
  return {
    pass,
    score: pass ? 1 : unique.length / 2,
    reason: pass
      ? `Cites ${unique.length} file(s): ${unique.slice(0, 4).join(', ')}`
      : `Too few concrete file references (${unique.length}); investigations should ground the plan in real files`,
  };
}

/** Explicitly distinguishes buildable-now work from blocked work — the core value of the prompt. */
function separatesBuildableFromBlocked(output) {
  const text = output.toLowerCase();
  const buildable = /buildable now|buildable|can (?:be )?(?:built|start|proceed)|unblocked|build (?:this|it) now/.test(text);
  const blocked = /\bblocked\b|\bblocker\b|not yet (?:built|available)|does not exist|missing endpoint/.test(text);
  const pass = buildable && blocked;
  return {
    pass,
    score: pass ? 1 : (buildable ? 0.5 : 0) + (blocked ? 0.5 : 0),
    reason: pass
      ? 'Distinguishes buildable-now from blocked work'
      : `Missing the buildable-vs-blocked distinction (buildable=${buildable}, blocked=${blocked})`,
  };
}

/** Has an ordered, actionable implementation plan (numbered steps). */
function hasActionablePlan(output) {
  const numbered = (output.match(/^\s*\d+[.)]\s+\S/gm) || []).length;
  const pass = numbered >= 2;
  return {
    pass,
    score: pass ? 1 : numbered / 2,
    reason: pass ? `Plan has ${numbered} ordered steps` : `Plan is not actionable (${numbered} numbered steps found)`,
  };
}

// ---- PR-review prompt assertions (pr-review-prompt.md) ----

const REVIEW_SECTIONS = ['Summary', 'Blocking Issues', 'Non-blocking Suggestions', 'Test Coverage', 'Verdict'];

/** All required PR-review sections are present. */
function hasReviewSections(output) {
  const text = output.toLowerCase();
  const missing = REVIEW_SECTIONS.filter((s) => !text.includes(s.toLowerCase()));
  const pass = missing.length === 0;
  return {
    pass,
    score: (REVIEW_SECTIONS.length - missing.length) / REVIEW_SECTIONS.length,
    reason: pass ? 'All review sections present' : `Missing sections: ${missing.join(', ')}`,
  };
}

/** Ends with a clear, decisive verdict. */
function hasReviewVerdict(output) {
  const pass = /\b(approve with nits|request changes|approve)\b/i.test(output);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? 'Contains an explicit verdict' : 'No explicit Approve / Approve with nits / Request changes verdict',
  };
}

module.exports = {
  hasRequiredSections,
  citesFiles,
  separatesBuildableFromBlocked,
  hasActionablePlan,
  hasReviewSections,
  hasReviewVerdict,
};
