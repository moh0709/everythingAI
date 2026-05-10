# EverythingAI / EverythingApp

EverythingAI is the project foundation for **EverythingApp**: a local-first AI-powered file brain inspired by the speed of Everything search and expanded with document understanding, semantic search, AI chat, knowledge-base generation, and safe file organization.

## One-sentence definition

**EverythingApp is a local AI-powered file brain that indexes full drives, understands file and document contents, remembers filenames and paths, answers questions with source references, generates Wikipedia-style knowledge pages, and safely suggests or performs file organization such as tagging, renaming, and moving files.**

## Current focus

The current objective is to finalize and optimize the **local MVP** in `services/api` before moving to the full production platform architecture.

The local MVP should become stable, safe, boring, and reliable before adding more advanced production-platform features.

## Current local MVP status

```text
Backend local MVP: runnable through API
Automated tests: 78 passed / 0 failed
Manual API smoke test: passed
```

Completed backend hardening:

```text
Sprint 1: recovery/trash smoke path
Sprint 2: search/source-reference hardening
Sprint 3: execution recovery hardening
Sprint 4: execution batch and plan approval workflow
Sprint 5: smoke-test runbook and manual API smoke test started
```

The local MVP currently supports:

- Local folder indexing
- Document extraction
- Keyword search and source references
- Document context
- Suggestions and action previews
- Approval-gated action execution
- Recovery snapshots for filesystem mutation
- Approval-gated undo for supported filesystem actions
- Local trash/restore behavior
- Permanent purge blocking
- Execution batches with approval and audit
- Manual API smoke-test validation

## Enterprise platform direction

The production target is a **Governed Enterprise Cognitive Workspace**: a trusted enterprise knowledge operating environment where files are ingested, understood, organized, searched, governed, recovered, measured, and continuously improved.

The enterprise platform direction adds:

- Admin-controlled page, capability, workspace, knowledge-area, and AI-agent permissions
- Internal governed file ecosystem with Reference Mode, Copy Mode, and later Managed Mode
- Search & Explore as the primary wiki-style knowledge base
- Planning Center for AI-generated organization proposals and simulations
- Governed Execution with approval, replay, recovery snapshots, and audit lineage
- Recovery Center with trashbin, restore, rollback, and 30-day default retention
- Operations Center with user tickets, AI-generated tickets, health signals, and improvement proposals
- Stats & Insights with KPIs, health scoring, and measurable enterprise value
- Apple-style calm enterprise UX with trust indicators and source references

## Strategic direction

The recommended strategy is to evaluate and potentially fork **AnythingLLM** as the base product, then expand it with the missing filesystem intelligence layer.

AnythingLLM already covers much of the foundation:

- Document ingestion
- RAG/chat with documents
- Workspaces
- Local/cloud LLM support
- Ollama support
- Agents
- API access
- Desktop/self-hosted deployment

EverythingApp adds the unique product layer:

- Full-drive indexing
- File metadata database
- File watcher and sync engine
- Filename/path intelligence
- Safe AI-based file organization
- Preview-before-action workflow
- Undo and audit log
- Wiki-style generated knowledge pages
- Entity and relationship extraction

## Documentation

See the `/docs` folder.

