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

## Current State

`AdminApp.tsx` currently wraps the existing `AppComplete.tsx` implementation. This is intentional as a low-risk first step.

## Split Plan

Extract from `AppComplete.tsx` in this order:

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
- Permanent purge remains forbidden in the local MVP.
