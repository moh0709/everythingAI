# EAI-TASK-037: Create Hermes Operating Manual RC1 and verify autonomous task pickup

## Final status

SUBMITTED_FOR_PM_REVIEW

## Issue

- GitHub issue: #59
- Task ID: EAI-TASK-037
- Maintenance executor: Forge
- Starting SHA for this refresh: `1d4cafc5828edcbe68df89a3e6f21b4f623073b4`

## Summary

The current repository state now satisfies the original Hermes Operating Manual RC1 scope and the later PM corrective directive on issue #59. The manual exists at `docs/HERMES_OPERATING_MANUAL_RC1.md`, is reconciled against the present `docs/ENGINEERINGOS_RC1.md`, and includes the required **Trigger and Event Input Contract** section.

This refresh did not modify product runtime behavior. It updates the #59 evidence artifacts to point PM review at the already-committed corrective runtime contract and tests.

## Files changed by this refresh

- `REPORTS/EAI-TASK-037-HERMES-OPERATING-MANUAL-RC1.md`
- `docs/HANDOVER_2026-07-14_EAI_TASK_037.json`
- `LOGS/EAI-TASK-037-terminal.log`
- `.hermes/state.json`

## Current implementation evidence

- `docs/HERMES_OPERATING_MANUAL_RC1.md` contains **Trigger and Event Input Contract**.
- `scripts/webhook-event-dispatcher.mjs` implements webhook payload precedence: `GITHUB_EVENT_PATH`, `--event-path <file>`, then explicit `--stdin-json`.
- `scripts/webhook-event-dispatcher.mjs` returns `BLOCKED_RUNTIME_CONTRACT`, `IGNORED_EVENT`, `IGNORED_INELIGIBLE`, `INVALID_EVENT_PAYLOAD`, `CLAIM_CONFLICT`, `UNKNOWN_RUNTIME_MODE`, and `EXECUTE`.
- `scripts/task-poller.mjs` keeps polling as the primary queue path via `node scripts/task-poller.mjs --mode polling --watch`.
- `tests/webhook-event-dispatcher.test.mjs` records negative coverage for missing payload, malformed payload, non-issues event, ineligible issue labels, unknown runtime mode, and duplicate webhook delivery.
- `tests/task-poller-watch-loop.test.mjs` records queue-return coverage after a poll cycle.

## Claim and chronology evidence

- Original automatic claim comment was posted on issue #59 at `2026-07-14T15:02:10Z`.
- Claim comment records task ID `EAI-TASK-037`, starting commit `fe279fa751e97c7484d98493748041a3d060a8c8`, and planned deliverables.
- The original completion comment was posted at `2026-07-14T15:17:41Z`, after the claim comment.
- PM review at `2026-07-14T15:34:14Z` rejected the first submission and required the trigger/event contract correction.
- Corrective repository commits now present in history:
  - `a4df9b9302b28b5ff82ef94a77aa0472907457d2` (`docs: correct hermes trigger contract rc1`)
  - `3d2d1c13c0f40af49e80ba605264ac5af44fe9c3` (`fix(runtime): separate polling and webhook entry paths`)

## Acceptance matrix

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| AC-01 | Manual defines mission, authority, and boundaries | `docs/HERMES_OPERATING_MANUAL_RC1.md` sections `Mission and authority`, `Interaction rules` | PASS |
| AC-02 | Startup and initialization | `Startup and initialization` with polling and webhook examples | PASS |
| AC-03 | Task discovery eligibility rules | `Task discovery eligibility rules` | PASS |
| AC-04 | Atomic task claiming and duplicate prevention | `Atomic claim, local lock, and duplicate prevention`; `src/task-claim.js` | PASS |
| AC-05 | Claim acknowledgement and notification | Issue #59 claim comment dated `2026-07-14T15:02:10Z` | PASS |
| AC-06 | Execution lifecycle | `Execution lifecycle` | PASS |
| AC-07 | Required task state transitions and labels | `Required task-state transitions` | PASS |
| AC-08 | Validation and quality gates | `Validation and quality gates`; this report validation section | PASS |
| AC-09 | Git branch, commit, and safety rules | `Branch, commit, and push safety` | PASS |
| AC-10 | Failure handling, retries, rollback, escalation | `Failure handling and escalation`; `Known gaps` retry and lock guidance | PASS |
| AC-11 | Logs, reports, handover artifacts, evidence | This report, handover JSON, and terminal log | PASS |
| AC-12 | Completion reporting and PM handoff | Final issue comment and labels submitted by Forge refresh | PENDING LIVE VERIFICATION |
| AC-13 | Automatic return to queue | `tests/task-poller-watch-loop.test.mjs` | PASS |
| AC-14 | Interaction rules for CEO, PM, Hermes, future agents | `Interaction rules` | PASS |
| AC-15 | Known gaps documented honestly | `Known gaps between target behavior and the current worker` | PASS |
| AC-16 | Trigger and event input contract | `Trigger and Event Input Contract`; `scripts/webhook-event-dispatcher.mjs` | PASS |
| AC-17 | Negative webhook event test | `tests/webhook-event-dispatcher.test.mjs` | PASS |

## Validation

Fresh validation for this refresh:

- `git pull --ff-only` - PASS
- `node scripts/framework-doctor.mjs` - PASS
- `node --test tests/webhook-event-dispatcher.test.mjs tests/task-poller-watch-loop.test.mjs tests/task-poller-runtime-mode.test.mjs tests/task-worker-runtime-mode.test.mjs` - PASS
- `npm test` - PASS
- `git diff --check -- .hermes/state.json REPORTS/EAI-TASK-037-HERMES-OPERATING-MANUAL-RC1.md docs/HANDOVER_2026-07-14_EAI_TASK_037.json LOGS/EAI-TASK-037-terminal.log` - PASS
- `python -m json.tool docs/HANDOVER_2026-07-14_EAI_TASK_037.json` - PASS
- `gh issue view 59 --json number,title,state,labels,comments,url` - PASS

## Safety notes

- No secrets or credentials were recorded.
- No production integrations were enabled.
- No product runtime behavior was changed in this refresh.
- Unrelated local changes were preserved and excluded from the commit:
  - `LOGS/EAI-TASK-046-terminal.log`
  - `tests/task-worker-runtime-mode.test.mjs`
  - `apps/everything-ai-ui/src/planning.css`
  - `docs/AUTONOMOUS_FORGE_PM_RETEST_2026-07-29.json`

## Commit metadata

- Original manual commit SHA: `2d5cbef9dfe5e51ad65919a9576c923a719ea023`
- Corrective trigger-contract commit SHA: `a4df9b9302b28b5ff82ef94a77aa0472907457d2`
- Runtime separation corrective commit SHA: `3d2d1c13c0f40af49e80ba605264ac5af44fe9c3`
- Forge artifact refresh commit SHA: `PENDING_ARTIFACT_COMMIT`
- Final pushed SHA: `PENDING_FINAL_PUSH`

## Next recommended step

PM review of issue #59 using the refreshed evidence, without treating it as PM accepted until review is explicit.
