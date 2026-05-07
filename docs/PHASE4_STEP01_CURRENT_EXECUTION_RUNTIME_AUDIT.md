# Phase 4 — Step 4.1 Current Execution Runtime Audit

## Status

```text
COMPLETE
```

## Objective

Audit the current preview, execution, undo, route, and database runtime before introducing execution batches or stronger lifecycle rules.

This step is audit-only and does not modify runtime behavior.

---

# Files Audited

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

---

# Current Execution Lifecycle

Current lifecycle:

```text
Suggestion
  ↓
Action Preview
  ↓
Approved Execution
  ↓
Optional Undo
```

This is architecturally correct and should be preserved.

---

# Current Preview Flow

Current route:

```text
POST /api/action-previews
```

Current flow:

```text
actions.routes.js
  ↓
createActionPreview(db, { suggestionId })
  ↓
getOrganizationSuggestionById()
  ↓
resolveTargetPath()
  ↓
insertActionPreview()
```

---

# Current Preview Safety

Current preview generation already checks:

```text
- suggestion exists
- rename suggestion is filename-only
- move suggestion is safe folder name only
- target stays inside source directory boundary
- target path does not already exist
```

This is a good foundation.

---

# Current Preview Limitation

Preview records do not yet store:

```text
- planning_session_id
- source file content hash at preview time
- source modified timestamp at preview time
- stale/invalidated status
- execution_batch_id
```

This limits stale-preview detection and batch grouping.

---

# Current Execution Flow

Current route:

```text
POST /api/action-executions
```

Current flow:

```text
actions.routes.js
  ↓
executeActionPreview(db, { previewId, approve })
  ↓
getActionPreviewById()
  ↓
validate approval
  ↓
validate preview executable
  ↓
execute tag/category OR rename/move
  ↓
insertActionExecution()
  ↓
disableActionPreviewExecution()
  ↓
insertAuditLog()
```

---

# Current Execution Safety

Current execution already checks:

```text
- explicit approve=true is required
- preview must exist
- preview action type must be supported
- preview_status must be ready
- can_execute must be 1
- filesystem target must stay inside source directory boundary
- source file must still exist
- target path must not exist
```

This is a strong MVP safety baseline.

---

# Current Execution Limitation

Execution does not yet check:

```text
- indexed file absolute_path still matches preview source_path
- indexed file modified_at is unchanged from preview time
- indexed file content_hash is unchanged from preview time
- preview has not become stale because file was moved by another action
- preview belongs to an approved batch
```

Phase 4 should start with path-based stale guardrails before hash/timestamp guardrails.

---

# Current Undo Flow

Current route:

```text
POST /api/action-executions/:executionId/undo
```

Current flow:

```text
undoActionExecution(db, { executionId, approve })
  ↓
getActionExecutionById()
  ↓
validate approval
  ↓
validate execution status
  ↓
for move/rename: move file back
  ↓
update indexed file location
  ↓
mark execution undone
  ↓
insert audit log
```

---

# Current Undo Safety

Current undo already checks:

```text
- explicit approve=true is required
- execution exists
- execution status must be executed
- undo source path exists
- undo target path does not exist
```

This is a good foundation.

---

# Current Undo Limitation

Undo is currently per-execution only.

No batch/group undo model exists yet.

This is acceptable for current MVP but should be improved later.

---

# Current Database Model

Current execution-related tables:

```text
action_previews
action_executions
audit_log
file_labels
```

Current missing batch tables:

```text
execution_batches
execution_batch_items optional/future
```

Current missing linkage:

```text
action_executions.execution_batch_id
action_previews.execution_batch_id optional/deferred
```

---

# Current Route Model

Existing action routes are flat and single-item oriented:

```text
POST /api/action-previews
POST /api/action-executions
POST /api/action-executions/:executionId/undo
GET /api/action-executions
GET /api/audit-log
GET /api/labels
```

This should remain compatible.

Phase 4 should add new batch routes instead of replacing these.

---

# Recommended Phase 4 Strategy

## Preserve legacy single execution

Do not remove or replace:

```text
POST /api/action-executions
```

## Add execution batches separately

Add new model:

```text
execution_batches
```

Add new service:

```text
services/api/src/actions/executionBatchService.js
```

Add new routes:

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/execute
```

---

# Recommended Batch Model

Execution batch should represent a user-approved group of previews or planning-session suggestions.

Recommended minimal statuses:

```text
draft
approved
running
completed
completed_with_errors
failed
undone
```

Recommended initial scope:

```text
planning_session_id optional
preview_ids explicit list optional
```

---

# Recommended Stale Preview Guardrails

Phase 4 should start conservatively with path-based stale checks:

```text
- current indexed file absolute_path must match preview.source_path
- preview source_path must exist for filesystem actions
- preview target_path must not exist
- preview must still be executable
```

Future stronger checks:

```text
- source content_hash unchanged
- modified_at unchanged
```

These require storing preview-time hash/timestamp.

---

# Key Risk Assessment

## Highest risk

```text
batch filesystem execution
```

Reason:

```text
multiple actions can interact with paths and order matters
```

## Recommended mitigation

Start batch execution with safe actions first:

```text
tag
category
```

Then support rename/move once stale/path ordering protections are stronger.

---

# Phase 4 Implementation Recommendation

Proceed with:

```text
Step 4.2 — Define Execution Batch Contract
```

Before schema or runtime changes.

---

# Step 4.1 Due Diligence

## Architecture consistency

```text
PASS
```

Current lifecycle is compatible with batch introduction.

## Compatibility safety

```text
PASS
```

New batch routes can be additive.

## Execution safety

```text
PASS WITH WATCHPOINT
```

Existing execution is safe enough for MVP, but batch execution must be introduced conservatively.

## Main watchpoints

```text
- stale previews
- path changes after preview creation
- batch execution ordering
- batch rollback scope
```

## Runtime changes

```text
None
```

---

# Result

```text
Step 4.1 passes due diligence.
```

The project can proceed to:

```text
Step 4.2 — Define Execution Batch Contract
```
