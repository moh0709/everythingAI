# MVP API Routes

## Purpose

This document lists the implemented local MVP API routes and the expected request shape for manual validation.

Current validation baseline:

```text
78 tests passing / 0 failing
Manual API smoke test passing
```

## Authentication

Protected routes require:

```text
Authorization: Bearer <API_TOKEN>
```

Local development token:

```text
replace-with-your-local-development-token
```

PowerShell setup:

```powershell
$TOKEN="replace-with-your-local-development-token"
$BASE="http://127.0.0.1:4100"
$HEADERS=@{ Authorization = "Bearer $TOKEN" }
```

## Health

### GET /health

No API token required.

```powershell
Invoke-RestMethod -Uri "$BASE/health"
```

Expected:

```text
status = ok
service = everythingai-api
```

## Indexing and extraction

### POST /api/index

Body:

```json
{
  "folderPath": "E:\\01PROJEKTER\\EverythingAI\\test-data",
  "auto": false
}
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "$BASE/api/index" -Headers $HEADERS -ContentType "application/json" -Body (@{ folderPath = $FOLDER; auto = $false } | ConvertTo-Json)
```

### POST /api/extract

Body:

```json
{
  "limit": 50
}
```

Optional:

```json
{
  "fileId": "...",
  "limit": 50
}
```

## Status and file listing

### GET /api/status

Returns system status counts for the local dashboard.

### GET /api/files

Query examples:

```text
/api/files?limit=20
/api/files?q=supplier&limit=20
/api/files?includeTrashed=true
```

Normal file listing hides active trash records by default.

## Search

### GET /api/search

Query examples:

```text
/api/search?q=supplier&limit=10
/api/search?q=supplier&limit=10&includeTrashed=true
```

Returns the stable local MVP SearchResult contract:

```text
id
filename
absolute_path
relative_path
extension
mime_type
size_bytes
modified_at
index_status
extraction_status
extraction_error_message
snippet
recovery_status
source_reference
```

### GET /api/semantic-search

Query examples:

```text
/api/semantic-search?q=supplier&limit=10
/api/semantic-search?q=supplier&limit=10&includeTrashed=true
```

Semantic search hides trashed files by default and includes them only when requested.

## Document context

### GET /api/intelligence/document-context/:fileId

Example:

```powershell
Invoke-RestMethod -Uri "$BASE/api/intelligence/document-context/$FileId" -Headers $HEADERS
```

Returns:

```text
file
previewText
insight
source_reference
```

This route was verified during Sprint 5 smoke testing after the HTTP route was exposed.

## Insights, knowledge, and duplicates

### POST /api/insights

Body:

```json
{
  "fileId": "...",
  "limit": 25,
  "useOllama": false
}
```

### GET /api/duplicates

Returns duplicate groups by content hash.

### GET /api/knowledge

Builds/returns local generated knowledge index.

### POST /api/knowledge/build

Body:

```json
{
  "limit": 500,
  "useOllama": false
}
```

## Suggestions and action previews

### POST /api/suggestions

Body:

```json
{
  "fileId": "..."
}
```

Creates preview-only organization suggestions.

### GET /api/suggestions

Query examples:

```text
/api/suggestions?fileId=<fileId>&limit=100
```

### POST /api/action-previews

Body:

```json
{
  "suggestionId": "..."
}
```

Creates a safe executable preview when validation passes.

## Action execution and undo

### POST /api/action-executions

Body:

```json
{
  "previewId": "...",
  "approve": true
}
```

Rules:

```text
approve=true required
preview must be executable
filesystem actions require safe source/target state
filesystem actions create recovery snapshot before mutation
failed execution is audited
```

### POST /api/action-executions/:executionId/undo

Body:

```json
{
  "approve": true
}
```

Rules:

```text
approve=true required
undo supported for filesystem actions
undo creates recovery snapshot before mutation
failed approved undo is audited
```

### GET /api/action-executions

