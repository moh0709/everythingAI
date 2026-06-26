# EAI-TASK-016: Admin navigation header structure review

## Final status

PASS

## Scope checked

Inspection-only task. No product behavior was changed.

## Current Admin header usage map

- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
  - Renders the top admin nav bar and provider pill.
  - Maps `ADMIN_NAV_ITEMS` into nav buttons.
  - Uses `activateAdminNavItem()` and `isAdminNavItemActive()` from `adminNavigation.ts`.
- `apps/everything-ai-ui/src/admin/components/AdminShell.tsx`
  - Mounts `AdminHeader` above the rest of the admin page chrome.
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
  - Owns admin section state and passes `setSection` / `loadAudit` into the shell.
  - Keeps admin-only connector actions inside the admin runtime.
- `apps/everything-ai-ui/src/admin/adminNavigation.ts`
  - Defines the admin nav items and the special `agentConnectors` nav target.
  - Routes `Agent Connectors` to the `settings` section with `#agent-connectors` and scrolls to the panel.
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
  - Routes `settings` to `SettingsView`.
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
  - Renders `AgentConnectorsPanel` inside the settings page.

## Admin navigation boundary notes

- `Agent Connectors` remains an Admin-only path.
- The nav item does not open a separate workspace route; it targets `settings` inside the admin shell and anchors to the connectors panel.
- The client workspace entry remains separate:
  - `apps/everything-ai-ui/src/main.tsx` renders `UserApp` + `ToastProvider`.
  - `apps/everything-ai-ui/src/admin-main.tsx` renders `AdminApp`.
- `UserApp` is the client workspace entry and stays outside the admin navigation boundary.

## Client Workspace impact check

Confirmed unaffected by this admin review:

- `apps/everything-ai-ui/src/main.tsx`
- `apps/everything-ai-ui/src/UserApp.tsx`

Those files continue to drive the user-facing workspace path and do not import admin navigation or admin connector components.

## Agent Connectors boundary check

Confirmed still inside Admin-only navigation/settings:

- `apps/everything-ai-ui/src/admin/adminNavigation.ts`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`

No client workspace connector exposure was observed.

## Proposed next maintainability task

Extract the admin navigation/configuration into a more declarative single source of truth and then split the connectors section into a dedicated nested settings subsection if the UI needs to grow.

### Likely files involved later

- `apps/everything-ai-ui/src/admin/adminNavigation.ts`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminShell.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/types.ts`

## Recommended acceptance criteria for the next task

- Admin nav items are declared in one place.
- `Agent Connectors` remains admin-only.
- Client workspace files remain untouched.
- Typecheck and build still pass.
- No routing or behavior changes outside the admin settings subtree.

## Validation results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and non-goals

### Risks

- `Agent Connectors` is currently embedded within the admin settings page, so future expansion could make the settings page harder to scan.
- Navigation state is split between header routing, hash handling, and settings-panel rendering.

### Non-goals

- No product behavior changes.
- No admin/client boundary changes.
- No core application code changes.
- No `.hermes/state.json` update was made because the file does not exist in this repo.

## Artifact commit SHA

858e5f3
