# Sprint 6 UI Workflow Rescope Plan

## Purpose

Issue #19 was created against the older static UI under:

```text
services/api/public/index.html
services/api/public/app.js
```

PM re-triage on 2026-05-21 changed the active direction. Sprint 6 work must now be evaluated against the official React user UI:

```text
apps/everything-ai-ui
apps/everything-ai-ui/src/UserApp.tsx
http://localhost:5151
```

This plan replaces the older static-UI implementation plan. It keeps the issue open for PM review, marks what is already satisfied in the current React UI, and splits the remaining real gaps into smaller runtime-safe follow-up tickets.

## Current validated direction

```text
Official client UI: apps/everything-ai-ui/src/UserApp.tsx
Official admin UI: apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx
Legacy static UI: services/api/public/index.html and app.js are not the Sprint 6 target
PM constraint: do not implement the old public UI workflow as-is
PM constraint: do not perform broad UserApp.tsx refactoring until a smaller task is selected
```

## Files inspected

```text
docs/MVP_UI_VALIDATION_GAPS.md
docs/OPEN_TICKETS_TRIAGE_2026-05-21.md
apps/everything-ai-ui/src/UserApp.tsx
apps/everything-ai-ui/src/user/useFileDocumentWorkflows.ts
apps/everything-ai-ui/src/user/ExploreView.tsx
apps/everything-ai-ui/src/admin/components/PlanningView.tsx
apps/everything-ai-ui/src/admin/hooks/useAdminPlanning.ts
services/api/src/routes/actions.routes.js
services/api/src/routes/executionBatches.routes.js
services/api/src/routes/recovery.routes.js
services/api/src/routes/intelligence.routes.js
```

## Current UI capability matrix

| Original Sprint 6 area | Current React UI status | Evidence | Disposition |
|---|---|---|---|
| Index/select folder | Satisfied in Client Workspace | `UserApp.tsx` build workspace flow calls `/api/index`, `/api/extract`, `/api/insights`, and `/api/wiki`; onboarding accepts or selects a folder path. | No issue #19 code change needed. |
| Search files | Satisfied in Client Workspace | `useFileDocumentWorkflows.ts` calls `/api/unified-search`; `ExploreView.tsx` renders search and indexed file list. | No issue #19 code change needed. |
| Document context route alignment | Satisfied in Client Workspace | `useFileDocumentWorkflows.ts` calls `/api/intelligence/document-context/:fileId`; `ExploreView.tsx` displays filename, path, recovery status, progress, index status, extraction status, source reference, insight, and extracted text. | Mark closed for the current official user UI. |
| Suggestions and dry-run previews | Partially satisfied in Admin Dashboard | `useAdminPlanning.ts` calls `/api/action-previews`; `PlanningView.tsx` renders suggested actions and dry-run previews. | Keep as admin/operator workflow unless PM explicitly requests client exposure. |
| Single-action execution | Partially satisfied in Admin Dashboard | `useAdminPlanning.ts` calls `/api/action-executions` with `approve: true`; `PlanningView.tsx` executes ready previews individually. | Existing admin flow remains; do not broaden Client Workspace in this issue. |
| Batch create/approve/run | Not satisfied in current React UI | Backend routes exist under `executionBatches.routes.js`; no React UI route usage was found for `/api/execution-batches`. | Split into a focused admin Planning Center ticket. |
| Recovery Center restore | Not satisfied in current React UI | Backend routes exist under `recovery.routes.js`; no current React UI surface lists trash records or restores them. | Split into a focused admin Recovery Center ticket. |
| Undo eligible filesystem executions | Partially satisfied in older/prototype React surfaces, not confirmed in current official split | Current admin planning hook executes previews, but the inspected current admin planning component does not expose structured execution refresh and undo controls. | Split into a focused admin safe-actions history ticket. |
| Structured audit log filters | Partially satisfied in Admin Dashboard | Admin audit hook reads `/api/audit-log`, but issue-specific entity type/entity ID filtering and batch/recovery inspection remain absent. | Split into a focused admin audit-inspection ticket. |
| UI smoke-test runbook | Satisfied by this pass | `docs/MVP_UI_SMOKE_TEST_RUNBOOK.md` records current Client Workspace/Admin Dashboard smoke steps and explicit Sprint 6 gap checks. | Submit for PM review. |

## Narrow follow-up tickets

### Ticket A - Admin execution batch controls

Goal:

```text
Add batch creation, approval, run, detail refresh, status summary, and linked execution display to the Admin Planning Center.
```

Target files:

```text
apps/everything-ai-ui/src/admin/hooks/useAdminPlanning.ts
apps/everything-ai-ui/src/admin/components/PlanningView.tsx
apps/everything-ai-ui/src/api.ts
```

Backend routes:

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
```

Acceptance:

```text
Admin user can create a batch from ready preview IDs, approve it, run it, refresh it, and inspect linked executions without manual API calls.
```

### Ticket B - Admin Recovery Center

Goal:

```text
Add a small Admin Recovery Center view for trash records and explicit restore.
```

Target files:

```text
apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx
apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx
apps/everything-ai-ui/src/api.ts
```

Backend routes:

```text
GET /api/recovery/trash
POST /api/recovery/trash/:trashId/restore
POST /api/recovery/trash/:trashId/purge
```

Acceptance:

```text
Admin user can list trash records, inspect retention metadata, restore eligible records with confirmation, and see that permanent purge is disabled for local MVP use.
```

### Ticket C - Admin safe-action execution history and undo

Goal:

```text
Expose structured action execution history and undo only for eligible filesystem executions.
```

Target files:

```text
apps/everything-ai-ui/src/admin/hooks/useAdminPlanning.ts
apps/everything-ai-ui/src/admin/components/PlanningView.tsx
apps/everything-ai-ui/src/api.ts
```

Backend route:

```text
POST /api/action-executions/:executionId/undo
```

Acceptance:

```text
Admin user sees action executions in a structured list, can undo eligible move/rename executions after confirmation, and unsupported app-level actions do not show an undo affordance.
```

### Ticket D - Admin audit inspection filters

Goal:

```text
Add entity type and entity ID filters to the Admin Dashboard audit view while keeping raw JSON/debug visibility.
```

Target files:

```text
apps/everything-ai-ui/src/admin/hooks/useAdminAudit.ts
apps/everything-ai-ui/src/admin/components
apps/everything-ai-ui/src/api.ts
```

Backend route:

```text
GET /api/audit-log
```

Acceptance:

```text
Admin user can filter and inspect action, batch, and recovery audit events by entity type and entity ID.
```

## Deferred from issue #19

```text
Legacy services/api/public UI implementation
Broad UserApp.tsx refactor
Client Workspace exposure of admin/operator safe-action controls
Permanent purge enablement
Batch-level undo
Recovery snapshot explorer
Visual redesign
```

## Final disposition for this pass

Issue #19 should be submitted for PM review as a rescope/triage completion, not closed by the execution agent.

PM should either:

```text
1. accept the rescope and create the smaller tickets above; or
2. return a narrower single implementation ticket if one of the follow-up items should be handled immediately.
```
