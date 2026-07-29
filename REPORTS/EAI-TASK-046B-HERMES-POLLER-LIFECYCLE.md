# EAI-TASK-046B: Authorized Hermes Poller Lifecycle

Issue: #87
Status: PASS - submitted for PM review
Date: 2026-07-29
Starting SHA: 8591949152242beba1ce242f5cdbf10037228cfa

## Summary

Forge restored the authorized Hermes polling path for `pm:ready + hermes:ready` issues and proved a clean disposable lifecycle with fresh fixture #89. The fix is intentionally narrow: Hermes claim readiness now re-reads live GitHub state when the poller passes a partial issue object that does not contain readiness fields such as `state`.

## Root Cause

#86 was not discovered during the prior bounded window because no active Hermes poller process was present. Process inspection before restoration showed only the Forge trigger and MCP server Node processes, with no `task-poller.mjs` or `task-worker.mjs` Hermes process.

During this task, a first restored poller did discover fresh fixture #88, but the worker rejected it with `NOT_RUNNABLE` and `issue state=unknown`. The poller selected issues from `gh issue list`, whose objects do not include full readiness state. `src/task-claim.js` treated that partial object as authoritative and failed closed before re-reading the issue. #88 was removed from the runnable queue and closed as a retired failed fixture.

## Implementation

- `src/task-claim.js`: added a readiness-field completeness check and live GitHub re-read for partial issue objects before evaluating Hermes claim eligibility.
- `tests/task-worker-runtime-mode.test.mjs`: added a regression covering poller-selected partial issues through the real worker claim path.

The Atlas delegation fence from 8591949152242beba1ce242f5cdbf10037228cfa remains intact. Focused queue-policy tests still verify that Hermes cannot claim Forge or Atlas work and that Atlas requires explicit PM-approved delegation.

## Runtime Evidence

- Initial process inspection: no Hermes `task-poller.mjs` or `task-worker.mjs` process; only `scripts\forge-trigger.mjs` and MCP server Node processes were present.
- Failed restoration probe: poller PID 836 discovered #88 and dispatched a worker, which returned `NOT_RUNNABLE` with `issue state=unknown`; #88 was retired and closed.
- Corrected poller: PID 19940, command `node scripts/task-poller.mjs --mode polling --watch`, started from `C:\temp\EverythingAI`.
- Corrected poller first cycle: `No runnable issues found.`
- Clean disposable fixture: #89, `DISPOSABLE-DRILL-087-CLEAN-NOOP-20260729T104752Z`.
- Claim comment: 2026-07-29T08:48:45Z, status `CLAIMED`, worker lock PID 21752, hostname `DESKTOP-GB3N7NM`, label mutation `hermes:ready -> hermes:working`.
- Completion comment: 2026-07-29T08:48:46Z, status `PASS`, claim `hermes:working -> hermes:done`.
- Final fixture labels before close: `pm:ready + hermes:done + pm:review`; no `hermes:ready` or `hermes:working`.
- Queue return: live `pm:ready + hermes:ready` query returned `[]`.
- No duplicate evidence: #89 has exactly one `CLAIMED` comment and one `PASS` comment; local `.hermes\claim.lock` was absent after completion.
- Poller cleanup: PID 19940 was stopped after evidence collection; process recheck showed no `task-poller.mjs` or `task-worker.mjs` process remaining.
- Disposable closure: #89 was closed at 2026-07-29T08:49:38Z after PM-verifiable claim/completion evidence existed.

## Acceptance Matrix

| Criterion | Evidence | Status |
|---|---|---|
| Identify why #86 was not discovered | No active Hermes poller in process evidence; #86 had zero comments during prior window | PASS |
| Restore exactly one authorized poller | One bounded `task-poller.mjs --mode polling --watch` process, PID 19940 | PASS |
| Restrict worker to `pm:ready + hermes:ready` | `isHermesEligibleForQueue`; focused queue-policy tests 19/19 and full suite 164/164 | PASS |
| Prevent Forge/Atlas claims | Shared queue policy and Atlas fence regression remained green | PASS |
| No stale/duplicate ownership | `.hermes\claim.lock` absent; no poller/worker process after cleanup; #89 one claim and one pass | PASS |
| Fresh disposable issue | #89 created and used; #86 not reused; #88 retired after failed probe | PASS |
| Prove unattended lifecycle | Poller log shows discovery and dispatch with no issue-number worker invocation | PASS |
| Queue return | GitHub queue query for `pm:ready + hermes:ready` returned `[]` | PASS |
| Close fixture only after evidence | #89 closed after claim, completion, queue, and lock evidence existed | PASS |
| Do not modify/release #69 | No #69 mutation performed | PASS |

## Validation

- `npm run framework:doctor`: PASS.
- `node --test tests/agent-queue-policy.test.mjs tests/task-claim.test.mjs tests/task-poller-runtime-mode.test.mjs tests/task-worker-runtime-mode.test.mjs`: PASS, 19/19.
- `node --test tests/*.test.mjs`: PASS, 164/164.
- `npm test`: PASS, 164/164.
- `node scripts/hermes-health.mjs --json`: valid redacted JSON; exit 1 with local `UNKNOWN` because this Windows checkout has no active heartbeat/history tree after bounded poller cleanup.
- Health/history automated coverage in `tests/hermes-health.test.mjs`: included in full suite, PASS.
- `git diff --check`: PASS, exit 0 with line-ending warnings only.
- JSON validation for new handover/state/context artifacts: PASS.

## Limitations

The restored poller used the repository polling runtime from this Codex workspace for a bounded lifecycle proof. It does not satisfy the still-blocked Phase 3 systemd host deployment gate for #68/#76, and #69 remains unreleased.
