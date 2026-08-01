# EAI-TASK-051: Forge PM Review Eligibility

## Summary

Issue #99 fixed the Forge scheduler so released queue discovery and live claim revalidation share one Forge eligibility classifier and never claim issues already handed to PM review.

Changed files:

- `src/agent-queue-policy.js`
- `src/forge-trigger.js`
- `scripts/forge-trigger.mjs`
- `tests/forge-trigger.test.mjs`

## Acceptance Matrix

| ID | Requirement | Implementation | Validation | Status |
|---|---|---|---|---|
| AC-1 | Exclude `forge:done` + `pm:review` from eligibility. | `classifyForgeQueueIssue` returns `awaiting_pm_review`. | `Forge eligibility skips PM-review submissions even if ready labels remain`; explicit classifier output `#4 skipped awaiting_pm_review`. | PASS |
| AC-2 | Exclude `forge:blocked` + `pm:review` from eligibility. | `classifyForgeQueueIssue` returns `awaiting_pm_review`. | `Forge eligibility skips PM-review submissions even if ready labels remain`; explicit classifier output `#5 skipped awaiting_pm_review`. | PASS |
| AC-3 | Centralize eligibility logic in one function. | `src/agent-queue-policy.js` exports `classifyForgeQueueIssue`; `isForgeEligibleForQueue`, `isForgeEligible`, claim revalidation, and poller selection use it. | Full test suite. | PASS |
| AC-4 | Log skip reason for every skipped issue. | Released poller evidence now includes `released_summary=processed:<issue> skipped:<issue>:<reason>` and `released_skip_reasons=...`; maintenance summaries are preserved. | `released poller reports PM-review skip reasons before claiming eligible issue`. | PASS |
| AC-5 | Regression tests prove #4/#5-style issues are skipped. | Added released-queue tests with ready labels still present on terminal PM-review submissions. | Focused and full tests. | PASS |
| AC-6 | Include validation output showing why each issue was eligible or skipped. | Report records explicit classifier output below. | Classifier fixture output. | PASS |

## Validation Evidence

Red test:

```text
node --test tests/forge-trigger.test.mjs
not ok 10 - released poller reports PM-review skip reasons before claiming eligible issue
Expected values to be strictly equal:
801 !== 803
```

Green and final validation:

```text
node --test tests/forge-trigger.test.mjs
1..23
# tests 23
# pass 23
# fail 0
```

```text
npm run framework:doctor
"status": "PASS"
```

```text
node --test tests/*.test.mjs
1..182
# tests 182
# pass 182
# fail 0
```

```text
npm test
1..182
# tests 182
# pass 182
# fail 0
```

Explicit eligibility output:

```text
#4 skipped awaiting_pm_review
#5 skipped awaiting_pm_review
#99 eligible released_queue
#100 skipped missing_forge_ready
```

## Risk Review

- Duplicate execution: reduced by excluding PM-review terminal submissions from released queue selection and live revalidation.
- Stale labels: handled by running the classifier before mutation and again inside `claimForgeIssue`.
- Secret exposure: no secrets or environment values added to source, tests, report, or handover.
- Destructive Git operations: none used.
- Production impact: repository-only scheduler logic and tests; no host or deployment mutation performed.

## PM Review

Submit issue #99 with `forge:done` + `pm:review` after the focused commit is pushed and live labels are verified. Do not close or self-accept the issue.
