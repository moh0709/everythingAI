# EAI-TASK-013: Frontend modularization cleanup plan for admin UI

**Final status:** PASS

## Summary
Phase 8.3 is closed, the connector gate remains clear, and the active admin runtime path is already modularized. This task did not require production code changes. Validation passed, and the next safe cleanup step should target dead/legacy admin entrypoints rather than the active runtime.

## Current admin UI entry points
- User UI entry: `apps/everything-ai-ui/src/main.tsx` → `UserApp`
- Admin UI HTML entry: `apps/everything-ai-ui/admin.html` → `src/admin-main.tsx`
- Active admin boundary: `apps/everything-ai-ui/src/admin/AdminApp.tsx` → `AdminRuntimeApp.tsx` → `AdminShell.tsx` → `AdminViewRouter.tsx`
- Active admin components are organized under `apps/everything-ai-ui/src/admin/components/**` and hooks under `apps/everything-ai-ui/src/admin/hooks/**`

## Active admin runtime boundary
The active boundary is the modular admin implementation rendered through:
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminShell.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`

This boundary keeps the operator/admin workflows separate from the user-facing MVP path.

## Suspected legacy or redundant paths
1. `apps/everything-ai-ui/src/admin/admin-main.tsx`
   - This is a second admin entry file that imports `AdminAppV2`.
   - It is not referenced by `vite.config.ts` or `admin.html`.
   - It appears to be a dead alternate entrypoint.

2. `apps/everything-ai-ui/src/admin/AdminAppV2.tsx`
   - Large alternate admin implementation.
   - Not used by the active `src/admin-main.tsx` entry.
   - Likely safe to retire after confirming no external references.

3. Legacy root prototypes:
   - `apps/everything-ai-ui/src/App.tsx`
   - `apps/everything-ai-ui/src/AppEnhanced.tsx`
   - `apps/everything-ai-ui/src/AppComplete.tsx`
   - These remain present for reference and are excluded from strict typechecking, but they are not the active entry path.

## Recommended first safe cleanup task
Retire the dead alternate admin entrypoint and its implementation:
- delete or archive `apps/everything-ai-ui/src/admin/admin-main.tsx`
- delete or archive `apps/everything-ai-ui/src/admin/AdminAppV2.tsx`
- confirm no build or runtime references remain

This is the smallest low-risk cleanup that reduces confusion without touching the live admin runtime.

## Files likely involved in that first task
- `apps/everything-ai-ui/src/admin/admin-main.tsx`
- `apps/everything-ai-ui/src/admin/AdminAppV2.tsx`
- `apps/everything-ai-ui/vite.config.ts` for reference verification only
- `apps/everything-ai-ui/admin.html` for reference verification only
- `apps/everything-ai-ui/src/admin/index.ts` for boundary confirmation only

## Acceptance criteria for the first cleanup task
- `admin.html` still loads `src/admin-main.tsx` and the active admin boundary remains unchanged.
- No imports or build config reference `src/admin/admin-main.tsx` or `AdminAppV2.tsx`.
- `npm run typecheck` passes.
- `npm run build` passes.
- No user-facing behavior changes.
- No admin operator behavior changes.
- No broad refactor is introduced.

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`113` tests total, `112` passed, `1` skipped, `0` failed)

## Risks and non-goals
### Risks
- The repository still contains legacy admin prototype files, which can confuse future maintainers if left in place.
- A cleanup delete should be done carefully to avoid accidentally removing the active `src/admin-main.tsx` path.

### Non-goals
- No production behavior changes.
- No broad modular refactor.
- No changes to user-facing UI routes.
- No changes to backend behavior.

## Artifact commit SHA
83e9002
