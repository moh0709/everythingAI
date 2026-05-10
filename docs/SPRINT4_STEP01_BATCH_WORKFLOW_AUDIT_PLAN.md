# Sprint 4 Step 01 — Execution Batch Workflow Audit & Plan

## Purpose

This document records the current execution batch foundation and the implementation plan for Sprint 4 before changing runtime behavior.

Sprint 4 goal:

```text
selected previews
→ create execution batch
→ approve batch
→ run batch
→ execute each preview through existing safe single-action executor
→ update batch status
→ expose batch audit/replay summary
```

## Baseline before Sprint 4 implementation

```text
63 tests passing / 0 failing
Sprint 1 recovery/trash complete
Sprint 2 search/source-reference hardening complete
Sprint 3 execution recovery hardening complete
```

## Files inspected

```text
services/api/src/db/schema.sql
services/api/src/db/repositories/executionRepository.js
services/api/src/routes/actions.routes.js
services/api/src/actions/actionExecutor.js
docs/SPRINT3_EXECUTION_BATCH_DECISION.md
```

## Current schema foundation

The schema already has:

```text
execution_batches
action_executions.execution_batch_id
```

Current batch statuses:

```text
draft
approved
running
completed
completed_with_errors
failed
undone
```

Current batch fields:

```text
id
planning_session_id
status
summary_json
error_message
created_at
updated_at
approved_at
started_at
completed_at
```

Current action execution includes:

```text
execution_batch_id
```

## Current repository foundation

Existing helpers:

```text
insertExecutionBatch()
updateExecutionBatch()
getExecutionBatchById()
listExecutionBatches()
assignExecutionToBatch()
listExecutionsForBatch()
```

Important gap:

```text
insertActionExecution() currently does not insert execution_batch_id.
```

This means batch execution cannot rely on direct insertion into `action_executions.execution_batch_id` yet. The current workaround would be `assignExecutionToBatch()` after execution, but the cleaner Sprint 4 change is to support an optional `execution_batch_id` in `insertActionExecution()` and/or assign immediately after safe execution.

## Current route foundation

Existing action routes:

```text
POST /api/suggestions
GET /api/suggestions
POST /api/action-previews
POST /api/action-executions
POST /api/action-executions/:executionId/undo
GET /api/action-executions
GET /api/audit-log
GET /api/labels
```

Missing batch routes:

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
```

## Critical implementation rule

Batch execution must not duplicate filesystem mutation logic.

It must call the existing safe single-action executor:

```text
executeActionPreview(db, { previewId, approve: true, executionBatchId })
```

This preserves Sprint 3 guarantees:

```text
approval validation
preview validation
trash-state check
source/target preflight checks
recovery snapshot before mutation
action execution record
audit event
undo readiness
```

## Required small executor change

Add optional batch support to the safe single-action executor:

```text
executeActionPreview(db, {
  previewId,
  approve,
  executionBatchId = null
})
```

Then make the execution record include:

```text
execution_batch_id: executionBatchId
```

Also update `insertActionExecution()` to insert `execution_batch_id`.

This is preferred over running execution first and assigning the batch afterward because audit/replay and execution records remain consistent from creation time.

## Batch MVP policy decisions

These policy decisions are confirmed for the Sprint 4 local MVP slice.

### Batch creation source

```text
Selected preview IDs first.
Planning-session batch generation later.
```

### Batch approval

```text
Explicit approve = true is required.
Only draft batches can be approved.
Empty batches cannot be approved.
Batches with blocked previews cannot be approved.
```

### Execution order

```text
Preview creation order.
```

### Partial failure behavior

```text
Stop on first failed action.
```

### Automatic rollback

```text
No automatic rollback in local MVP.
Operator-approved undo only.
```

### Status transitions

```text
draft -> approved
approved -> running
running -> completed
running -> completed_with_errors
running -> failed
```

`undone` is reserved for a future batch-level undo workflow.

## Proposed batch summary JSON

For draft batch:

```json
{
  "preview_ids": [],
  "total_previews": 0,
  "ready_previews": 0,
  "blocked_previews": 0,
  "executed": 0,
  "failed": 0,
  "stopped_on_first_failure": true,
  "policy": {
    "execution_order": "preview_creation_order",
    "partial_failure": "stop_on_first_failure",
    "automatic_rollback": false
  }
}
```

For completed/failed batch, add:

```json
{
  "execution_ids": [],
  "failed_execution_id": null,
  "failed_preview_id": null,
  "error_message": null
}
```

## Proposed service

Create:

```text
services/api/src/executionBatches/executionBatchService.js
```

Suggested exports:

```text
createExecutionBatch(db, { previewIds, planningSessionId = null })
approveExecutionBatch(db, { batchId, approve })
runExecutionBatch(db, { batchId, approve })
getExecutionBatchDetail(db, batchId)
listExecutionBatchSummaries(db, filters)
```

## Proposed route file

Create:

```text
services/api/src/routes/executionBatches.routes.js
```

Routes:

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
```

Wire it in the server/router index the same way current route files are wired.

## Proposed audit events

Batch audit events:

```text
execution_batch.created
execution_batch.approved
execution_batch.started
execution_batch.completed
execution_batch.failed
execution_batch.completed_with_errors
```

Audit payload should include:

```text
batch id
planning_session_id
preview ids
execution ids
status
summary
error message where relevant
```

## Step-by-step implementation order

### Step 02 — Repository compatibility

- Add `execution_batch_id` support to `insertActionExecution()`.
- Add focused test to prove an action execution can store `execution_batch_id`.

### Step 03 — Batch service creation

- Create `executionBatchService.js`.
- Implement `createExecutionBatch()` from selected preview IDs.
- Validate preview IDs exist.
- Count ready/blocked previews.
- Store summary JSON.
- Audit `execution_batch.created`.
- Add service tests.

### Step 04 — Batch approval

- Implement `approveExecutionBatch()`.
- Require `approve = true`.
- Require status `draft`.
- Prevent empty batches.
- Prevent blocked preview approval.
- Set `approved_at`.
- Audit `execution_batch.approved`.
- Add tests.

### Step 05 — Batch runner

- Implement `runExecutionBatch()`.
- Require `approve = true`.
- Require status `approved`.
- Set status `running` and `started_at`.
- Execute preview IDs in creation order through `executeActionPreview()`.
- Pass `executionBatchId` into the safe executor.
- Stop on first failure.
- Set final status and summary.
- Audit start and final state.
- Add tests for success and first-failure stop behavior.

### Step 06 — Batch routes

- Add route file.
- Wire route file into app.
- Keep route handlers thin and service-driven.
- Add route smoke tests only if current project style supports it; otherwise service tests are enough for this sprint.

### Step 07 — Documentation and issue update

- Add dedicated batch workflow documentation.
- Update issue #17 with validation status.

## Risk controls

Do not change the existing single-action executor behavior except for optional `executionBatchId` support.

Do not add automatic rollback.

Do not continue after dangerous filesystem failure.

Do not bypass snapshot creation.

Do not bypass existing preview validation.

## Suggested immediate next step

Implement Step 02:

```text
Add optional execution_batch_id support to action execution insertion and safe executor.
```

Then run the full test suite and expect the existing 63 tests to remain green before adding batch service behavior.
