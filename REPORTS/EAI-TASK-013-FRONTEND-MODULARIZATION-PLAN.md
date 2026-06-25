# EAI-TASK-013: Frontend Modularization Cleanup Plan

**Final status:** PASS

## Summary
I inspected the current admin and frontend structure and validated the repository with the required safe checks. No production behavior was changed, and no broad refactor was performed. The repo is in a good state for the next low-risk admin modularization cleanup step.

## Current admin UI entry points
Current browser entry flow:

```text
admin.html
  -> src/admin-main.tsx
  -> src/admin/AdminAppV2.tsx
```

Current modular admin implementation already present in the repo:

```text
src/admin/AdminApp.tsx
  -> src/admin/AdminRuntimeApp.tsx
  -> src/admin/components/AdminViewRouter.tsx
```

User-facing entry flow remains separate and unchanged:

```text
index.html
  -> src/main.tsx
  -> src/UserApp.tsx
```

## Active admin runtime boundary
The active runtime boundary is still the legacy `AdminAppV2` path because `src/admin-main.tsx` imports `AdminAppV2` directly.

The modular replacement is already in place, but it is not wired to the admin entry yet:

- `src/admin/AdminApp.tsx` wraps `AdminRuntimeApp`
- `src/admin/AdminRuntimeApp.tsx` contains the modular admin state/runtime
- `src/admin/components/AdminViewRouter.tsx` routes the modular admin sections

## Suspected legacy or redundant admin/frontend paths
Likely cleanup targets, in priority order:

1. `apps/everything-ai-ui/src/admin/admin-main.tsx`
   - still points at `AdminAppV2`
   - appears to be the active legacy admin entry

2. `apps/everything-ai-ui/src/admin/AdminAppV2.tsx`
   - legacy admin implementation still used by the entry file
   - duplicates the responsibilities already moved into `AdminApp.tsx` / `AdminRuntimeApp.tsx`

3. `apps/everything-ai-ui/src/App.tsx`
4. `apps/everything-ai-ui/src/AppEnhanced.tsx`
5. `apps/everything-ai-ui/src/AppComplete.tsx`
   - legacy operator prototypes retained for migration/reference
   - explicitly excluded from strict frontend typechecking in `apps/everything-ai-ui/tsconfig.json`

6. Documentation mismatch
   - `apps/everything-ai-ui/src/admin/README.md` documents the modular boundary, but the actual entry still uses `AdminAppV2`
   - this should be aligned after the entry switch

## Recommended first safe cleanup task
**Switch the admin entry to the modular admin boundary**.

Concretely:
- update `apps/everything-ai-ui/src/admin/admin-main.tsx` to render `AdminApp` instead of `AdminAppV2`
- keep the existing runtime behavior unchanged
- validate the build/typecheck after the wiring change

This is the safest first step because it does not require a broad refactor and it makes the already-built modular admin path the real runtime entry.

## Files likely involved in that first task
- `apps/everything-ai-ui/src/admin/admin-main.tsx`
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminAppV2.tsx`
- `apps/everything-ai-ui/src/admin/README.md`
- `apps/everything-ai-ui/README.md`

## Acceptance criteria for the first cleanup task
- `admin.html` loads through `AdminApp` / `AdminRuntimeApp` rather than `AdminAppV2`
- the admin UI still builds successfully
- frontend typecheck still passes
- the user-facing entry point (`main.tsx` / `UserApp.tsx`) remains untouched
- no production behavior changes
- no admin/operator functionality is removed during the entry wiring change

## Validation results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`113` tests total, `112` passed, `1` skipped, `0` failed)

## Risks and non-goals
### Risks
- The admin docs currently describe the modular runtime, so a wiring mismatch could confuse future maintenance until the entry file is aligned.
- Legacy admin prototypes are still present, so cleanup should be staged and validated one step at a time.

### Non-goals
- No broad refactor of admin components in this task.
- No user-facing behavior changes.
- No backend API changes.
- No enablement of agent bridge execution or chat.
- No changes to `.hermes/state.json` because that file does not exist in this repo checkout.

## Artifact commit SHA
`03d1e6f`
