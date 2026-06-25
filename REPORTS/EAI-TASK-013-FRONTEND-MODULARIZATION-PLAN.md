# EAI-TASK-013: Frontend Modularization Cleanup Plan for Admin UI

**Final status:** PASS

## Scope reviewed
I inspected the current admin/frontend structure and the following reference material:

- `docs/NEXT_IMPLEMENTATION_BACKLOG_2026-06-24.md`
- `docs/HANDOVER_2026-06-24_PHASE8_3_FINAL_CONNECTOR_GATE_CLEARED.json`
- `REPORTS/EAI-TASK-010-PHASE8_3-CLOSEOUT-AND-NEXT-BACKLOG.md`
- `apps/everything-ai-ui/src/admin/**`
- `apps/everything-ai-ui/src/components/**`
- `apps/everything-ai-ui/src/shared/**`
- `apps/everything-ai-ui/src/user/**`

## Current admin UI entry points
The active admin path is:

- `apps/everything-ai-ui/admin.html`
- `apps/everything-ai-ui/src/admin-main.tsx`
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`

The Vite build input also points to `admin.html` as the admin entry.

## Active admin runtime boundary
The active runtime boundary is the modular admin implementation:

- `src/admin/AdminApp.tsx` is the boundary component loaded by the admin entry.
- `src/admin/AdminRuntimeApp.tsx` contains the working admin runtime.
- `src/admin/components/*` contains the split admin views and panels.

This is the runtime that `admin.html` actually reaches today.

## Suspected legacy or redundant admin/frontend paths
The following paths appear legacy, redundant, or migration-only:

- `apps/everything-ai-ui/src/admin/admin-main.tsx` — redundant nested admin entrypoint; not referenced by `admin.html` or Vite input.
- `apps/everything-ai-ui/src/admin/AdminAppV2.tsx` — older monolithic admin implementation kept as a migration artifact.
- `apps/everything-ai-ui/src/App.tsx`
- `apps/everything-ai-ui/src/AppEnhanced.tsx`
- `apps/everything-ai-ui/src/AppComplete.tsx`

The current docs already describe the root admin entry as the active route, so the nested `src/admin/admin-main.tsx` is the clearest dead-path cleanup candidate.

## Recommended first safe cleanup task
**Remove the redundant nested admin entry file `apps/everything-ai-ui/src/admin/admin-main.tsx`.**

Why this first:
- It is not part of the admin HTML entry flow.
- It is not referenced by Vite build input.
- It is a low-risk dead-path deletion that does not alter production behavior.
- It reduces confusion between the active modular admin entry and the older nested prototype entry.

## Files likely involved in that first task
Primary file:

- `apps/everything-ai-ui/src/admin/admin-main.tsx`

Possibly update documentation if desired for clarity, but not required for runtime correctness:

- `apps/everything-ai-ui/src/admin/README.md`
- `apps/everything-ai-ui/README.md`

## Exact acceptance criteria for the first cleanup task
- `apps/everything-ai-ui/admin.html` still points to `src/admin-main.tsx`.
- `apps/everything-ai-ui/src/admin/admin-main.tsx` is removed.
- No build or typecheck references remain to the removed nested entry.
- `npm run typecheck` passes in `apps/everything-ai-ui`.
- `npm run build` passes in `apps/everything-ai-ui`.
- Manual admin entry still loads through `http://localhost:5152/admin.html`.
- No user-facing routing or admin-only boundary behavior changes.

## Validation results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`113` tests, `112` passed, `1` skipped, `0` failed)

## Risks and non-goals
### Risks
- Any external documentation or operator habit that still expects the nested admin entry would need correction, though no such active references were found in the repo scan.
- The old monolithic `AdminAppV2.tsx` remains present as a migration artifact and should be retired only after the dead entrypoint cleanup is safely confirmed.

### Non-goals
- No broad frontend refactor.
- No production behavior change.
- No user-facing route changes.
- No changes to agent bridge policy or connector safety boundaries.
- No state file update, because `.hermes/state.json` does not exist in this repository.

## Artifact commit SHA
`3bc6de9`
