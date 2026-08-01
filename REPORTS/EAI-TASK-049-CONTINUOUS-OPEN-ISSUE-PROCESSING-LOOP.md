# EAI-TASK-049 Continuous Open-Issue Processing Loop

## Summary

Issue #96 adds a maintenance fall-through to the Forge trigger. Released work with `pm:ready + forge:ready` remains first priority. When that queue is empty, Forge now selects one unowned open issue by the requested maintenance priority order, claims it with `forge:working`, and uses the same bounded Codex execution contract. Protected issue #69 is excluded.

## Acceptance Matrix

| ID | Requirement | Implementation | Validation | Status |
|---|---|---|---|---|
| A1 | Continue after feature work is exhausted | `scripts/forge-trigger.mjs` falls through from released queue to maintenance selector | `tests/forge-trigger-cli.test.mjs` | PASS |
| A2 | Prioritize `forge:done + pm:review` | `selectForgeMaintenanceIssue` rank 1 | `tests/forge-trigger.test.mjs` | PASS |
| A3 | Prioritize `forge:blocked + pm:review` second | `selectForgeMaintenanceIssue` rank 2 | `tests/forge-trigger.test.mjs` | PASS |
| A4 | Include older inactive open issues | `selectForgeMaintenanceIssue` rank 3 after seven inactive days | `tests/forge-trigger-cli.test.mjs` | PASS |
| A5 | Include governance or administrative backlog | `selectForgeMaintenanceIssue` rank 4 | Code inspection and docs | PASS |
| A6 | Claim each maintenance issue | `claimForgeMaintenanceIssue` writes `forge:working` and verifies live labels | `tests/forge-trigger.test.mjs` | PASS |
| A7 | Return to PM review on completion or blocker | `claimForgeMaintenanceIssue` requires `forge:done + pm:review`, otherwise transitions to `forge:blocked + pm:review` | `tests/forge-trigger.test.mjs` | PASS |
| A8 | Do not modify or release issue #69 | `PROTECTED_MAINTENANCE_ISSUES` excludes #69 from maintenance selection | `tests/forge-trigger.test.mjs` | PASS |
| A9 | Report empty queue and stop when no candidate exists | `pollForgeOnce` returns `IDLE` with queue-empty evidence | Existing idle heartbeat test plus code inspection | PASS |

## Risk Controls

- Duplicate execution: existing claim lock is reused for released and maintenance paths.
- Dependency bypass: released queue remains first; maintenance excludes ready/working ownership and #69.
- Secret exposure: context, comments, and logs continue through existing sanitizers.
- Evidence mismatch: execution is not considered complete unless live `forge:done + pm:review` verifies.
- Stale state: live issue is re-read before claim mutation.

## Validation

Targeted validation completed before report creation:

```text
node --test tests/forge-trigger.test.mjs tests/forge-trigger-cli.test.mjs
18/18 PASS
```

Full repository validation:

```text
npm run framework:doctor
PASS

node --test tests/*.test.mjs
173/173 PASS

npm test
173/173 PASS

git diff --check
PASS with CRLF normalization warnings only, including pre-existing LOGS/EAI-TASK-046-terminal.log

python -m json.tool docs/HANDOVER_2026-08-01_EAI_TASK_049.json
PASS
```
