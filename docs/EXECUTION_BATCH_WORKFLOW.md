# Execution Batch Workflow

## Purpose

This document defines the Sprint 4 local MVP execution batch workflow.

Sprint 4 adds governed grouped execution on top of the Sprint 3 safe single-action execution path.

The batch workflow is intentionally small and conservative:

```text
selected action previews
→ create draft batch
→ approve batch explicitly
→ run approved batch explicitly
→ execute previews one by one through the existing safe executor
→ stop on first failure
→ write batch audit events
→ preserve single-action recovery snapshots and undo readiness
```

## Validation status

```text
78 tests passing / 0 failing
```

## Core rule

Batch execution must use the existing safe single-action executor:

```text
executeActionPreview(db, {
  previewId,
  approve: true,
  executionBatchId
})
```

This preserves the existing safety guarantees:

```text
preview validation
approval gate
trash-state checks
source/target preflight checks
recovery snapshot before filesystem mutation
action execution record
action audit event
undo readiness
```

## Routes

Execution batch routes:

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
```

All routes are under the authenticated `/api` namespace and require the API token middleware.

## Create batch

Route:

```text
POST /api/execution-batches
```

Body:

```json
{
  "previewIds": ["preview-id-1", "preview-id-2"],
  "planningSessionId": null
}
```

Behavior:

```text
requires at least one preview ID
rejects missing preview IDs
deduplicates preview IDs while preserving first-seen order
loads previews
validates preview state without executing anything
counts ready and blocked previews
stores summary JSON
creates batch with status draft
writes execution_batch.created audit event
```

The batch can be created even when one or more previews are blocked. This allows the UI/API to show a complete batch readiness summary before approval.

## Approve batch

Route:

```text
POST /api/execution-batches/:batchId/approve
```

Body:

```json
{
  "approve": true
}
```

Behavior:

```text
requires approve = true
requires batch to exist
requires batch status draft
requires at least one preview
rejects batches with blocked previews
sets status approved
sets approved_at
writes execution_batch.approved audit event
```

Denied approval paths:

```text
approve missing/false
missing batch
batch not draft
empty batch
batch contains blocked previews
```

Denied approval does not execute actions and does not mutate files.

## Run batch

Route:

```text
POST /api/execution-batches/:batchId/run
```

Body:

```json
{
  "approve": true
}
```

Behavior:

```text
requires approve = true
requires batch to exist
requires batch status approved
sets status running
sets started_at
writes execution_batch.started audit event
executes stored preview IDs in order
calls the safe single-action executor for each preview
passes executionBatchId to every action execution
stops on first failure
sets completed_at
sets final status
writes final batch audit event
```

## Execution order

The MVP uses:

```text
preview creation / first-seen order stored in summary.preview_ids
```

No dependency sorting is implemented in this MVP slice.

## Partial failure policy

The MVP policy is:

```text
stop on first failure
no automatic rollback
operator-approved undo only
```

This prevents a batch from continuing after a dangerous filesystem failure.

## Status transitions

Supported MVP transitions:

```text
draft -> approved
approved -> running
running -> completed
running -> completed_with_errors
running -> failed
```

Status meanings:

```text
draft: batch was created but not approved
approved: batch is approved and ready to run
running: batch execution has started
completed: all actions executed successfully
completed_with_errors: at least one action succeeded, then a later action failed
failed: first attempted action failed
undone: reserved for future batch-level undo workflow
```

## Summary JSON contract

Batch summary includes:

```json
{
  "preview_ids": [],
  "previews": [],
  "total_previews": 0,
  "ready_previews": 0,
  "blocked_previews": 0,
  "executed": 0,
  "failed": 0,
  "execution_ids": [],
  "failed_execution_id": null,
  "failed_preview_id": null,
  "error_message": null,
  "stopped_on_first_failure": true,
  "policy": {
    "execution_order": "preview_creation_order",
    "partial_failure": "stop_on_first_failure",
    "automatic_rollback": false
  }
}
```

Each preview summary includes:

```json
{
  "preview_id": "...",
  "file_id": "...",
  "action_type": "move",
  "preview_status": "ready",
  "can_execute": true,
  "validation_valid": true,
  "validation_reason": null,
  "risk_level": "low",
  "created_at": "..."
}
```

## Audit events

Batch audit events:

```text
execution_batch.created
execution_batch.approved
execution_batch.started
execution_batch.completed
execution_batch.completed_with_errors
execution_batch.failed
```

Audit payload includes:

```text
batch id
planning session id
status
summary
error message
approved_at
started_at
completed_at
```

Single-action audit events are still written by the safe action executor.

For filesystem actions, action audit still includes recovery snapshot references where applicable.

## Recovery and undo behavior

Batch execution does not add a separate batch-level rollback mechanism in the local MVP.

Instead:

```text
each filesystem action still creates its own recovery snapshot
each action execution is linked to the batch through execution_batch_id
each action can still be undone through the existing approval-gated undo flow
```

Automatic rollback is intentionally not implemented.

## Current limitations

Not implemented in this Sprint 4 MVP slice:

```text
batch-level undo endpoint
automatic rollback
planning-session-to-batch generation
dependency-aware execution order
parallel execution
frontend batch UI polish
```

These can be future enhancements after the local MVP smoke test.

## Test coverage

Relevant tests:

```text
services/api/test/executionBatchCompatibility.test.js
services/api/test/executionBatchService.test.js
```

Covered behavior:

```text
execution_batch_id compatibility
successful and failed executions linked to batch ID
batch creation from selected preview IDs
blocked preview counting
preview ID deduplication
batch listing/detail
batch creation audit
batch approval
approval denied paths
batch runner success
batch runner denied paths
batch partial failure stop behavior
batch started/completed/completed_with_errors audit events
```

## Final Sprint 4 backend status

```text
78 tests passing / 0 failing
```