Query examples:

```text
/api/action-executions?fileId=<fileId>&limit=20
```

## Execution batches

### POST /api/execution-batches

Body:

```json
{
  "previewIds": ["preview-id-1", "preview-id-2"],
  "planningSessionId": null
}
```

Behavior:

```text
creates draft batch
deduplicates preview IDs
counts ready and blocked previews
audits execution_batch.created
```

### GET /api/execution-batches

Query examples:

```text
/api/execution-batches?limit=100
/api/execution-batches?status=draft
/api/execution-batches?planningSessionId=<planningSessionId>
```

### GET /api/execution-batches/:batchId

Returns batch detail and linked action executions.

### POST /api/execution-batches/:batchId/approve

Body:

```json
{
  "approve": true
}
```

Rules:

```text
approve=true required
batch must be draft
blocked previews prevent approval
audit execution_batch.approved
```

### POST /api/execution-batches/:batchId/run

Body:

```json
{
  "approve": true
}
```

Rules:

```text
approve=true required
batch must be approved
sets running status
executes previews one by one through safe single-action executor
passes executionBatchId into every action execution
stops on first failure
sets completed, completed_with_errors, or failed
audits started and final status
```

## Audit and labels

### GET /api/audit-log

Query examples:

```text
/api/audit-log?limit=100
/api/audit-log?entityType=execution_batch&entityId=<batchId>&limit=20
```

### GET /api/labels

Query examples:

```text
/api/labels?fileId=<fileId>&limit=100
```

## Recovery trash

### GET /api/recovery/trash

Query examples:

```text
/api/recovery/trash
/api/recovery/trash?status=restored
```

### POST /api/recovery/trash

Body:

```json
{
  "fileId": "...",
  "approve": true
}
```

Rules:

```text
approve=true required
moves file into local recovery trash state
normal search/listing hides active trashed files
audit file.trashed
```

### POST /api/recovery/trash/:trashId/restore

Body:

```json
{
  "approve": true,
  "reason": "MVP smoke test restore"
}
```

Rules:

```text
approve=true required
restores file record from local recovery trash state
audit file.restored
```

### POST /api/recovery/trash/:trashId/purge

Body:

```json
{
  "requestedBy": "mvp-smoke-test"
}
```

Expected MVP result:

```text
403
code = purge_disabled_in_mvp
policy = NO_PERMANENT_PURGE_IN_LOCAL_MVP
```

Permanent purge is intentionally disabled in the local MVP.

## Watcher

### POST /api/watch

Body:

```json
{
  "folderPath": "E:\\01PROJEKTER\\EverythingAI\\test-data",
  "extract": true
}
```

### POST /api/unwatch

Body:

```json
{
  "folderPath": "E:\\01PROJEKTER\\EverythingAI\\test-data"
}
```

## Embeddings and chat

### POST /api/embeddings

Body:

```json
{
  "limit": 1000
}
```

Optional:

```json
{
  "fileId": "...",
  "limit": 1000
}
```

### POST /api/chat

Body:

```json
{
  "question": "Which files mention supplier contracts?"
}
```

Uses local retrieval and only calls Ollama when configured.

## Integrations

### POST /api/integrations/anythingllm/sync

Body:

```json
{
  "fileId": "...",
  "limit": 25
}
```

Optional AnythingLLM sync for extracted local file text.

## Route validation status

Manually smoke-tested in Sprint 5:

```text
/health
/api/index
/api/extract
/api/search
/api/intelligence/document-context/:fileId
/api/suggestions
/api/action-previews
/api/execution-batches
/api/execution-batches/:batchId/approve
/api/execution-batches/:batchId/run
/api/execution-batches/:batchId
/api/audit-log
/api/action-executions
/api/recovery/trash
/api/recovery/trash/:trashId/restore
/api/recovery/trash/:trashId/purge
```

Automated tests cover the deeper execution/recovery/search behavior.
