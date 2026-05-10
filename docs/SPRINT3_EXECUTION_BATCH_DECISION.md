# Sprint 3 Execution Batch Decision

## Purpose

This document records the Sprint 3 decision on whether to implement execution batch consistency now or defer it to the next sprint.

## Current validation baseline

```text
63 tests passing / 0 failing
```

Sprint 3 has already hardened the critical single-action execution path:

```text
execution approval gates
failed execution audit
execution recovery snapshots
undo approval gates
undo failure audit
undo recovery snapshots
```

## Current batch foundation

The schema already includes:

```text
execution_batches
action_executions.execution_batch_id
```

The repository already includes helpers for:

```text
insertExecutionBatch()
updateExecutionBatch()
getExecutionBatchById()
listExecutionBatches()
assignExecutionToBatch()
listExecutionsForBatch()
```

## Current implementation gap

Batch execution is not wired into runtime yet.

Observed gaps:

```text
no route for creating execution batches
no route for approving execution batches
no route for running execution batches
single action execution does not assign execution_batch_id
insertActionExecution() currently does not insert execution_batch_id
no batch-level status transition service
no partial failure policy implemented
no batch-level audit/replay summary implemented
```

## Decision

Do not implement full grouped batch execution inside the current Sprint 3 recovery-hardening slice.

Reason:

```text
The critical safety path is already green for single action execution and undo.
Batch execution introduces a larger workflow surface: planning-session approval, multi-preview execution order, partial failure handling, batch rollback semantics, and batch-level audit/replay summaries.
```

Implementing batch execution now would increase scope and risk after the local MVP has reached a stable 63-test recovery-hardening baseline.

## Recommended next sprint

Create a dedicated sprint for batch execution if grouped plan execution becomes the next product priority.

Suggested title:

```text
Sprint 4: Execution Batch and Plan Approval Workflow
```

Suggested scope:

```text
batch creation from approved previews
batch approval gate
batch run endpoint
batch status transitions
partial failure policy
batch-level audit events
batch-level recovery summary
batch-level undo/rollback policy
```

## Minimum batch policy to define before coding

Before implementation, define these policy decisions:

### 1. Batch creation source

```text
Should a batch be created from a planning session, selected preview IDs, or both?
```

Recommended MVP answer:

```text
Selected preview IDs first; planning-session batch generation later.
```

### 2. Execution order

```text
Should actions run in preview creation order, risk order, file path order, or dependency order?
```

Recommended MVP answer:

```text
Preview creation order, with future dependency ordering added only when needed.
```

### 3. Partial failure behavior

```text
Should the batch stop on first failure or continue remaining actions?
```

Recommended MVP answer:

```text
Stop on first filesystem failure for safer local MVP behavior.
```

### 4. Rollback behavior

```text
Should a partial failure auto-undo already executed actions?
```

Recommended MVP answer:

```text
No automatic rollback in MVP. Provide rollback readiness and explicit operator-approved undo.
```

### 5. Batch status model

Existing statuses are:

```text
draft
approved
running
completed
completed_with_errors
failed
undone
```

Recommended MVP transitions:

```text
draft -> approved -> running -> completed
running -> completed_with_errors
running -> failed
completed/completed_with_errors -> undone
```

## Recommended close condition for Sprint 3

Sprint 3 can be closed when:

```text
Issue #16 is updated with this decision
Documentation acceptance is checked off
Local tests remain 63 passed / 0 failed
```

Execution batch implementation should continue in a new issue/sprint rather than being silently mixed into the recovery-hardening slice.
