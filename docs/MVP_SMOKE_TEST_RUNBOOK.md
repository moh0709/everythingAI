# MVP Smoke Test Runbook

## Purpose

Validate that the local EverythingAI backend MVP is practically runnable through the API.

Current baseline:

```text
Sprint 1 complete
Sprint 2 complete
Sprint 3 complete
Sprint 4 complete
Local tests: 78 passed / 0 failed
```

## Safety

Use only a safe disposable test folder:

```powershell
E:\01PROJEKTER\EverythingAI\test-data
```

Do not run this against real customer folders, Downloads, Desktop, Documents, network drives, or shared company folders.

## Terminal 1 — start API

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm install
npm test
npm start
```

Expected:

```text
EverythingAI API listening on port 4100
```

## Terminal 2 — setup

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
$TOKEN="replace-with-your-local-development-token"
$FOLDER="E:\01PROJEKTER\EverythingAI\test-data"
$BASE="http://127.0.0.1:4100"
$HEADERS=@{ Authorization = "Bearer $TOKEN" }

New-Item -ItemType Directory -Force -Path "$FOLDER\smoke-mvp" | Out-Null
Set-Content -Path "$FOLDER\smoke-mvp\MVP_Smoke_Manual.txt" -Value "EverythingAI MVP smoke test document. Supplier contract. Batch approval validation. Recovery trash restore validation."
```

## 1 — health

```powershell
Invoke-RestMethod -Uri "$BASE/health"
```

Expected: `status = ok`.

## 2 — index

```powershell
$Index = Invoke-RestMethod -Method Post -Uri "$BASE/api/index" -Headers $HEADERS -ContentType "application/json" -Body (@{ folderPath = $FOLDER; auto = $false } | ConvertTo-Json)
$Index
```

Expected: `indexed > 0`.

## 3 — extract

```powershell
$Extract = Invoke-RestMethod -Method Post -Uri "$BASE/api/extract" -Headers $HEADERS -ContentType "application/json" -Body (@{ limit = 50 } | ConvertTo-Json)
$Extract
```

Expected: `extracted >= 1`. Unsupported files are acceptable when explicitly reported.

## 4 — search

```powershell
$Search = Invoke-RestMethod -Uri "$BASE/api/search?q=supplier&limit=10" -Headers $HEADERS
$Search.results | Select-Object id, filename, absolute_path, snippet, recovery_status
$FileId = $Search.results[0].id
```

Expected: at least one active result.

## 5 — document context

```powershell
$Context = Invoke-RestMethod -Uri "$BASE/api/intelligence/document-context/$FileId" -Headers $HEADERS
$Context.document | Format-List
```

Expected: document metadata, source reference, and clear file state.

## 6 — suggestions

```powershell
$Suggestions = Invoke-RestMethod -Method Post -Uri "$BASE/api/suggestions" -Headers $HEADERS -ContentType "application/json" -Body (@{ fileId = $FileId } | ConvertTo-Json)
$Suggestions.suggestions | Select-Object id, action_type, suggested_value, risk_level
```

Expected: at least one suggestion.

## 7 — previews

```powershell
$SuggestionIds = $Suggestions.suggestions | Select-Object -First 2 -ExpandProperty id
$Previews = @()
foreach ($SuggestionId in $SuggestionIds) {
  $Preview = Invoke-RestMethod -Method Post -Uri "$BASE/api/action-previews" -Headers $HEADERS -ContentType "application/json" -Body (@{ suggestionId = $SuggestionId } | ConvertTo-Json)
  $Previews += $Preview.preview
}
$Previews | Select-Object id, action_type, preview_status, can_execute, blocked_reason, source_path, target_path
```

Expected: executable previews show `preview_status = ready` and `can_execute = 1`.

## 8 — batch create

```powershell
$ReadyPreviewIds = $Previews | Where-Object { $_.can_execute -eq 1 -and $_.preview_status -eq "ready" } | Select-Object -ExpandProperty id
$Batch = Invoke-RestMethod -Method Post -Uri "$BASE/api/execution-batches" -Headers $HEADERS -ContentType "application/json" -Body (@{ previewIds = @($ReadyPreviewIds) } | ConvertTo-Json)
$Batch.batch | Format-List id, status, approved_at, started_at, completed_at
$Batch.batch.summary | Format-List
$BatchId = $Batch.batch.id
```

Expected: `status = draft` and `blocked_previews = 0`.

## 9 — batch approve

```powershell
$ApprovedBatch = Invoke-RestMethod -Method Post -Uri "$BASE/api/execution-batches/$BatchId/approve" -Headers $HEADERS -ContentType "application/json" -Body (@{ approve = $true } | ConvertTo-Json)
$ApprovedBatch.batch | Format-List id, status, approved_at
```

Expected: `status = approved`.

## 10 — batch run

```powershell
$RunBatch = Invoke-RestMethod -Method Post -Uri "$BASE/api/execution-batches/$BatchId/run" -Headers $HEADERS -ContentType "application/json" -Body (@{ approve = $true } | ConvertTo-Json)
$RunBatch.batch | Format-List id, status, started_at, completed_at, error_message
$RunBatch.batch.summary | Format-List
```

