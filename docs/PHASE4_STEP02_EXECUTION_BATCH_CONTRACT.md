# Phase 4 — Step 4.2 Execution Batch Contract

## Status

```text
COMPLETE
```

## Objective

Define the minimal execution batch lifecycle contract before introducing schema changes or runtime batch orchestration.

This step is contract-only and introduces no runtime changes.

---

# Core Design Principle

Execution batches must remain:

```text
explicitly approved
fully auditable
incrementally adoptable
backward compatible
```

Execution batches must NOT:

```text
bypass previews
bypass approvals
execute automatically from planning
execute automatically from watcher
```

---

# Canonical Lifecycle

## Canonical flow

```text
Planning Session
  ↓
Suggestions
  ↓
Action Previews
  ↓
Execution Batch
  ↓
Approved Execution
  ↓
Optional Undo
```

This formally extends the Phase 3 lifecycle.

---

# Execution Batch Purpose

An execution batch represents:

```text
an explicit user-approved group of previews intended for coordinated execution
```

The batch is:

```text
- organizational
- audit-oriented
- execution-oriented
```

The batch is NOT:

```text
- a replacement for previews
- a replacement for executions
```

---

# Minimal Execution Batch Fields

## Proposed table

```text
execution_batches
```

## Proposed fields

```text
id
planning_session_id nullable
status
summary_json
error_message
created_at
updated_at
approved_at nullable
started_at nullable
completed_at nullable
```

---

# Field Definitions

## id

Unique execution batch identifier.

---

## planning_session_id nullable

Optional ownership linkage.

Allows:

```text
planning-session grouped execution
```

while preserving:

```text
manual/non-session execution batches
```

---

## status

Execution lifecycle state.

---

## summary_json

Aggregated batch metrics.

Candidate contents:

```text
- total previews
- total executed
- total failed
- total blocked
- total skipped
- total undone
```

---

## error_message

Top-level batch error summary.

Does NOT replace per-execution errors.

---

## approved_at

Timestamp for explicit approval.

---

## started_at

Timestamp for execution start.

---

## completed_at

Timestamp for execution completion.

---

# Execution Batch Statuses

## Proposed statuses

```text
draft
approved
running
completed
completed_with_errors
failed
undone
```

---

# Status Definitions

## draft

Batch exists but has not been approved.

Execution forbidden.

---

## approved

Explicit approval granted.

Execution allowed but not yet started.

---

## running

Batch execution currently active.

---

## completed

All executable previews completed successfully.

---

## completed_with_errors

Execution partially succeeded.

Some previews failed or were blocked.

---

## failed

Batch-level failure prevented execution lifecycle completion.

---

## undone

All reversible executions in the batch were undone.

Phase 4 only lays groundwork for this state.

---

# Preview Relationship Model

## Current reality

Previews already exist independently.

This should remain true.

---

# Recommended linkage strategy

## Phase 4 recommendation

Add:

```text
action_executions.execution_batch_id nullable
```

But DEFER:

```text
action_previews.execution_batch_id
```

Reason:

```text
previews should remain reusable and independently executable
```

This reduces coupling.

---

# Batch Creation Model

## Recommended creation source

Execution batches should initially be created from:

```text
explicit preview IDs
```

Optional later support:

```text
planning session auto-selection
```

But the canonical ownership remains:

```text
batch owns preview references
NOT raw suggestions
```

---

# Batch Approval Model

## Important rule

Approval must remain explicit.

Required:

```text
POST /api/execution-batches/:batchId/approve
```

Batch execution must fail when:

```text
status != approved
```

---

# Batch Execution Model

## Phase 4 strategy

Initial batch execution should support:

```text
tag
category
```

first.

Filesystem actions:

```text
rename
move
```

should initially remain more conservative.

---

# Recommended Execution Ordering

## Future-safe order

Recommended execution ordering:

```text
1. tag/category
2. rename
3. move
```

Reason:

```text
rename/move mutate filesystem state and paths
```

---

# Stale Preview Model

## Phase 4 initial stale rules

Execution should block when:

```text
- preview no longer executable
- indexed file path changed
- source file missing
- target already exists
```

Future stronger rules:

```text
- content hash mismatch
- modified timestamp mismatch
```

---

# Undo Model

## Phase 4 recommendation

Undo remains:

```text
per execution
```

Batch undo becomes:

```text
future orchestration layer
```

This avoids dangerous premature rollback complexity.

---

# Audit Model

## Required audit principle

Execution batches must augment auditability.

NOT replace:

```text
per-action audit records
```

Per-action audit remains canonical.

Batch audit becomes:

```text
group-level orchestration visibility
```

---

# Compatibility Requirements

## Permanent compatibility rule

This route MUST remain valid:

```text
POST /api/action-executions
```

Single-preview execution remains:

```text
first-class supported behavior
```

---

# Recommended Service Boundary

## Future service

```text
services/api/src/actions/executionBatchService.js
```

Responsibilities:

```text
- batch lifecycle
- approval lifecycle
- execution orchestration
- batch summaries
- execution grouping
- stale validation
```

NOT:

```text
raw filesystem execution
```

Filesystem execution remains delegated to:

```text
actionExecutor.js
```

Correct separation.

---

# Recommended Route Model

## Future routes

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/execute
```

These are additive.

Existing routes remain unchanged.

---

# Phase 4 Step 4.2 Due Diligence

## Architecture consistency

```text
PASS
```

Batch model preserves existing preview/execution lifecycle.

## Compatibility safety

```text
PASS
```

Legacy single-preview execution remains first-class.

## Filesystem safety

```text
PASS WITH WATCHPOINT
```

Filesystem mutations remain delegated to the existing executor.

## Rollback safety

```text
PASS
```

Rollback remains conservative and per-execution.

## Coupling safety

```text
PASS
```

Preview reuse preserved by avoiding mandatory preview-batch ownership.

---

# Result

```text
Step 4.2 passes due diligence.
```

The project can proceed to:

```text
Step 4.3 — Add Execution Batch Schema
```
