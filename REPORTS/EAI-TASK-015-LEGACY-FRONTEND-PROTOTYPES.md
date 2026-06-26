# EAI-TASK-015: Review remaining legacy frontend prototypes

**Final status:** PASS

## Summary
This task reviewed the remaining legacy frontend prototype files and confirmed the active user/admin runtime paths are unchanged. No product behavior was modified.

## Reference-check results
- `apps/everything-ai-ui/src/main.tsx` boots `UserApp`, so the Client Workspace entrypoint stays separate from admin runtime.
- `apps/everything-ai-ui/src/admin-main.tsx` boots `AdminApp`, which delegates to `AdminRuntimeApp`.
- `apps/everything-ai-ui/vite.config.ts` builds separate `user` and `admin` HTML inputs.
- `apps/everything-ai-ui/index.html` points only at `/src/main.tsx`.
- `apps/everything-ai-ui/admin.html` points only at `/src/admin-main.tsx`.
- `apps/everything-ai-ui/src/UserApp.tsx` and `apps/everything-ai-ui/src/user/**` contain no admin connector imports.
- `AppEnhanced.tsx` and `AppComplete.tsx` are still present as legacy/prototype material, but the active entrypoints do not import them.
- `tsconfig.json` still includes `src/App.tsx`, `src/AppEnhanced.tsx`, and `src/AppComplete.tsx` for typechecking coverage.

## Current Admin header usage map
- `AdminApp.tsx` returns `AdminRuntimeApp`.
- `AdminRuntimeApp.tsx` renders `AdminShell`, which renders `AdminHeader`.
- `AdminHeader.tsx` drives navigation from `ADMIN_NAV_ITEMS` in `adminNavigation.ts`.
- The `Agent Connectors` nav item maps to the `settings` section plus `#agent-connectors`, then scrolls to the connector panel.
- `AdminViewRouter.tsx` routes the `settings` section to `SettingsView`.
- `SettingsView.tsx` renders `AgentConnectorsPanel` inside the Settings section.

## Admin navigation boundary notes
- `Agent Connectors` is an admin-only affordance.
- `adminNavigation.ts` keeps it inside the admin settings flow rather than exposing it as a separate product route.
- `AgentConnectorsPanel.tsx` explicitly says these connectors are not exposed in the Client Workspace and that the Client Workspace must remain provider-only.
- `AdminHero.tsx` also tells normal users to use the Client Workspace.
- The Client Workspace remains unaffected by this task.

## Proposed next maintainability task
**Recommended follow-up:** remove the hash-based special case for `Agent Connectors` by giving it an explicit settings subsection state or dedicated settings subpanel inside the admin shell.

### Why this is the next safe task
- The panel is already isolated in `SettingsView.tsx`.
- The nav item currently uses hash scrolling as a hidden routing mechanism.
- Making the subsection explicit would improve maintainability without changing behavior.

### Exact files likely involved later
- `apps/everything-ai-ui/src/admin/adminNavigation.ts`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/types.ts`

## Validation results
- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

### Validation notes
- Framework doctor confirmed `gh` is authenticated and the required framework files are present.
- UI build completed successfully with separate `admin` and `user` bundles.
- API tests passed: 114 tests total, 113 passed, 1 skipped.

## Risks and non-goals
- No production behavior was changed.
- No core application code was modified.
- Legacy prototype files still exist for reference and typecheck coverage; removing them is a separate follow-up task.
- This task did not change the Client Workspace/Admin boundary.

## Artifact commit SHA
34b4d19f57d0870b48f6b2780fbc8aadbf01b986
