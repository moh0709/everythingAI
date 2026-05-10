# Execution Recovery Snapshots and Audit Rules

## Purpose

This document defines the local MVP rules for safe governed execution, recovery snapshots, undo readiness, and audit evidence.

It belongs to Sprint 3: Planning & Execution Recovery Hardening.

## Validation status

```text
63 tests passing / 0 failing
```

## Scope

These rules apply to local MVP action execution and undo behavior:

```text
POST /api/action-executions
POST /api/action-executions/:executionId/undo
```

Supported action types:

```text
tag
category
rename
move
```

Filesystem-mutating actions:

```text
rename
move
```

App-level metadata actions:

```text
tag
category
```

## Core governance rules

```text
No execution without explicit approval.
No blocked preview execution.
No filesystem mutation without recovery snapshot readiness.
No execution against active trashed files through normal execution flow.
No permanent delete.
No snapshot creation for denied filesystem execution paths.
No undo without explicit approval.
No undo filesystem mutation without undo recovery snapshot readiness.
```

## Recovery snapshot contract

Recovery snapshots are stored in:

```text
recovery_snapshots
```

Schema fields:

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

Snapshot types:

```text
execution_pre_mutation
undo_pre_mutation
```

Snapshot statuses:

```text
created
used
failed
```

`file_id` is a real indexed-file reference. `preview_id` and `execution_id` are correlation fields because a snapshot may be prepared before an execution record is finalized.

## Execution flow for rename/move

For filesystem-mutating actions, execution follows this order:

```text
1. Require approve = true
2. Load action preview
3. Validate preview
4. Check preview action type is supported
5. Check preview status is executable
6. Check file is not actively trashed
7. Check source path exists
8. Check target path does not exist
9. Create execution_pre_mutation recovery snapshot
10. Perform fs.rename()
11. Update indexed file location
12. Insert action execution record
13. Mark recovery snapshot used and link execution id
14. Disable preview execution
15. Write action.executed audit event with recovery_snapshot_id
```

## Execution flow for tag/category

For app-level metadata actions, execution follows this order:

```text
1. Require approve = true
2. Load action preview
3. Validate preview
4. Check preview action type is supported
5. Apply app-level label/category mutation
6. Insert action execution record
7. Disable preview execution
8. Write action.executed audit event
```

Tag/category actions do not create filesystem recovery snapshots because they do not mutate files on disk.

## Denied execution behavior

Denied execution paths are handled before filesystem mutation.

Covered denied paths:

```text
approve is false
preview is blocked
source file is missing
target path already exists
file is actively trashed
```

Rules:

```text
approve is false -> reject without execution record, audit, or snapshot
blocked preview -> reject before mutation, no snapshot
source missing -> failed execution + action.failed audit, no snapshot
target exists -> failed execution + action.failed audit, no snapshot
active trashed file -> failed execution + action.failed audit, no snapshot
```

## Undo flow for rename/move

For filesystem undo, the runtime follows this order:

```text
1. Require approve = true
2. Load execution record
3. Ensure execution status is executed
4. Ensure undo paths match original execution paths
5. Check undo source exists
6. Check undo target does not exist
7. Create undo_pre_mutation recovery snapshot
8. Perform fs.rename()
9. Update indexed file location
10. Mark action execution undone
11. Mark recovery snapshot used
12. Write action.undone audit event with recovery_snapshot_id
```

Undo path invariant:

```text
undo_source_path must equal original target_path
undo_target_path must equal original source_path
```

This allows a valid move undo back to the original folder while preventing unrelated path mutation.

## Denied undo behavior

Covered denied undo paths:

```text
approve is false
undo source is missing
undo target already exists
execution status is not executed
undo paths do not match original execution paths
```

Rules:

```text
approve is false -> reject without undo audit or snapshot
approved undo failure -> write action.undo_failed audit event
approved undo failure -> no undo snapshot is created
```

## Audit events

Execution and undo audit events:

```text
action.executed
action.failed
action.undone
action.undo_failed
```

Successful filesystem execution audit includes:

```text
recovery_snapshot_id
```

Successful filesystem undo audit includes:

```text
recovery_snapshot_id
```

Failed execution audit includes enough replay context to identify:

```text
execution id
preview id
file id
action type
source path
target path
error message
```

Failed undo audit includes enough replay context to identify:

```text
execution id
file id
action type
execution status
source path
target path
undo source path
undo target path
error message
```

## Test coverage

Relevant test files:

```text
services/api/test/recoverySnapshot.test.js
services/api/test/executionSnapshot.test.js
services/api/test/executionDeniedPaths.test.js
services/api/test/undoAuditSnapshot.test.js
```

Covered behavior:

```text
recovery snapshot creation/listing/status transitions
rename execution creates and uses recovery snapshot
move execution creates and uses recovery snapshot
tag/category do not create filesystem snapshots
execution without approval is rejected
blocked preview cannot execute
source missing creates failed execution + audit
target exists creates failed execution + audit
active trashed file execution is rejected + audited
successful undo creates and uses undo snapshot
successful undo audit includes recovery_snapshot_id
undo source missing is rejected and audited
undo target exists is rejected and audited
```

## Current limitations

Execution batch consistency is not completed in this slice.

Open items:

```text
batch route/service behavior
batch status transitions
partial failure status
batch-level audit/replay summary
```

These should be implemented only if the next product slice requires grouped plan execution.
