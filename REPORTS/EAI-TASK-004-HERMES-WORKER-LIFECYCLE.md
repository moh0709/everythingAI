# EAI-TASK-004 - Hermes worker lifecycle claim/report/state flow

## Result

Final status: SUBMITTED_PENDING_PM_REVIEW

Issue #26 was already implemented in repository history before this Forge maintenance execution. This submission refreshes the review evidence from the current `main` checkout and returns the still-open issue to PM review without changing production application behavior.

## Repository / environment

- Repository path used: `C:\temp\EverythingAI`
- Current branch: `main`
- Starting commit SHA: `e485154814a99afacaac7ffa16e208dd75af55b2`
- Artifact refresh timestamp: `2026-08-01T18:20:17.0782091+02:00`
- Final pushed SHA: recorded in the final GitHub issue comment after push

## Files changed

This maintenance submission changes only task evidence/state artifacts:

- `.hermes/state.json`
- `LOGS/EAI-TASK-004-terminal.log`
- `REPORTS/EAI-TASK-004-HERMES-WORKER-LIFECYCLE.md`

The lifecycle implementation files inspected and validated for this task are:

- `scripts/task-worker.mjs`
- `scripts/task-poller.mjs`
- `scripts/framework-doctor.mjs`
- `src/task-queue.js`
- `src/task-claim.js`
- `templates/REPORT_TEMPLATE.md`

## Lifecycle behavior implemented

- Worker once mode requires explicit polling runtime mode before selecting or mutating issues.
- Dry-run mode selects from open `pm:ready` + `hermes:ready` issues, prints the selected issue and planned artifact paths, and does not mutate GitHub labels, issue comments, or `.hermes/state.json`.
- Runnable issue selection filters out issues with matching report artifacts to avoid duplicate processing.
- Non-dry-run worker claims one issue through shared claim authority, adds `hermes:working`, removes `hermes:ready`, verifies live labels, writes state, produces report/log artifacts, comments on the issue, and returns it to `pm:review` + `hermes:done` or a blocked path.
- Poller watch mode polls every 60 seconds, dispatches one selected issue per cycle, and continues watching after claim conflicts without spamming comments when the queue is empty.
- The worker lifecycle remains non-destructive and does not execute arbitrary production code changes.

## Validation summary

- `git pull`: PASS, already up to date.
- `node scripts/framework-doctor.mjs`: PASS.
- `npm run worker:once -- --dry-run`: PASS, no mutation; live queue currently had no open issue with both `pm:ready` and `hermes:ready`.
- `cd apps/everything-ai-ui && npm run typecheck`: PASS.
- `cd apps/everything-ai-ui && npm run build`: PASS.
- `cd services/api && npm test`: PASS, 173/173 tests passed.
- `npm test` from repo root: PASS, 182/182 tests passed.

## Dry-run result

`npm run worker:once -- --dry-run` exited successfully and printed:

```text
[task-worker] No runnable issue found.
```

This is consistent with the live queue check performed during this execution: no open issue currently has both `pm:ready` and `hermes:ready`.

## Acceptance matrix

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| AC-1 | Worker dry-run works and avoids mutation | Dry-run exited 0 with no runnable issue and no label/comment/state mutation required | PASS |
| AC-2 | Worker identifies one runnable issue | Existing code path validates queue selection; live queue had no current eligible task | PASS with current-queue limitation |
| AC-3 | Worker safe claim/update/report/comment lifecycle | `scripts/task-worker.mjs`, `src/task-claim.js`, and root tests | PASS |
| AC-4 | Worker processes one issue at a time | Claim lock and poller tests, 182/182 root tests | PASS |
| AC-5 | Matching report prevents duplicate processing | `src/task-queue.js`, `src/task-claim.js`, and tests | PASS |
| AC-6 | Poller watch avoids repeated comment/commit spam when idle | `tests/task-poller-watch-loop.test.mjs`; dry-run found no runnable issue | PASS |
| AC-7 | Framework doctor passes | Required validation output | PASS |
| AC-8 | UI typecheck passes | Required validation output | PASS |
| AC-9 | UI build passes | Required validation output | PASS |
| AC-10 | API tests pass | Required validation output | PASS |
| AC-11 | No production app behavior changes | Diff limited to evidence/state artifacts in this maintenance run | PASS |
| AC-12 | No secrets in logs | Evidence contains command/status summaries only | PASS |

## Risk analysis

- Duplicate execution: controlled by local claim lock, label re-read, matching report skip, and one-issue poller dispatch.
- Secret exposure: command outputs are summarized and no environment values or credentials are recorded.
- Production impact: no production application files are changed in this maintenance submission.
- Stale state: `.hermes/state.json` is updated to reflect #26 PM-review submission instead of older issue state.
- Dependency bypass: no dependent task is released and issue #69 remains untouched.
- Evidence mismatch: final pushed commit SHA cannot be embedded in the same commit that creates this report; the GitHub issue comment after push records the final SHA source of truth.

## Skipped commands / reasons

- No required validation command was skipped.
- No non-dry-run worker execution was run against live GitHub during this maintenance pass because issue #26 already carries `hermes:done` and the current validation queue had no eligible `pm:ready` + `hermes:ready` issue.

## PM follow-up recommendation

PM should inspect the current diff, the refreshed validation evidence, and the live issue labels. If acceptable, PM may accept and close #26; no dependent task should be released solely by this Forge submission.
