# MVP UI Validation Gaps

## Purpose

This document records the Sprint 5 browser/UI validation pass for the local MVP.

The goal is to document what the current browser UI can support and what remains API-only, without starting a broad frontend rebuild inside the validation sprint.

## Current baseline

```text
Backend local MVP: runnable through API
Automated tests: 78 passed / 0 failed
Manual API smoke test: passed
```

## Files inspected

```text
services/api/public/index.html
services/api/public/app.js
README.md
docs/MVP_API_ROUTES.md
docs/MVP_SMOKE_TEST_RUNBOOK.md
```

## UI areas present

The browser UI currently includes these main sections:

```text
Dashboard
Library
Organize Plan
Safe Actions
Knowledge
Ask
Settings
Provider Settings
```

## Validation checklist

### Can the user index/select a folder?

Status:

```text
Partially supported
```

Evidence:

```text
Dashboard has API token field, folder path field, Open Folder, Auto Index, Extract Text, Embeddings, and Auto Watch buttons.
app.js calls /api/index, /api/extract, /api/embeddings, /api/watch, and /api/select-folder.
```

Notes:

```text
Manual folder-path indexing is supported.
Native folder selection depends on /api/select-folder support and local environment behavior.
```

### Can the user search indexed files?

Status:

```text
Supported
```

Evidence:

```text
Global search calls /api/unified-search.
Semantic search calls /api/semantic-search.
Search results render files, suggestions, insights, labels, and executions.
```

### Can the user inspect document context?

Status:

```text
Partially supported
```

Evidence:

```text
Library cards have a Preview button.
app.js currently calls /api/files/:fileId/preview for file preview.
Sprint 5 API smoke test validated /api/intelligence/document-context/:fileId.
```

Gap:

```text
UI still uses the older /api/files/:fileId/preview route for preview display instead of the new documented /api/intelligence/document-context/:fileId route.
```

Recommendation:

```text
Either keep /api/files/:fileId/preview as compatibility route if implemented, or update the UI to use /api/intelligence/document-context/:fileId.
```

### Can the user generate suggestions?

Status:

```text
Supported
```

Evidence:

```text
Library Organize button calls /api/suggestions for a file.
Analyze Library / Generate From Library can create suggestions for visible files.
Plan view can refresh suggestions with /api/suggestions?limit=250.
```

### Can the user create previews?

Status:

```text
Supported
```

Evidence:

```text
Suggestion cards and plan actions include Preview Action buttons.
app.js calls /api/action-previews.
```

### Can the user execute individual actions?

Status:

```text
Supported for single-action execution
```

Evidence:

```text
After creating an action preview, app.js uses window.confirm() and then calls /api/action-executions with approve=true.
```

Notes:

```text
This supports single action execution, not grouped batch execution.
```

### Can the user create/approve/run batches?

Status:

```text
Not supported in current UI
```

Backend support exists:

```text
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
```

UI gap:

```text
No visible batch creation controls.
No selected-preview cart.
No batch approval button.
No batch run button.
No batch status/detail panel.
No batch audit/replay summary panel.
```

Impact:

```text
The backend MVP is runnable through API, but the batch workflow is API-only until UI controls are added.
```

### Can the user see execution/audit/recovery state?

Status:

```text
Partially supported
```

Evidence:

```text
Safe Actions view has Executions and Audit buttons.
app.js calls /api/action-executions and /api/audit-log and writes JSON into the Action Log panel.
```

Gaps:

```text
No dedicated recovery/trash UI.
No dedicated recovery snapshot UI.
No batch audit filter UI.
No structured audit table.
Action Log is raw JSON/preformatted text.
```

### Can the user undo or recover safely?

Status:

```text
Partially supported through API, not clearly supported through UI
```

Evidence:

```text
Backend supports /api/action-executions/:executionId/undo.
Backend supports /api/recovery/trash and restore routes.
```

UI gap:

```text
No visible Undo button on action execution rows.
No visible Trash button.
No visible Restore button.
No Recovery Center view.
```

## MVP decision

The current browser UI is enough for:

```text
basic local setup
folder indexing
file listing
search
suggestions
single action preview/execution
insight/knowledge views
raw audit/execution inspection
```

The current browser UI is not enough for a polished end-user MVP because these backend features remain API-only or raw:

```text
execution batch workflow
trash/restore workflow
undo workflow
recovery snapshot visibility
structured audit/replay view
```

## Does this block backend MVP status?

No.

The local backend MVP is runnable through API and manually smoke-tested.

## Does this block user-facing MVP status?

Yes, if the MVP is expected to be usable by non-developers through the browser UI.

## Recommended next sprint

```text
Sprint 6: MVP UI Workflow Completion
```

Recommended scope:

```text
Batch Queue / Batch Runner UI
Recovery Center UI
Undo buttons for filesystem executions
Structured Audit Log UI
Document Context route alignment
Smoke-test UI walkthrough
```

## Recommended UI priorities

### Priority 1 — Batch workflow UI

Add:

```text
select previews into batch
create batch button
batch detail panel
approve batch button
run batch button
batch status and execution summary
```

### Priority 2 — Recovery Center

Add:

```text
trash list
restore button
include trashed toggle
purge disabled explanation
retention metadata display
```

### Priority 3 — Undo controls

Add:

```text
Undo button for executed rename/move actions
explicit approval modal
undo result state
```

### Priority 4 — Audit/replay panel

Add:

```text
filter by entity type
filter by entity ID
batch audit view
recovery snapshot IDs where relevant
```

### Priority 5 — Document context route alignment

Update the UI preview call from:

```text
/api/files/:fileId/preview
```

to:

```text
/api/intelligence/document-context/:fileId
```

or intentionally document `/api/files/:fileId/preview` as a compatibility route if that route remains supported.

## Final UI validation status

```text
Backend MVP: runnable through API
Browser UI: partially supports MVP workflow
Main UI gap: execution batch and recovery workflows are not exposed as first-class UI controls
Recommended next sprint: Sprint 6 MVP UI Workflow Completion
```
