# Sprint 3 Step 01 — Planning & Execution Runtime Audit

## Purpose

This audit records the current local MVP planning, preview, execution, undo, audit, and recovery-readiness behavior before changing Sprint 3 runtime logic.

Sprint 3 goal:

```text
planning session
→ generated suggestions
→ action preview
→ approval gate
→ execution batch/action
→ recovery snapshot/readiness
→ audit/replay evidence
→ undo/rollback readiness
```

Baseline before Sprint 3 implementation:

```text
47 tests passing / 0 failing
Sprint 1 recovery/trash complete
Sprint 2 search/source-reference hardening complete
```

## Files inspected

```text
services/api/src/routes/actions.routes.js
services/api/src/previews/actionPreviewService.js
services/api/src/actions/actionExecutor.js
services/api/src/services/previewValidationService.js
services/api/src/routes/planning.routes.js
services/api/src/planning/planningSessionService.js
services/api/src/db/schema.sql
services/api/src/db/repositories/executionRepository.js
```

## Current runtime behavior

### Planning sessions

Current planning routes:

```text
POST /api/planning/sessions
GET /api/planning/sessions
GET /api/planning/sessions/:sessionId
POST /api/planning/sessions/:sessionId/run
```

Current planning session statuses:

```text
draft
running
ready
failed
archived
```

Current behavior:

- Planning sessions can be created with mode, source, and settings.
- Planning sessions can run deterministically over all indexed files or selected file IDs.
- Running a planning session generates organization suggestions linked to the session.
- Planning session summary tracks analyzed files and suggestion counts.
- Planning failures update the session status to `failed`.

Current limitations:

- Planning sessions generate suggestions but do not directly create an execution batch.
- There is no explicit approve-plan endpoint yet.
- Planning does not yet simulate blast radius or recovery readiness before execution.

## Current suggestion and preview behavior

Current action preview route:

```text
POST /api/action-previews
```

Current supported preview action types:

```text
tag
category
rename
move
```

Current behavior:

- Suggestions are transformed into action previews.
- Rename previews require the suggestion to be a filename, not a path.
- Move previews require a safe folder name, not an absolute path and not a path with separators.
- Rename and move previews check whether the target would escape the source directory.
- Rename and move previews check whether the target already exists.
- Previews are created as either `ready` or `blocked`.
- Previews store `requires_approval = 1`.
- Preview validation rejects missing, stale, disabled, or blocked previews.

Current limitations:

- Preview creation is not currently recorded as a dedicated audit event.
- Preview records only support `ready` and `blocked` in the schema, while validation code also checks for `stale`.
- There is stale-preview detection code, but the schema should be reviewed before enabling `stale` status broadly.

## Current execution behavior

Current execution route:

```text
POST /api/action-executions
```

Current behavior:

- Execution requires `approve = true`.
- Execution loads an action preview by ID.
- Execution validates preview executability before running.
- Unsupported action types are rejected.
- Preview status must be `ready` or `approved` before execution.
- `tag` and `category` actions update app-level labels only.
- `rename` and `move` actions mutate the filesystem using `fs.rename`.
- Filesystem actions check:
  - source path exists
  - target path does not already exist
  - source and target are not identical
  - target does not escape the source directory boundary
- Successful execution inserts an `action_executions` record.
- Successful execution disables the preview from future execution.
- Successful execution writes an `action.executed` audit event.
- Failed execution attempts write an `action.failed` audit event.

Current limitations:

- Filesystem mutation does not yet create a separate recovery snapshot before mutation.
- Execution failure records are inserted only when a preview exists and action type is supported.
- There is no explicit check that the file is currently active rather than trashed before execution.
- There is no execution batch creation in the normal single-preview execution route.
- Execution batch schema and repository helpers exist, but they are not wired into normal execution flow yet.

## Current undo behavior

Current undo route:

```text
POST /api/action-executions/:executionId/undo
```

Current behavior:

- Undo requires `approve = true`.
- Undo only works for executions with status `executed`.
- Rename/move undo checks:
  - undo source path exists
  - undo target path does not already exist
- Rename/move undo mutates filesystem with `fs.rename`.
- Undo updates indexed file location back to the restored path.
- Undo marks the execution as `undone`.
- Undo writes an `action.undone` audit event.

Current limitations:

- Undo failure attempts are not currently audited.
- Undo does not create a separate recovery snapshot before mutation.
- Undo safety should explicitly validate path boundary in the same style as execution.
- App-level `tag` and `category` actions are marked undone but do not appear to reverse label/category state.

## Current execution batch foundation

Current schema includes:

```text
execution_batches
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

Repository helpers exist for:

```text
insertExecutionBatch()
updateExecutionBatch()
getExecutionBatchById()
listExecutionBatches()
assignExecutionToBatch()
listExecutionsForBatch()
```

Current limitations:

- There does not appear to be a route for creating, approving, running, or viewing execution batches.
- Single-preview execution does not assign executions to a batch by default.
- Batch status and partial failure rules are not yet enforced in runtime flow.

## Current audit behavior

Current audit events observed in execution flow:

```text
action.executed
action.failed
action.undone
```

Recovery/trash flow also has audit events from earlier completed work:

```text
file.trashed
file.restored
file.purge_blocked
```

Current limitations:

- Preview creation is not yet audited.
- Planning session lifecycle is not yet audited.
- Undo failure is not yet audited.
- Recovery snapshot creation does not exist yet, so snapshot/replay audit evidence is missing.

## Current recovery readiness gap

The biggest Sprint 3 gap is separate recovery snapshot readiness.

Existing execution records store undo paths:

```text
undo_source_path
undo_target_path
```

This is useful, but it is not the same as a recovery snapshot contract because it does not explicitly record:

```text
snapshot id
snapshot type
snapshot status
file id
preview id
execution id or future execution id
source path before mutation
target path before mutation
file metadata before mutation
content hash before mutation
created_at
used_at
error_message
```

## Recommended Sprint 3 implementation order

### Step 02 — Add recovery snapshot schema/service

Add a local MVP recovery snapshot table and service.

Suggested table:

```text
recovery_snapshots
```

Suggested fields:

```text
id
file_id
preview_id
execution_id
snapshot_type
status
source_path
target_path
metadata_json
created_at
used_at
error_message
```

Suggested statuses:

```text
created
used
failed
```

### Step 03 — Create snapshot before filesystem mutation

For `rename` and `move` actions:

```text
validate preview
create recovery snapshot
only then mutate filesystem
insert execution
mark snapshot used / link execution id
write audit event
```

Execution must fail safely if snapshot creation fails.

### Step 04 — Add denied execution tests

Tests should prove:

```text
execution without approval is rejected
blocked preview cannot execute
source missing creates failed execution + audit event
target exists creates failed execution + audit event
execution against active trashed file is rejected or explicitly policy-handled
```

### Step 05 — Add snapshot tests

Tests should prove:

```text
rename creates snapshot before mutation
move creates snapshot before mutation
snapshot has replay metadata
execution record links or can be correlated to snapshot
```

### Step 06 — Harden undo failure audit

Tests should prove:

```text
undo without approval is rejected
undo source missing is rejected and audited
undo target exists is rejected and audited
successful undo is audited
```

### Step 07 — Decide execution batch scope

Keep batch implementation narrow.

Recommended local MVP approach:

- Do not overbuild plan-level batch execution yet.
- First make single-preview execution recovery-safe.
- Then add batch route only if needed for the next product slice.

## Immediate next action

Implement Step 02:

```text
Add local recovery snapshot schema/service and tests without changing execution behavior yet.
```

This keeps the change small, testable, and safe.
