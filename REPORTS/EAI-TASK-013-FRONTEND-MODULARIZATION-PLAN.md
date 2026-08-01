# EAI-TASK-013: Frontend Modularization Cleanup Plan

**Final status:** PASS

## Forge maintenance refresh

Forge refreshed this stale open issue on 2026-08-01 from `C:\temp\EverythingAI` on `main`, starting at `fc8d2b163c83cc9e884b6f17002d8f854fbb7a29`.

This refresh inspected the requested frontend/admin paths, reran the required validation commands, and updated the required evidence artifacts. No application source files were changed.

## Current admin UI entry points

### User entry

- `apps/everything-ai-ui/index.html`
- `apps/everything-ai-ui/src/main.tsx`
- `apps/everything-ai-ui/src/UserApp.tsx`

### Admin entry

- `apps/everything-ai-ui/admin.html`
- `apps/everything-ai-ui/src/admin-main.tsx`
- `apps/everything-ai-ui/src/admin/index.ts`
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`

The current source already routes the active admin bundle through the modular admin boundary. Earlier issue #35 comments and artifacts that referenced `AdminAppV2` are stale for the current checkout.

## Active admin runtime boundary

The active admin runtime boundary is:

```text
apps/everything-ai-ui/admin.html
  -> apps/everything-ai-ui/src/admin-main.tsx
    -> apps/everything-ai-ui/src/admin/index.ts
      -> apps/everything-ai-ui/src/admin/AdminApp.tsx
        -> apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx
          -> apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx
```

`apps/everything-ai-ui/vite.config.ts` builds two HTML inputs, `index.html` for the user bundle and `admin.html` for the admin bundle.

## Requested path inspection

- `apps/everything-ai-ui/src/admin/**`: active modular admin runtime, components, hooks, types, utilities, and admin README.
- `apps/everything-ai-ui/src/components/**`: directory is absent in the current checkout.
- `apps/everything-ai-ui/src/shared/**`: shared UI/model helpers used outside the admin-only runtime boundary.
- `apps/everything-ai-ui/src/user/**`: user-facing MVP code remains separate from admin runtime code.

## Suspected legacy or redundant admin/frontend paths

Likely legacy or reference-only files:

- `apps/everything-ai-ui/src/App.tsx`
- `apps/everything-ai-ui/src/AppEnhanced.tsx`
- `apps/everything-ai-ui/src/AppComplete.tsx`

These root prototype files remain intentionally excluded from strict frontend typechecking by `apps/everything-ai-ui/tsconfig.json` and should not be treated as active runtime without a targeted migration issue.

No `apps/everything-ai-ui/src/admin/AdminAppV2.tsx` file or nested `apps/everything-ai-ui/src/admin/admin-main.tsx` file exists in the current checkout.

## Recommended first safe cleanup task

Retire or clearly archive the root legacy prototype UI files after confirming they are still unreferenced by the active Vite entrypoints.

This is the safest next cleanup because the active admin entry has already been aligned to the modular boundary, and the remaining cleanup can focus on reference-only root prototypes without rewiring runtime behavior.

## Files likely involved in the first cleanup task

- `apps/everything-ai-ui/src/App.tsx`
- `apps/everything-ai-ui/src/AppEnhanced.tsx`
- `apps/everything-ai-ui/src/AppComplete.tsx`
- `apps/everything-ai-ui/tsconfig.json`
- `apps/everything-ai-ui/src/admin/README.md`
- `REPORTS/<new-task-report>.md`
- `LOGS/<new-task-terminal-log>.log`
- `docs/<new-task-handover>.json`
- `.hermes/state.json`

## Exact acceptance criteria for the first cleanup task

- `rg -n "AppComplete|AppEnhanced|from './App'|from './AppComplete'|from './AppEnhanced'" apps/everything-ai-ui/src apps/everything-ai-ui/*.html apps/everything-ai-ui/*.ts` confirms no active imports before deletion or archival.
- `apps/everything-ai-ui/admin.html` continues to load `src/admin-main.tsx`.
- `apps/everything-ai-ui/src/admin-main.tsx` continues to render `AdminApp` from `./admin`.
- `apps/everything-ai-ui/src/main.tsx` continues to render the user-facing `UserApp`.
- If the root prototype files are removed, `apps/everything-ai-ui/tsconfig.json` exclusions are updated only where they referenced removed files.
- Admin-only workflows remain under `apps/everything-ai-ui/src/admin/**`.
- User-facing workflows do not import admin runtime modules.
- No provider settings, API key handling, agent connector behavior, or backend API behavior is changed.
- `git diff --check` passes.
- `cd apps/everything-ai-ui && npm run typecheck` passes.
- `cd apps/everything-ai-ui && npm run build` passes.
- `cd services/api && npm test` passes if any shared contract or backend-adjacent files are touched.

## Validation command results

Fresh validation was run on 2026-08-01 and recorded in `LOGS/EAI-TASK-013-terminal.log`.

| Command | Result | Evidence |
|---|---|---|
| `git pull --ff-only` | PASS | `Already up to date.` |
| `node scripts/framework-doctor.mjs` | PASS | Framework doctor reported `"status": "PASS"` and `gh authenticated`. |
| `cd apps/everything-ai-ui && npm run typecheck` | PASS | `tsc --noEmit` exited `0`. |
| `cd apps/everything-ai-ui && npm run build` | PASS | Vite build completed successfully with `1556 modules transformed`. |
| `cd services/api && npm test` | PASS | `173` tests, `173` passed, `0` failed, `0` skipped. |

## Acceptance matrix

| ID | Requirement | Evidence artifact | Status |
|---|---|---|---|
| AC-1 | Required artifacts exist | Log, report, handover JSON, `.hermes/state.json` | PASS |
| AC-2 | Framework doctor passes | `LOGS/EAI-TASK-013-terminal.log` | PASS |
| AC-3 | UI typecheck passes | `LOGS/EAI-TASK-013-terminal.log` | PASS |
| AC-4 | UI build passes | `LOGS/EAI-TASK-013-terminal.log` | PASS |
| AC-5 | API tests pass | `LOGS/EAI-TASK-013-terminal.log` | PASS |
| AC-6 | Report gives a clear next implementation task | This report | PASS |
| AC-7 | No broad refactor is performed | Git diff limited to issue evidence artifacts | PASS |
| AC-8 | No production behavior is changed | No application source files changed | PASS |

## Risks

- Prior issue #35 comments contain stale references to `AdminAppV2`; this refresh corrects the current evidence but does not edit historical comments.
- Removing root prototype files could discard migration context if they still contain useful reference behavior. The next task should confirm reference value before deletion.
- The current canonical project state is blocked at issues #68/#76 for live host provisioning; this frontend planning task does not release or bypass that dependency gate.
- Existing unrelated local worktree changes were present before this refresh and were preserved.

## Non-goals

- No broad refactor.
- No runtime rewiring.
- No backend/API change.
- No UI behavior change.
- No issue closure or PM self-acceptance.
- No release of dependent tasks.
- No secret capture.

## Artifact commit SHA

PENDING_ARTIFACT_COMMIT_SHA
