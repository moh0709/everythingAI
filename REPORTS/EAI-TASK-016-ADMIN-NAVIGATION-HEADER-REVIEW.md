# EAI-TASK-016: Review admin navigation header structure

**Final status:** PASS

## Scope reviewed

Inspected:

- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/AdminApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminShell.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/types.ts`
- supporting navigation and boundary files in `apps/everything-ai-ui/src/admin/**`
- user entrypoint files `apps/everything-ai-ui/src/main.tsx` and `apps/everything-ai-ui/src/UserApp.tsx`

## Current Admin header usage map

- `AdminRuntimeApp` owns the active `section` state and passes it into `AdminShell`.
- `AdminShell` renders `AdminHeader` at the top of the admin layout.
- `AdminHeader` renders buttons from `ADMIN_NAV_ITEMS` and forwards clicks to `activateAdminNavItem`.
- `AdminHeader` also shows the active provider pill via `providerLabel(activeProvider)`.
- `AdminRuntimeApp` provides `loadAudit`, `setSection`, and `activeProvider` to the header boundary.
- `AdminHeader` is only used inside the admin shell path, not by the user workspace.

## Admin navigation sections

`ADMIN_NAV_ITEMS` defines these admin navigation targets:

- Dashboard
- Files & Content
- Planning
- Ask AI
- Agent Connectors
- Analytics
- Settings

Boundary behavior:

- `analytics` triggers `loadAudit()` instead of only changing section.
- `agentConnectors` uses the `settings` section plus `#agent-connectors` hash and scrolls to the connector panel.
- `settings` remains the general settings page when the connector hash is absent.

## Client Workspace boundary confirmation

Confirmed unaffected:

- `apps/everything-ai-ui/src/main.tsx` renders `UserApp`, not any admin component.
- `apps/everything-ai-ui/src/UserApp.tsx` is the user workspace entrypoint and does not import admin UI.
- The admin runtime is isolated behind `src/admin-main.tsx` / `src/admin/AdminApp.tsx`.
- No client workspace navigation or rendering path was changed.

## Agent Connectors boundary confirmation

Confirmed admin-only:

- `ADMIN_NAV_ITEMS` exposes `Agent Connectors` only inside admin navigation.
- `AdminViewRouter` routes connector UI through the admin `SettingsView` path.
- `AgentConnectorsPanel` explicitly states the connectors are not exposed in the Client Workspace.
- The connector panel copy and guardrails reinforce that normal users remain provider-only.

## Recommended next maintainability task

**Proposed next task:** split the Agent Connectors experience out of the overloaded settings view into a dedicated admin subsection/component boundary.

Why this is the next safe step:

- The header already treats Agent Connectors as a special admin destination.
- The current implementation still routes through `settings` internally, which makes the boundary less obvious.
- A dedicated subsection would make the admin navigation structure easier to maintain without changing user-facing behavior.

## Exact files likely involved later

- `apps/everything-ai-ui/src/admin/adminNavigation.ts`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/types.ts`

## Validation command results

- `git pull --ff-only` — passed, repository already up to date.
- `node scripts/framework-doctor.mjs` — passed.
- `cd apps/everything-ai-ui && npm run typecheck` — passed.
- `cd apps/everything-ai-ui && npm run build` — passed.
- `cd services/api && npm test` — passed, 114 tests passed, 1 skipped.

## Risks and non-goals

Risks:

- The admin navigation currently uses a special hash-based path for Agent Connectors, which is easy to miss during future cleanup.
- `SettingsView` still carries multiple admin settings responsibilities, so regressions are possible if it is split carelessly.

Non-goals:

- No product behavior was changed.
- No client workspace UI was modified.
- No admin routing behavior was changed.
- No core application logic was edited for this inspection task.

## Artifact commit SHA

PENDING_COMMIT_SHA