### Current local MVP documentation

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
- [`PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- [`TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
- [`ANYTHINGLLM_FORK_STRATEGY.md`](docs/ANYTHINGLLM_FORK_STRATEGY.md)
- [`MODULE_CHECKLIST.md`](docs/MODULE_CHECKLIST.md)
- [`AI_ORGANIZATION_ENGINE.md`](docs/AI_ORGANIZATION_ENGINE.md)
- [`DATA_MODEL.md`](docs/DATA_MODEL.md)
- [`SECURITY_AND_FILE_SAFETY.md`](docs/SECURITY_AND_FILE_SAFETY.md)
- [`MVP_SCOPE.md`](docs/MVP_SCOPE.md)
- [`ROADMAP.md`](docs/ROADMAP.md)
- [`LOCAL_MVP_VS_CENTRAL_PLATFORM.md`](docs/LOCAL_MVP_VS_CENTRAL_PLATFORM.md)
- [`MVP_FINALIZATION_PLAN.md`](docs/MVP_FINALIZATION_PLAN.md)
- [`KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)
- [`WINDOWS_LOCAL_SMOKE_TEST.md`](docs/WINDOWS_LOCAL_SMOKE_TEST.md)
- [`UNIFIED_SEARCH_VISIBILITY.md`](docs/UNIFIED_SEARCH_VISIBILITY.md)
- [`EXECUTION_RECOVERY_SNAPSHOTS_AND_AUDIT.md`](docs/EXECUTION_RECOVERY_SNAPSHOTS_AND_AUDIT.md)
- [`SPRINT3_EXECUTION_BATCH_DECISION.md`](docs/SPRINT3_EXECUTION_BATCH_DECISION.md)
- [`SPRINT4_STEP01_BATCH_WORKFLOW_AUDIT_PLAN.md`](docs/SPRINT4_STEP01_BATCH_WORKFLOW_AUDIT_PLAN.md)
- [`EXECUTION_BATCH_WORKFLOW.md`](docs/EXECUTION_BATCH_WORKFLOW.md)
- [`MVP_SMOKE_TEST_RUNBOOK.md`](docs/MVP_SMOKE_TEST_RUNBOOK.md)
- [`MVP_API_ROUTES.md`](docs/MVP_API_ROUTES.md)

### Enterprise workspace documentation

- [`ENTERPRISE_WORKSPACE_PRD.md`](docs/ENTERPRISE_WORKSPACE_PRD.md)
- [`ENTERPRISE_TECHNICAL_ARCHITECTURE.md`](docs/ENTERPRISE_TECHNICAL_ARCHITECTURE.md)
- [`ENTERPRISE_DEPLOYMENT_INFRASTRUCTURE.md`](docs/ENTERPRISE_DEPLOYMENT_INFRASTRUCTURE.md)
- [`ENTERPRISE_SECURITY_GOVERNANCE_HARDENING.md`](docs/ENTERPRISE_SECURITY_GOVERNANCE_HARDENING.md)
- [`ENTERPRISE_SCHEMA_CONTRACTS.md`](docs/ENTERPRISE_SCHEMA_CONTRACTS.md)
- [`ENTERPRISE_API_CONTRACTS.md`](docs/ENTERPRISE_API_CONTRACTS.md)
- [`ENTERPRISE_TESTING_VALIDATION.md`](docs/ENTERPRISE_TESTING_VALIDATION.md)
- [`ENTERPRISE_UX_SPEC.md`](docs/ENTERPRISE_UX_SPEC.md)
- [`ENTERPRISE_ACCESS_CONTROL.md`](docs/ENTERPRISE_ACCESS_CONTROL.md)
- [`INTERNAL_FILE_ECOSYSTEM.md`](docs/INTERNAL_FILE_ECOSYSTEM.md)
- [`SEARCH_EXPLORE_WIKI.md`](docs/SEARCH_EXPLORE_WIKI.md)
- [`PLANNING_EXECUTION_RECOVERY.md`](docs/PLANNING_EXECUTION_RECOVERY.md)
- [`OPERATIONS_INSIGHTS_TICKETS.md`](docs/OPERATIONS_INSIGHTS_TICKETS.md)
- [`MVP_LAUNCH_GATE.md`](docs/MVP_LAUNCH_GATE.md)
- [`IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md)
- [`AI_CODING_AGENT_IMPLEMENTATION_PROMPT.md`](docs/AI_CODING_AGENT_IMPLEMENTATION_PROMPT.md)
- [`ADR-005-013_GOVERNANCE_SESSION_HANDOVER_CONTINUITY.md`](docs/ADR-005-013_GOVERNANCE_SESSION_HANDOVER_CONTINUITY.md)
- [`GOVERNANCE_HANDOVER_TEMPLATE.md`](docs/GOVERNANCE_HANDOVER_TEMPLATE.md)

## Initial stack recommendation

```text
Frontend: React + TypeScript + Tauri/Desktop shell
Base product candidate: AnythingLLM fork
Backend: Node.js from AnythingLLM + optional Python FastAPI services for indexing/parsing
Database: PostgreSQL + pgvector
Keyword search: Meilisearch or OpenSearch
Document parsing: Apache Tika / Docling / Unstructured
OCR: Tesseract
LLM runtime: Ollama
Embeddings: nomic-embed-text or BGE models
File actions: custom safe executor with preview, approval, audit log, and undo
```

## Local file brain MVP

The runnable MVP lives in `services/api`. It scans a local folder, reads file metadata, computes SHA-256 content hashes, extracts document text, searches metadata/content with SQLite FTS, answers through local Ollama when configured, generates insights, finds duplicates, watches folders, and safely organizes files after preview and approval.

File move/rename execution is available only through an explicit approved action preview. Delete actions are not implemented. The local MVP includes governed recovery metadata: files can be moved to a local trash state, hidden from normal list/search results, restored, and audited. Permanent purge is explicitly blocked in the MVP.

### Install

```bash
cd services/api
npm install
```

### Run the local API

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm start
```

Open:

```text
http://127.0.0.1:4100
```

The default local development token is:

```text
replace-with-your-local-development-token
```

Use it as:

```text
Authorization: Bearer replace-with-your-local-development-token
```

### Test

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

Current local MVP validation status:

```text
78 tests passing / 0 failing
Manual API smoke test passing
```

### Local MVP optimization environment variables

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
```

Recommended for first local tests:

```powershell
$env:EVERYTHINGAI_MAX_FILE_SIZE_BYTES="262144000"
$env:EVERYTHINGAI_EXCLUDE_NAMES="node_modules,.git,dist,build"
$env:EVERYTHINGAI_EXCLUDE_EXTENSIONS=".exe,.dll,.iso,.zip"
$env:EVERYTHINGAI_WATCH_DEBOUNCE_MS="1000"
```

### Manual MVP smoke test

Use:

```text
docs/MVP_SMOKE_TEST_RUNBOOK.md
```

The smoke test validates:

```text
health
index
extract
search
document context
suggestions
previews
batch create/approve/run
batch audit
action execution linkage
trash/restore
purge denial
```

### Index a folder

```bash
npm run index -- "C:\path\to\test-folder"
```

By default, the SQLite database is written to `services/api/data/everythingai.sqlite`.

To choose a database path:

```bash
npm run index -- "C:\path\to\test-folder" -- --db "C:\path\to\everythingai.sqlite"
```

The scanner skips symlinks, known system/dependency folders, excluded names/extensions, and files above the configured maximum file size. The scan result includes counters and skipped reasons.

### List indexed records

```bash
npm run files:list -- -- --limit 20
```

Optional filters:

```bash
npm run files:list -- -- --status failed
npm run files:list -- -- --query invoice
```

### Extract document text

Supported first-pass extraction types:

- `.txt`
- `.md`
- `.csv`
- `.pdf`
- `.docx`
- `.xlsx`

```bash
npm run extract
```

For one file:

```bash
npm run extract -- -- --file-id "<file-id>"
```

Extraction skips already-extracted unchanged files by default. If an indexed file no longer exists on disk, extraction marks the indexed file as `failed`, reports it under `stale_missing` / `staleMissingItems`, and skips future retry loops until the file is re-indexed from an existing path.

### Search indexed files

```bash
npm run search -- "supplier contract"
```

Search uses SQLite FTS over filename, path, extension, and extracted content. Results include source paths and snippets where available. Active trash records are hidden from normal search by default.

API search results are normalized through a stable local MVP `SearchResult` contract:

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

`source_reference` is mandatory when the source file exists in the index:

```text
file_id
filename
absolute_path
relative_path
source_type = local_file
source_label
```

Search state clarity rules:

```text
active extracted file      -> visible in normal search with recovery_status = active and extraction_status = extracted
active trashed file        -> hidden in normal search
includeTrashed=true        -> returns trashed files with recovery_status = trashed
failed extraction file     -> searchable by filename/path with extraction_status = failed and extraction_error_message
unsupported file type      -> searchable by filename/path with extraction_status = unsupported and extraction_error_message
stale/missing indexed file -> searchable by filename/path with index_status = failed and source_reference
```

This means the local MVP does not silently hide indexed problem records by default when a user searches by filename/path. It returns them with explicit state fields so users can understand why content may be missing.

### Document context

The document context endpoint is:

```text
GET /api/intelligence/document-context/:fileId
```

It returns:

```text
file
previewText
insight
source_reference
```

The `file` object includes metadata, recovery state, indexing state, extraction state, extraction errors, source path, and source reference. Context remains available for active and recoverable file states. Failed or stale files clearly expose `index_status = failed` and `index_error_message`.

Semantic-style related search:

```bash
npm run embeddings -- --limit 1000
npm run semantic -- "supplier contract renewal"
```

This uses local deterministic token embeddings over extracted text. It is not a neural embedding model yet, but it provides stored vector-style related-content retrieval without external services.

### Prepare local chat retrieval

```bash
node src/index.js chat "Which files mention supplier contracts?"
```

By default, this returns retrieval sources and a prompt-ready fallback response. To generate a real local answer, run Ollama locally and set a model:

```bash
OLLAMA_MODEL=qwen3.5:2b node src/index.js chat "Which files mention supplier contracts?"
```

Optional environment variables:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:2b
OLLAMA_TIMEOUT_MS=120000
OLLAMA_NUM_PREDICT=192
```

The chat path calls Ollama's local `/api/chat` endpoint only when `OLLAMA_MODEL` is configured. It does not call cloud providers. AnythingLLM integration is available separately as an optional extracted-document sync bridge.

### Generate file insights

```bash
npm run insights -- --limit 25
```

Insights include deterministic summary, classification, and basic entity extraction. Add `--ollama` to generate summaries through the configured Ollama model.

### Find duplicates

```bash
npm run duplicates
```

Duplicates are grouped by content hash.

### Watch a folder

```bash
npm run watch -- "C:\path\to\folder"
```

The watcher performs an initial scan/extract and re-indexes when files change while the process is running.

Watcher events are debounced and queued to avoid overlapping rescans. Configure the debounce delay with:

```text
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
```

### Generate preview-only organization suggestions

```bash
npm run suggest -- "<file-id>"
```

Suggestions may include tags, category, safer filename, or better folder category. The suggestion engine uses Organizor2-inspired content/type rules adapted into `services/api/src/integrations/organizor`. Suggestions are stored as preview records only and always require approval.

### Create safe action previews

```bash
npm run preview -- "<suggestion-id>"
```

Action previews validate the suggestion before execution. Rename and move previews check for path traversal and target conflicts. All previews set `requires_approval`.

### Execute approved organization actions

```bash
npm run execute -- "<preview-id>" --approve
```

Supported execution actions:

- app-level tag
- app-level category
- rename file
- move file into the previewed folder

Execution validates that the target stays inside the allowed directory boundary, source and target differ, the source exists, and the target does not already exist. Failed execution attempts are audited.

Undo supported filesystem actions:

```bash
npm run undo -- "<execution-id>" --approve
```

### Execution batches

Execution batches group selected action previews into an approval-gated run.

Batch API flow:

```text
POST /api/execution-batches
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
GET /api/execution-batches/:batchId
```

Batch safety rules:

```text
batch creation accepts selected preview IDs
batch approval requires approve=true
blocked previews prevent approval
batch run requires approve=true
batch run uses the existing safe single-action executor
batch run stops on first failure
no automatic rollback in local MVP
operator-approved undo only
```

See:

```text
docs/EXECUTION_BATCH_WORKFLOW.md
```

### Local recovery and trash behavior

The local MVP uses recovery metadata instead of permanent delete. Moving a file to trash does not permanently delete file content. It creates a `trash_records` row, records retention metadata, writes an audit event, and hides the file from normal `/api/files` and `/api/search` results.

Recovery rules:

- Move to trash requires explicit approval.
- Restore requires explicit approval.
- Active trashed files are hidden from normal file list and keyword search results.
- Use `includeTrashed=true` only for recovery/admin views that need to include trashed records.
- File context includes `recovery_status: "active" | "trashed"`.
- Restore is blocked with `restore_conflict` if the indexed file path no longer matches the original trashed path.
- Permanent purge is blocked in the local MVP and audited as `file.purge_blocked`.

### API endpoints

Start the API:

```bash
npm start
```

Use `Authorization: Bearer <API_TOKEN>` for protected routes.

See the dedicated route checklist:

```text
docs/MVP_API_ROUTES.md
```

Core routes include:

- `POST /api/index`
- `POST /api/extract`
- `GET /api/status`
- `GET /api/files`
- `GET /api/search`
- `GET /api/semantic-search`
- `GET /api/intelligence/document-context/:fileId`
- `POST /api/suggestions`
- `POST /api/action-previews`
- `POST /api/action-executions`
- `POST /api/action-executions/:executionId/undo`
- `POST /api/execution-batches`
- `GET /api/execution-batches`
- `GET /api/execution-batches/:batchId`
- `POST /api/execution-batches/:batchId/approve`
- `POST /api/execution-batches/:batchId/run`
- `GET /api/audit-log`
- `GET /api/recovery/trash`
- `POST /api/recovery/trash`
- `POST /api/recovery/trash/:trashId/restore`
- `POST /api/recovery/trash/:trashId/purge`

### AnythingLLM sync

EverythingAI can optionally upload extracted local file knowledge into an AnythingLLM workspace using AnythingLLM's document upload API.

Configure:

```bash
ANYTHINGLLM_BASE_URL=http://127.0.0.1:3001
ANYTHINGLLM_API_KEY=your-api-key
ANYTHINGLLM_WORKSPACE_SLUG=everythingai
ANYTHINGLLM_UPLOAD_PATH=/api/v1/document/upload
```

Sync extracted files:

```bash
npm run sync:anythingllm -- --limit 25
```

The sync exports extracted text with source path metadata. It does not replace EverythingAI's local SQLite index.

### Safety behavior

The indexer skips symlink traversal and known unsafe/system/dependency paths such as Windows system folders, recycle-bin folders, `.git`, and `node_modules`. Per-file errors are logged and stored without stopping the scan. File execution requires a safe preview plus explicit approval. Failed execution attempts are audited.

Delete actions are not implemented. The recovery layer supports trash metadata, restore, restore-conflict detection, normal list/search hiding for active trash records, and explicit permanent-purge blocking. Permanent purge is disabled in the local MVP under policy `NO_PERMANENT_PURGE_IN_LOCAL_MVP`.

Extraction also guards against stale indexed paths. If a previously indexed path no longer exists on disk, the record is marked failed with a stale-file message and is not retried on every extraction run.

## Known local MVP limitations

- The UI/browser flow still needs a dedicated validation pass.
- Batch-level automatic rollback is not implemented.
- Batch-level undo endpoint is not implemented.
- Planning-session-to-batch generation is not implemented.
- Semantic search uses deterministic local token vectors, not a neural embedding model yet.
- Production platform architecture is not implemented yet.
- Multi-user/tenant auth is not implemented yet.
- PostgreSQL/pgvector migration is still a later phase.

## Next architectural decision

After the local MVP is validated, the next major phase is deciding whether to prioritize:

1. UI polish and browser workflow completion.
2. Production deployment hardening.
3. PostgreSQL + pgvector migration.
4. Real embedding provider support.
5. Installed client agent split.
6. Central browser/server architecture.
7. Multi-user tenant/workspace model.
