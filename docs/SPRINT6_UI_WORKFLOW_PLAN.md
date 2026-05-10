# Sprint 6 UI Workflow Plan

## Purpose

Sprint 6 completes the browser UI workflows needed to make the local MVP usable without relying on manual API calls.

Sprint 5 final decision:

```text
Backend/API MVP = PASS
Browser UI MVP = PARTIAL
```

This plan keeps changes incremental and avoids a broad UI redesign.

## Current baseline

```text
Backend local MVP: runnable through API
Automated tests: 78 passed / 0 failed
Manual API smoke test: passed
Browser UI: partial MVP support
```

## Files to change

Primary UI files:

```text
services/api/public/index.html
services/api/public/app.js
services/api/public/styles.css
```

Supporting docs:

```text
docs/MVP_UI_VALIDATION_GAPS.md
docs/MVP_API_ROUTES.md
docs/MVP_UI_SMOKE_TEST_RUNBOOK.md
README.md
```

## Governance rules

- Keep the existing UI layout and visual language.
- Do not start a broad frontend rewrite.
- Keep API calls aligned with implemented backend routes.
- Do not bypass `approve=true` requirements.
- Require explicit confirmation before sensitive actions.
- Do not enable permanent purge in the local MVP.
- Keep raw diagnostic JSON/log visibility while adding structured views.
- Make each implementation step independently testable.

## Step 01 — Plan and inspect current UI

Status:

```text
This document
```

Current UI capabilities found in Sprint 5:

```text
folder path setup
API token storage
indexing
extraction
search
semantic search
file listing
suggestions
action previews
single-action execution
insights/knowledge
raw audit/execution log views
provider settings
```

Current UI gaps:

```text
execution batch workflow is API-only
recovery workflow is API-only
undo workflow is not clearly exposed in UI
recovery snapshot visibility is missing
audit/replay view is raw JSON
file preview uses older /api/files/:fileId/preview route
```

## Step 02 — Document Context route alignment

Goal:

```text
Make the Library Preview button use the current document context route.
```

Change:

```text
services/api/public/app.js
```

Replace preview call:

```text
GET /api/files/:fileId/preview
```

with:

```text
GET /api/intelligence/document-context/:fileId
```

Display:

```text
filename
absolute path
recovery status
index status
extraction status
source reference
insight summary if available
preview text
```

Acceptance:

```text
Clicking Preview in Library opens document context in Ask/Source Context area.
No backend route mismatch remains.
```

## Step 03 — Preview cart foundation

Goal:

```text
Allow user to create action previews and collect ready previews for batch execution.
```

Changes:

```text
services/api/public/index.html
services/api/public/app.js
services/api/public/styles.css
```

Add state:

```text
selectedPreviews: []
currentBatch: null
```

Add UI panel in Safe Actions:

```text
Selected Previews / Batch Queue
Create Batch
Clear Selection
```

Adjust preview behavior:

```text
Preview Action creates preview.
If preview is ready, show options:
- Execute Now
- Add to Batch
```

Keep existing single-action execution available.

Acceptance:

```text
User can create previews without executing immediately.
User can add ready previews to a visible batch queue.
Blocked previews show reason and are not added as executable batch items.
```

## Step 04 — Batch create/approve/run UI

Goal:

```text
Expose Sprint 4 batch workflow in browser UI.
```

Backend routes:

```text
POST /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
```

UI actions:

```text
Create Batch from selected preview IDs
Approve Batch
Run Batch
Refresh Batch Detail
```

Display:

```text
batch id
status
total previews
ready previews
blocked previews
executed count
failed count
started/completed timestamps
linked executions
error message
```

Acceptance:

```text
User can create, approve, and run a batch from the UI.
Batch results are visible after run.
```

## Step 05 — Recovery Center UI

Goal:

```text
Expose recovery records and restore workflow in browser UI.
```

Backend routes:

```text
GET /api/recovery/trash
POST /api/recovery/trash/:trashId/restore
POST /api/recovery/trash/:trashId/purge
```

UI options:

```text
Add Recovery view in sidebar
List recovery records
Filter active/restored if simple
Restore button with confirmation
Show retention_until
Show permanent purge disabled policy
```

Acceptance:

```text
User can see recovery records and restore eligible records from the UI.
UI explains that permanent purge is disabled in local MVP.
```

## Step 06 — Undo UI for filesystem executions

Goal:

```text
Expose undo for eligible filesystem actions.
```

Backend route:

```text
POST /api/action-executions/:executionId/undo
```

UI changes:

```text
Render action executions in structured cards/table.
Show Undo button only for executed move/rename actions.
Require confirmation before undo.
Refresh executions after undo.
Log result clearly.
```

Acceptance:

```text
User can undo eligible filesystem execution from UI.
Unsupported app-level actions do not show misleading undo button.
```

## Step 07 — Structured Audit Log UI

Goal:

```text
Make audit logs easier to inspect without removing raw JSON diagnostics.
```

Backend route:

```text
GET /api/audit-log
```

UI changes:

```text
Add audit filters: entity type and entity ID.
Render audit entries as cards/table.
Keep raw JSON in Action Log.
```

Acceptance:

```text
User can inspect batch audit, recovery audit, and action audit from UI.
```

## Step 08 — UI smoke test runbook

Goal:

```text
Create a browser-based smoke test for Sprint 6.
```

File:

```text
docs/MVP_UI_SMOKE_TEST_RUNBOOK.md
```

Validate:

```text
start API
open UI
save token/folder
index test folder
search file
open document context
create suggestions
create previews
add previews to batch
create batch
approve batch
run batch
inspect batch result
inspect audit
inspect recovery records
restore where applicable
undo filesystem action where applicable
```

## Step 09 — Final validation

Acceptance:

```text
npm test passes
UI smoke runbook exists
Sprint 5 UI gaps are closed or explicitly deferred
README updated if needed
Issue #19 updated and closed
```

## Implementation order

Recommended sequence:

```text
1. Document Context route alignment
2. Preview cart foundation
3. Batch create/approve/run UI
4. Structured execution list + undo buttons
5. Recovery Center UI
6. Structured audit log UI
7. UI smoke-test runbook
8. final validation and issue close
```

## Deferrals allowed

These can be deferred if needed:

```text
advanced filtering
visual redesign
batch-level undo
automatic rollback
recovery snapshot explorer
frontend framework migration
```

## Final Sprint 6 target

```text
Browser UI can run the main MVP workflow without manual API calls.
Backend approval and recovery safety rules remain unchanged.
```
