# EAI-TASK-016: Review admin navigation header structure

## Status
PASS

## Summary
I reviewed the active admin navigation/header structure and verified that it remains scoped to the admin runtime boundary. The top navigation is implemented in `AdminHeader`, wired through `AdminShell`, and driven by `AdminRuntimeApp` state. Agent Connectors is still treated as an admin-only settings subsection, and the Client Workspace entry path remains separate and untouched.

No product behavior was changed for this task.

## Current Admin header usage map

- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
  - Owns `section` state and passes `section`, `setSection`, `loadAudit`, and `activeProvider` into `AdminShell`.
- `apps/everything-ai-ui/src/admin/components/AdminShell.tsx`
  - Renders `AdminHeader` at the top of the admin shell.
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
  - Defines the visible nav items and click behavior.
  - Nav item mapping:
    - Dashboard -> `dashboard`
    - Files & Content -> `explorer`
    - Planning -> `planning`
    - Ask AI -> `askai`
    - Agent Connectors -> `settings` plus `#agent-connectors` hash
    - Analytics -> triggers `loadAudit()` then switches to `analytics`
    - Settings -> `settings`
  - Uses the current provider label for the provider pill.
  - Clears the hash for normal section navigation and uses a dedicated hash for Agent Connectors.

## Admin navigation boundary notes

- `AdminViewRouter` routes only the main admin sections (`dashboard`, `explorer`, `planning`, `analytics`, `settings`, `askai`). There is no dedicated `agentConnectors` route; that area is handled as a settings subsection.
- `SettingsView` includes `AgentConnectorsPanel` directly, so Agent Connectors remains nested under admin settings rather than becoming a separate user-facing page.
- `AgentConnectorsPanel` explicitly documents itself as admin-only and states that the Client Workspace must not expose connectors.
- `apps/everything-ai-ui/src/main.tsx` still renders `UserApp` for the user-facing app.
- `apps/everything-ai-ui/src/admin-main.tsx` separately renders `AdminApp` for the admin app.
- `apps/everything-ai-ui/src/admin/README.md` also documents the user/admin boundary and warns not to import admin components into `UserApp.tsx`.

## Client Workspace impact check

Confirmed unaffected:

- The user entrypoint remains `main.tsx -> UserApp.tsx`.
- The admin shell is only reachable through the admin entrypoint (`admin-main.tsx -> AdminApp.tsx`).
- No files in the user runtime were modified.
- The admin boundary documentation still points maintainers toward a separate admin path.

## Proposed next maintainability task

Extract the admin top-nav metadata and the Agent Connectors hash/subsection behavior into a small shared navigation configuration so the header, settings view, and router no longer rely on scattered item-by-item logic.

Why this is the best next step:

- It removes duplicated section knowledge from the header and settings area.
- It makes the Agent Connectors subsection easier to reason about and test.
- It keeps the user-facing behavior unchanged while improving the admin boundary’s maintainability.

## Exact files likely involved later

- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminShell.tsx`
- `apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/src/admin/types.ts`
- optionally `apps/everything-ai-ui/src/admin/README.md` for boundary documentation updates

## Validation

All requested validation commands passed:

- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

Additional notes:

- `framework-doctor` reported `gh authenticated` and a valid Hermes state file.
- UI build completed successfully and emitted the admin and user bundles.
- API tests completed successfully with 113 passing tests and 1 skipped test.

## Risks and non-goals

Risks:

- The current admin navigation logic is split across several files, which can make future edits slightly error-prone.
- Agent Connectors remains nested behind the Settings section and hash-based scrolling, which is safe but a little non-obvious.

Non-goals:

- No product behavior changes.
- No admin or user runtime routing changes.
- No connector enablement changes.
- No changes to Client Workspace behavior.

## Artifact commit SHA

865ec65
