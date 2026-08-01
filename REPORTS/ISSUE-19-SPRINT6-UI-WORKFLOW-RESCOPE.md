# Issue #19 - Sprint 6 UI Workflow Rescope

## Summary

Issue #19 has been re-triaged against the current official React UI instead of the older `services/api/public` UI.

No runtime UI code was changed in this pass because the live PM comment explicitly says not to implement the older public UI workflow as-is and not to perform broad `UserApp.tsx` refactoring until a smaller runtime-safe UI task is selected.

## Evidence inspected

```text
GitHub issue #19 live state and PM comments
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

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Existing backend tests remain green | Pending validation at final gate | `npm test` required before submission. |
| UI uses current document context route | Pass | `apps/everything-ai-ui/src/user/useFileDocumentWorkflows.ts` calls `/api/intelligence/document-context/:fileId`. |
| User can create/approve/run execution batches from UI | Deferred | No React UI usage of `/api/execution-batches` found; split into focused follow-up Ticket A. |
| User can inspect batch execution results from UI | Deferred | Requires Ticket A. |
| User can restore recovery records from UI | Deferred | Backend routes exist; React UI surface not present; split into focused follow-up Ticket B. |
| User can undo eligible filesystem executions from UI | Deferred | Current official split needs a focused admin execution-history task; split into Ticket C. |
| User can inspect audit logs in structured form | Deferred | Admin audit route usage exists, but entity filters/batch/recovery inspection are follow-up Ticket D. |
| Local MVP safety rules remain unchanged | Pass | No runtime code changed; purge enablement remains deferred. |
| No broad frontend redesign is introduced | Pass | Documentation-only rescope. |
| UI smoke-test runbook exists | Pass | `docs/MVP_UI_SMOKE_TEST_RUNBOOK.md`. |

## Artifacts changed

```text
docs/SPRINT6_UI_WORKFLOW_PLAN.md
docs/MVP_UI_SMOKE_TEST_RUNBOOK.md
REPORTS/ISSUE-19-SPRINT6-UI-WORKFLOW-RESCOPE.md
docs/HANDOVER_2026-08-01_ISSUE_19_SPRINT6_UI_WORKFLOW_RESCOPE.json
.hermes/state.json
```

## PM review recommendation

Accept this pass as a rescope/triage completion for issue #19, then create smaller tickets for:

```text
Admin execution batch controls
Admin Recovery Center
Admin safe-action execution history and undo
Admin audit inspection filters
```

Do not close issue #19 from the execution side and do not treat this rescope as PM acceptance.
