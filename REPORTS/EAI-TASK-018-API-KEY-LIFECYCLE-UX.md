# EAI-TASK-018: Improve Admin API key lifecycle UX

## Final status

PASS

## Files changed

- `apps/everything-ai-ui/src/admin/components/ProviderConfigurationPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `LOGS/EAI-TASK-018-terminal.log`
- `REPORTS/EAI-TASK-018-API-KEY-LIFECYCLE-UX.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_018_API_KEY_LIFECYCLE_UX.json`

## UX behavior implemented

- The admin provider configuration panel now clearly distinguishes saved, replace, clear-pending, new-key, and no-key states.
- Saved remote API keys remain masked in the input while still allowing a staged replacement to be typed.
- Operators can explicitly keep the saved key or clear it with separate actions.
- The selected-provider connection check is labeled as a saved-connection test so the saved-vs-staged distinction is obvious.
- A helper note explains that staged changes must be saved before the saved connection is tested.

## Backend behavior preserved

- Saved remote API keys remain masked.
- The `__saved__` preservation flow remains intact.
- Empty-string clear behavior remains available for intentional clears.
- Provider settings remain admin-only.
- Client Workspace remains free of API-key controls.
- Provider connection testing still works against the saved provider settings.
- No backend route or persistence logic was changed.

## Validation results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note

- Risk: the admin key section is slightly denser because it now surfaces the saved/replace/clear states explicitly.
- Mitigation: the change is UI-only and keeps the underlying save/preserve/clear backend contract unchanged.
- Rollback: revert `apps/everything-ai-ui/src/admin/components/ProviderConfigurationPanel.tsx` and `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`.

## Recommended next task

- Poll the next open issue with `pm:ready` and `hermes:ready` labels that does not already have a matching report artifact.

## Artifact commit SHA

- `PENDING_COMMIT_SHA`
