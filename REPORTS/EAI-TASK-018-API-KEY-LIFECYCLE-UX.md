# EAI-TASK-018: Improve Admin API key lifecycle UX

## Final status

PASS

## Files changed

- `apps/everything-ai-ui/src/admin/components/ProviderConfigurationPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `LOGS/EAI-TASK-018-terminal.log`
- `REPORTS/EAI-TASK-018-API-KEY-LIFECYCLE-UX.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_018_API_KEY_LIFECYCLE_UX.json`
- `.hermes/state.json`

## UX behavior implemented

- The Admin provider settings panel now distinguishes a masked saved key from a staged replacement key.
- The panel now exposes an explicit clear flow for operators that want to remove a saved key.
- The UI now shows a separate "Clear pending" state when a saved key has been cleared in the draft but not yet saved.
- `Test Connection` remains available and unchanged.
- The admin settings section still presents provider settings and agent connector controls in the Admin shell only.

## Backend behavior preserved

- Saved remote API keys remain masked with the existing `__saved__` flow.
- The backend `preserveSavedKeys` behavior remains intact.
- Clearing still requires an intentional operator action through the UI clear control.
- Provider settings remain Admin-only.
- Client Workspace remains unaffected and does not gain API-key controls.
- Provider connection tests continue to use the existing API route.

## Validation summary

- `git pull --ff-only`: PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs`: PASS
- `cd apps/everything-ai-ui && npm run typecheck`: PASS after fixing a prop passthrough issue surfaced by the first run
- `cd apps/everything-ai-ui && npm run build`: PASS
- `cd services/api && npm test`: PASS

## Risks and rollback note

- Risk is low because the change is constrained to Admin settings UI copy/state handling and does not alter backend provider-setting persistence logic.
- Rollback: revert `apps/everything-ai-ui/src/admin/components/ProviderConfigurationPanel.tsx` and `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`.

## Recommended next task

- Poll the next open issue with `pm:ready` and `hermes:ready` labels that does not already have a matching report artifact.

## Artifact commit SHA

- `246699f045450c9279761cf95a382de8e02dd6d4`
