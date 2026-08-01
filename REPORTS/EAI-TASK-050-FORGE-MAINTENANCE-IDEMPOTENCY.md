# EAI-TASK-050: Forge Maintenance Idempotency

Issue: #98
Date: 2026-08-01
Starting SHA: bba8f2d5c5c52a9a70ba7ed95f9de9cd06e01002

## Summary

Forge maintenance selection now fails closed for controller self-selection, PM-review handoff states, already processed maintenance issues, active owners, and the protected dependency issue #69. The poller persists completed maintenance issue identities in `.hermes/forge/maintenance-state.json` and applies a restart-safe cooldown before any second claim, comment, or execution for the same issue.

## Changed Files

- `src/forge-trigger.js`
- `scripts/forge-trigger.mjs`
- `tests/forge-trigger.test.mjs`
- `REPORTS/EAI-TASK-050-FORGE-MAINTENANCE-IDEMPOTENCY.md`
- `docs/HANDOVER_2026-08-01_EAI_TASK_050.json`
- `LOGS/EAI-TASK-050-terminal.log`

## Acceptance Evidence

| Requirement | Evidence |
|---|---|
| Exclude current maintenance controller | `maintenance poller default controller exclusion skips issue 96 and selects next older eligible issue` |
| Exclude `forge:done + pm:review` and `forge:blocked + pm:review` | `maintenance selection skips controller and PM-review handoff states` |
| Do not review or reprocess submitted Forge work | PM-review states return `awaiting_pm_review` skip reason |
| Persist processed issue identity | `markForgeMaintenanceProcessed` writes cycle state; restart test reads it |
| Cooldown across ticks and restarts | `maintenance restart cooldown prevents duplicate claim comments and execution commits` |
| Re-read labels immediately before claim mutation | `maintenance stale label re-read aborts when PM review appears before mutation` |
| Remove `forge:working` on terminal handoff | Existing blocked/done handoff tests verify terminal labels omit `forge:working` |
| Duplicate claim comments and evidence commits | Repeated tick/restart tests assert one comment/execution per selected issue |
| Explicit skip reasons | `self_controller`, `awaiting_pm_review`, `already_processed`, `active_owner`, `dependency_blocked` covered in tests |

## Validation

- `node --test tests/forge-trigger.test.mjs`: 18/18 pass
- `node scripts/framework-doctor.mjs`: PASS
- `node --test tests/*.test.mjs`: 177/177 pass
- `npm test`: 177/177 pass
- `git diff --check`: exit 0; only Git line-ending warnings
- Independent #96 demo: `issue96.skipReason = self_controller`, `selectedIssue = 78`

## Boundaries

- Issue #69 was not modified or released.
- No issue was closed or accepted.
- No secrets were included in artifacts.
- Unrelated local files were preserved.
