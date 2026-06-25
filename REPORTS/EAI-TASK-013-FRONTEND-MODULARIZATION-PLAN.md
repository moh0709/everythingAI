# EAI-TASK-013: Frontend Modularization Cleanup Plan

**Final status:** BLOCKED

## Summary

I inspected the current admin/frontend structure and validated the repo’s safe checks. The repository is healthy, but this issue cannot be marked PASS because `.hermes/state.json` does not exist in this checkout, and the worker rule says to update that file only if it already exists. I did not create a new state file.

Validation commands all passed.

## Current admin UI entry points

### User entry
- `apps/everything-ai-ui/index.html` → `src/main.tsx` → `UserApp`

### Admin entry
- `apps/everything-ai-ui/admin.html` → `src/admin-main.tsx` → `src/admin/AdminAppV2.tsx`

### Modular admin boundary present in source
- `src/admin/AdminApp.tsx` → `src/admin/AdminRuntimeApp.tsx` → `src/admin/components/AdminViewRouter.tsx`

## Active admin runtime boundary

The **active build path** currently goes through the root `src/admin-main.tsx`, which imports `AdminAppV2`. That means the live admin bundle is still anchored to the older monolithic admin implementation, even though the modular admin boundary already exists in `src/admin/`.

The modular path is present and typechecked, but it is not the current Vite entry for the admin HTML page.

## Suspected legacy or redundant admin/frontend paths

### Likely legacy / redundant
- `apps/everything-ai-ui/src/admin/admin-main.tsx` — duplicate admin entrypoint under the admin folder; not used by `vite.config.ts` build inputs.
- `apps/everything-ai-ui/src/admin/AdminAppV2.tsx` — legacy monolithic admin runtime still wired to the active `src/admin-main.tsx` entry.
- `apps/everything-ai-ui/src/App.tsx`
- `apps/everything-ai-ui/src/AppEnhanced.tsx`
- `apps/everything-ai-ui/src/AppComplete.tsx`
  - These are intentionally excluded from strict typechecking and should remain reference-only unless a migration task explicitly targets them.

### Already modular / cleaner boundary
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/components/*`

## Recommended first safe cleanup task

**Align the live admin entry with the modular admin boundary by switching the root admin bootstrap away from `AdminAppV2` and onto `AdminApp` / `AdminRuntimeApp`.**

This is the smallest safe cleanup step because it only rewires the admin bootstrap path; it does not change API contracts, provider behavior, or user-facing product flows.

## Files likely involved in that first task

- `apps/everything-ai-ui/src/admin-main.tsx`
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/index.ts`
- `apps/everything-ai-ui/src/admin/README.md`
- `apps/everything-ai-ui/admin.html`
- `apps/everything-ai-ui/vite.config.ts`
- optionally `apps/everything-ai-ui/src/admin/admin-main.tsx` only for deprecation/removal cleanup after the active entry is confirmed stable

## Exact acceptance criteria for that first cleanup task

- Admin HTML continues to load successfully.
- The live admin bundle is served through the modular admin boundary, not the legacy monolith.
- User UI entry remains unchanged.
- No admin-only boundaries are weakened.
- No product behavior changes beyond the entrypoint wiring.
- `npm run typecheck` passes.
- `npm run build` passes.
- No backend/API changes are required.
- No new secrets, tokens, or environment values are introduced into logs or reports.

## Validation command results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`113` tests, `112` passed, `1` skipped, `0` failed)

## Risks

- The repository still carries legacy admin/user prototype code paths for reference.
- The current active admin bootstrap is not yet aligned to the modular admin boundary, so a future cleanup should be carefully staged and validated.
- `.hermes/state.json` is missing, so the repo cannot be updated there under the current worker rule.

## Non-goals

- No broad refactor.
- No production behavior change.
- No backend change.
- No creation of `.hermes/state.json` from scratch.
- No removal of legacy files in this task.

## Artifact commit SHA

76de16fdb4fd1df049ef3759f02c9fe26fdd0a36
