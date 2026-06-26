# EAI-TASK-017: Centralize admin navigation metadata

## Status
PASS

## Summary
I centralized the admin navigation metadata and section activation behavior so the Admin header and Admin hero both rely on shared navigation helpers instead of duplicating click logic. The visible admin behavior remains unchanged:

- Dashboard still opens dashboard.
- Files & Content still opens explorer.
- Planning still opens planning.
- Ask AI still opens askai.
- Analytics still loads audit data before switching to analytics.
- Settings still opens settings.
- Agent Connectors still opens Settings with the `#agent-connectors` subsection.
- Client Workspace remains unaffected.
- Agent Connectors remains admin-only.

## Files changed

- `apps/everything-ai-ui/src/admin/adminNavigation.ts`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHero.tsx`

## Behavior preserved

- The admin header still renders the same navigation destinations.
- Agent Connectors still uses the dedicated hash-based subsection behavior.
- Analytics still triggers `loadAudit()` before switching views.
- The Admin hero still exposes Planning and Analytics shortcuts, now from shared action metadata.
- Client Workspace routing and behavior were not modified.

## Validation results

- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

Validation details:

- `framework-doctor` reported `gh authenticated` and a valid Hermes state file.
- UI build completed successfully.
- API tests completed successfully with 114 passing tests and 1 skipped test.

## Risks and rollback note

Risk is low. This change only consolidates navigation metadata and button handling in the admin UI. If a rollback is needed, revert the three changed admin UI files in a single commit.

## Recommended next task

Extract the remaining admin view-router section mapping into a shared config/helper so the section definitions, labels, and transition behavior live in one place.

## Artifact commit SHA

488c4e5
