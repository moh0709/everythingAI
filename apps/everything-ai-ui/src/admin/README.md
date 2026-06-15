# EverythingAI Admin UI Boundary

This folder is the React boundary for admin/operator workflows.

## Purpose

The official user-facing MVP must remain safe and non-destructive. User-facing code is loaded from:

```txt
apps/everything-ai-ui/src/main.tsx
apps/everything-ai-ui/src/UserApp.tsx
```

Admin/operator code belongs under this folder and may include workflows such as:

- planning
- dry-run previews
- action approvals
- execution queues
- recovery workflows
- audit inspection
- provider governance
- source path management
- automation governance
- agent connector diagnostics

## Current State

`AdminApp.tsx` is the admin entry boundary and currently renders the modular `AdminRuntimeApp.tsx` implementation.

Legacy operator prototypes remain in the root `src/` folder for reference during migration only:

```txt
apps/everything-ai-ui/src/App.tsx
apps/everything-ai-ui/src/AppEnhanced.tsx
apps/everything-ai-ui/src/AppComplete.tsx
```

These legacy files are intentionally excluded from strict frontend typechecking in:

```txt
apps/everything-ai-ui/tsconfig.json
```

The active admin path must continue through:

```txt
apps/everything-ai-ui/src/admin/AdminApp.tsx
apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx
apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx
```

## Split Plan

Continue extracting and validating admin runtime code in this order:

1. `components/AdminHeader.tsx`
2. `components/DashboardView.tsx`
3. `components/SourcePathsPanel.tsx`
4. `components/ExplorerView.tsx`
5. `components/PlanningView.tsx`
6. `components/AnalyticsView.tsx`
7. `components/SettingsView.tsx`
8. `components/AskAIView.tsx`
9. `hooks/useAdminWorkspace.ts`
10. `hooks/useProviderSettings.ts`
11. `types.ts`

## Safety Rules

- Do not import admin components into `UserApp.tsx`.
- Do not expose destructive workflows in the user UI.
- Keep `main.tsx` pointed at `UserApp.tsx` unless intentionally testing admin locally.
- Keep `admin.html` / admin entry routing pointed at the admin boundary.
- Keep provider selection, API keys, remote-provider policy, planning policy, and Agent Connectors admin-only.
- Keep agent bridge execution disabled by default.
- Keep agent chat execution disabled by default.
- Do not enable arbitrary browser-submitted shell commands.
- Permanent purge remains forbidden in the local MVP.