Expected success: `status = completed`, `executed >= 1`, `failed = 0`.

Acceptable partial failure: `completed_with_errors` or `failed` with explicit `error_message`.

## 11 — batch detail and audit

```powershell
$BatchDetail = Invoke-RestMethod -Uri "$BASE/api/execution-batches/$BatchId" -Headers $HEADERS
$BatchDetail.batch.executions | Select-Object id, execution_batch_id, action_type, status, source_path, target_path, error_message

$BatchAudit = Invoke-RestMethod -Uri "$BASE/api/audit-log?entityType=execution_batch&entityId=$BatchId&limit=20" -Headers $HEADERS
$BatchAudit.events | Select-Object event_type, entity_type, entity_id, created_at
```

Expected:

```text
execution_batch.created
execution_batch.approved
execution_batch.started
execution_batch.completed
```

Partial failure may produce `execution_batch.completed_with_errors` or `execution_batch.failed`.

## 12 — action executions and optional undo

```powershell
$Executions = Invoke-RestMethod -Uri "$BASE/api/action-executions?fileId=$FileId&limit=20" -Headers $HEADERS
$Executions.executions | Select-Object id, execution_batch_id, action_type, status, source_path, target_path

$FsExecution = $Executions.executions | Where-Object { $_.action_type -in @("move", "rename") -and $_.status -eq "executed" } | Select-Object -First 1
$FsExecutionId = $FsExecution.id

if ($FsExecutionId) {
  $Undo = Invoke-RestMethod -Method Post -Uri "$BASE/api/action-executions/$FsExecutionId/undo" -Headers $HEADERS -ContentType "application/json" -Body (@{ approve = $true } | ConvertTo-Json)
  $Undo.execution | Format-List id, status, undone_at
}
```

Expected: batch-run actions have `execution_batch_id = $BatchId`; undo returns `status = undone` when a filesystem action exists.

## 13 — trash and restore

```powershell
$SearchBeforeTrash = Invoke-RestMethod -Uri "$BASE/api/search?q=supplier&limit=10" -Headers $HEADERS
$TrashFileId = $SearchBeforeTrash.results[0].id

$Trash = Invoke-RestMethod -Method Post -Uri "$BASE/api/recovery/trash" -Headers $HEADERS -ContentType "application/json" -Body (@{ fileId = $TrashFileId; approve = $true } | ConvertTo-Json)
$Trash.trashRecord | Format-List id, file_id, status, original_absolute_path, retention_until
$TrashId = $Trash.trashRecord.id

$SearchAfterTrash = Invoke-RestMethod -Uri "$BASE/api/search?q=supplier&limit=10" -Headers $HEADERS
$SearchAfterTrash.results | Select-Object id, filename, recovery_status

$SearchWithTrash = Invoke-RestMethod -Uri "$BASE/api/search?q=supplier&limit=10&includeTrashed=true" -Headers $HEADERS
$SearchWithTrash.results | Select-Object id, filename, recovery_status

$Restore = Invoke-RestMethod -Method Post -Uri "$BASE/api/recovery/trash/$TrashId/restore" -Headers $HEADERS -ContentType "application/json" -Body (@{ approve = $true; reason = "MVP smoke test restore" } | ConvertTo-Json)
$Restore.trashRecord | Format-List id, file_id, status, restored_at, restore_reason
```

Expected:

```text
normal search hides trashed file
includeTrashed shows recovery_status = trashed
restore returns status = restored
```

## 14 — final search and purge denial

```powershell
$SearchAfterRestore = Invoke-RestMethod -Uri "$BASE/api/search?q=supplier&limit=10" -Headers $HEADERS
$SearchAfterRestore.results | Select-Object id, filename, recovery_status

$PurgeResult = try {
  Invoke-RestMethod -Method Post -Uri "$BASE/api/recovery/trash/$TrashId/purge" -Headers $HEADERS -ContentType "application/json" -Body (@{ requestedBy = "mvp-smoke-test" } | ConvertTo-Json)
} catch {
  $_.ErrorDetails.Message
}
$PurgeResult
```

Expected:

```text
restored file is visible again
purge_disabled_in_mvp
NO_PERMANENT_PURGE_IN_LOCAL_MVP
```

## Pass criteria

```text
health returns ok
index finds safe test files
extract processes readable content
search returns active results
document context opens
suggestions are generated
previews are created
batch is created as draft
batch is approved explicitly
batch runs through safe executor
batch audit events exist
action executions are linked to batch ID
filesystem undo works when applicable
trash hides file from normal search
includeTrashed shows trashed file
restore returns file to active search
purge remains blocked
```

## Fail criteria

```text
API cannot start
health fails
indexing safe folder fails completely
batch approval bypasses approve=true
batch run bypasses approve=true
batch run does not link execution_batch_id
filesystem action mutates without execution record
trash file still appears in normal search
restore does not return file to active search
purge is allowed
```
