# EAI-TASK-050: Forge Maintenance Idempotency

Issue: #97
Date: 2026-08-01
Starting SHA: 825011bff5eefe8c0daa0b567e679cd163d998fd

## Summary

Forge maintenance selection now excludes the currently executing issue, controller self-selection, PM-review handoff states, already processed maintenance issues, active owners, protected dependency issue #69, and issues already processed at the same HEAD commit. The poller records processed issue identity with HEAD SHA and emits a processed/skipped summary for each maintenance pass.

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
| Never reclaim the issue currently executing | `maintenance classification skips the currently executing issue even without owner labels` |
| Persist a processed-this-cycle list | `markForgeMaintenanceProcessed` writes `.hermes/forge/maintenance-state.json` with `cycleId` and `processedIssues` |
| Never execute the same issue twice during one maintenance cycle | `maintenance restart cooldown prevents duplicate claim comments and execution commits` |
| Skip issues whose HEAD commit has not changed | `maintenance classification skips previously processed issue when HEAD is unchanged` |
| After `execution_completed`, issue becomes ineligible until PM changes state | Verified Forge submissions require terminal `forge:done` or `forge:blocked` plus `pm:review`; PM-review states classify as `awaiting_pm_review` |
| Skip `forge:done + pm:review` and `forge:blocked + pm:review` | `maintenance selection skips controller and PM-review handoff states` |
| Never allow the maintenance issue to process itself | Default controller issue exclusion returns `self_controller`; explicit current-execution exclusion returns `currently_executing` |
| Log every skip reason | Poller evidence includes per-issue skipped summary and skip-reason set |
| Produce processed/skipped summary | `maintenance poller reports processed and skipped issue summary` |

## Validation

- `node --test tests/forge-trigger.test.mjs`: 21/21 pass
- `npm run framework:doctor`: PASS
- `node --test tests/*.test.mjs`: 180/180 pass
- `npm test`: 180/180 pass
- `git diff --check`: exit 0 with line-ending warnings only
- `docs/HANDOVER_2026-08-01_EAI_TASK_050.json`: valid JSON

## Boundaries

- Issue #69 was not modified or released.
- No issue was closed or accepted.
- No secrets were included in artifacts.
- Unrelated local files were preserved:
  - `LOGS/EAI-TASK-046-terminal.log`
  - `apps/everything-ai-ui/src/planning.css`
  - `docs/AUTONOMOUS_FORGE_PM_RETEST_2026-07-29.json`
