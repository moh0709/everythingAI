# Phase 4 — Execution Lifecycle & Safe Action Engine Plan

## Status

```text
PLANNED
PENDING IMPLEMENTATION
```

## Objective

Strengthen EverythingAI's execution lifecycle so user-approved file organization actions become safer, more auditable, more batch-aware, and better connected to planning sessions.

Phase 4 builds on:

```text
Phase 1 — ingestion/planning separation
Phase 2 — job orchestration foundation
Phase 3 — planning session foundation
```

---

# Phase 4 Scope

Phase 4 focuses on:

```text
- execution lifecycle audit
- execution batch model
- preview grouping by planning session
- approval batch foundation
- stronger execution audit metadata
- stale preview invalidation rules
- rollback group groundwork
- execution safety hardening
```

---

# Phase 4 Non-Goals

Phase 4 should NOT fully implement:

```text
- external queues/workers
- full frontend redesign
- multi-user permissions
- advanced AI planning
- distributed locking
- full enterprise approval workflow
```

---

# Permanent Rules Applied in Phase 4

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

```text
Planning sessions create suggestions only.
Suggestions create previews.
Previews require explicit approval before execution.
```

```text
No execution may happen automatically from watcher or ingestion.
```

```text
Batch execution must still require explicit approval.
```

---

# Phase 4 Step Breakdown

## Step 4.1 — Audit Current Execution Runtime

### Objective

Audit current preview/execution/undo runtime before making schema or runtime changes.

### Files to inspect

```text
services/api/src/previews/actionPreviewService.js
services/api/src/actions/actionExecutor.js
services/api/src/routes/actions.routes.js
services/api/src/db/schema.sql
services/api/src/db/client.js
services/api/src/suggestions/suggestionService.js
services/api/src/planning/planningSessionService.js
services/api/test/localMvp.test.js
services/api/test/planningSessions.test.js
```

### Deliverables

```text
- preview flow map
- execution flow map
- undo flow map
- DB dependency map
- batch model recommendation
- stale preview risk assessment
```

### Runtime changes

```text
None
```

---

## Step 4.2 — Define Execution Batch Contract

### Objective

Define the minimal execution batch model before schema changes.

### Candidate fields

```text
id
planning_session_id
status
summary_json
error_message
created_at
updated_at
approved_at
completed_at
```

### Candidate statuses

```text
draft
approved
running
completed
completed_with_errors
failed
undone
```

### Runtime changes

Documentation only.

---

## Step 4.3 — Add Execution Batch Schema

### Objective

Add safe DB support for execution batches and optional batch linkage.

### Candidate schema additions

```text
execution_batches
action_executions.execution_batch_id nullable
action_previews.execution_batch_id nullable optional/deferred
```

### Compatibility rule

Existing executions must continue working with `execution_batch_id = NULL`.

---

## Step 4.4 — Add Execution Batch Repository Helpers

### Objective

Add DB helpers for creating, updating, listing, and reading execution batches.

### Files likely affected

```text
services/api/src/db/client.js
```

Risk:

```text
MEDIUM
```

because the DB client is large and shared.

---

## Step 4.5 — Strengthen Preview Context

### Objective

Improve preview visibility and planning-session context without changing execution behavior.

### Target improvements

```text
- preview result includes planning_session_id when available
- list previews can include session/batch filters later
- preview remains non-executing
```

---

## Step 4.6 — Add Execution Batch Service Boundary

### Objective

Introduce a service that owns batch lifecycle orchestration.

### Target future file

```text
services/api/src/actions/executionBatchService.js
```

### Responsibilities

```text
- create batch from planning session suggestions/previews
- approve batch explicitly
- execute approved previews sequentially
- update batch summary
- preserve per-action audit records
```

---

## Step 4.7 — Add Execution Batch Routes

### Objective

Expose batch lifecycle endpoints.

### Target endpoints

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/execute
```

### Compatibility rule

Existing single-preview execution route must remain unchanged.

---

## Step 4.8 — Add Stale Preview Guardrails

### Objective

Prevent execution when source file state has changed since preview creation where practical.

### Candidate checks

```text
- source path still exists
- target path still safe
- preview still executable
- file absolute_path still matches preview source_path
```

Potential future checks:

```text
- content hash unchanged
- modified_at unchanged
```

Phase 4 should start with safe path-based checks to avoid overreaching.

---

## Step 4.9 — Add Regression Tests

### Objective

Protect execution lifecycle behavior.

Tests should verify:

```text
- legacy single-preview execution still works
- batch can be created from session suggestions/previews
- batch requires explicit approval before execution
- batch executes safe tag/category actions
- blocked previews are not executed
- stale preview/path mismatch is blocked
- execution records link to batch when batch-run
```

---

## Step 4.10 — Runtime Verification

### Objective

Verify Phase 4 runtime integration and compatibility.

Required local/CI command:

```bash
cd services/api
npm test
```

---

## Step 4.11 — Completion Due Diligence

### Objective

Close Phase 4 and verify readiness for the next phase.

Deliverable:

```text
docs/PHASE4_COMPLETION_DUE_DILIGENCE.md
```

---

# Proposed Implementation Order

```text
1. Step 4.1 Audit current execution runtime
2. Step 4.2 Define execution batch contract
3. Step 4.3 Add execution batch schema
4. Step 4.4 Add repository helpers
5. Step 4.5 Strengthen preview context
6. Step 4.6 Add execution batch service boundary
7. Step 4.7 Add execution batch routes
8. Step 4.8 Add stale preview guardrails
9. Step 4.9 Add regression tests
10. Step 4.10 Runtime verification
11. Step 4.11 Completion due diligence
```

---

# Phase 4 Risk Assessment

## Risk level

```text
HIGHER THAN PHASE 3
```

Reason:

```text
Phase 4 touches execution lifecycle and filesystem action safety.
```

## Required discipline

```text
- audit first
- contract second
- schema third
- service boundary before routes
- tests before closure
- no automatic execution
```

---

# Phase 4 Due Diligence

## Architecture consistency

```text
PASS
```

The plan follows Phase 0–3 boundaries.

## Execution safety

```text
PASS WITH HIGH WATCHPOINT
```

Execution remains approval-gated, but batch execution introduces higher risk.

## Compatibility safety

```text
PASS
```

Legacy single-preview execution remains unchanged.

## Filesystem safety

```text
PASS WITH HIGH WATCHPOINT
```

Filesystem actions require conservative guardrails.

## Recommendation

```text
Begin Step 4.1 audit before runtime changes.
```
