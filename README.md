# EverythingAI / EverythingApp

EverythingAI is the project foundation for **EverythingApp**: a local-first, source-backed AI knowledge workspace for indexing local files, extracting document text, searching, chatting, generating controlled Wiki pages, and safely preparing file-organization workflows.

## Current baseline

```text
Local MVP baseline date: 2026-05-21
Backend tests: 88 passed / 0 failed
Frontend typecheck: PASS from latest frontend validation cycle
Frontend build: PASS from latest frontend validation cycle
Windows local UI smoke: PASS from latest local UI smoke validation
```

Latest baseline documents:

```text
docs/LOCAL_MVP_STATUS_2026-05-21.md
docs/HANDOVER_2026-05-21_EVERYTHINGAI_LOCAL_MVP_88_TEST_BASELINE.json
docs/VALIDATION_2026-05-21_WIKI_CONTENT_CONTROL.md
```

## One-sentence definition

**EverythingApp is a local AI-powered file brain that indexes local folders, understands file and document contents, remembers filenames and paths, answers questions with source references, generates controlled source-backed Wiki pages, and safely suggests or performs approved file organization such as tagging, renaming, and moving files.**

## Current focus

The current objective is to preserve the green **local MVP** baseline before moving to broader platform work.

The local MVP should remain stable, safe, boring, and reliable before adding advanced production-platform features.

## Current local MVP status

```text
Backend local MVP: runnable through API
Official user UI: http://localhost:5151
Admin/operator UI: http://localhost:5152/admin.html
Automated backend tests: 88 passed / 0 failed
```

Completed MVP phases:

```text
Phase 1: Stabilization — complete / validated
Phase 2: Scanner optimization — complete / validated
Phase 3: Watcher optimization — complete / validated
Phase 4: Extraction and embedding optimization — complete / validated
Phase 5: Safety hardening — complete / validated
Phase 6: Controlled UI modularization — remaining / handle carefully
Phase 7: Documentation finalization — active / mostly complete
```

The local MVP currently supports:

- Local folder indexing
- Document extraction
- Keyword search and source references
- Semantic-style local search
- Document context
- Source-backed controlled Wiki pages
- Wiki citations and source chunks
- PDF/page metadata in Wiki source chunks when extractor metadata is available
- Scanner skip reporting
- Watcher debounce, queued rerun handling, and runtime status
- Suggestions and action previews
- Approval-gated action execution
- Recovery snapshots for filesystem mutation
- Approval-gated undo for supported filesystem actions
- Local trash/restore behavior
- Permanent purge blocking
- Execution batches with approval and audit
- Content-controlled Wiki generation

## Content-controlled Wiki rule

The Wiki layer is now intentionally strict:

```text
Document body content must come from extracted source text.
AI summaries must not be used as fake source-backed document body content.
```

If extracted source text is missing, the page must clearly show:

```text
No source-backed extracted document content is available yet.
```

Validated by:

```text
services/api/test/wikiContentControl.test.js
```

## Local development entry points

Start everything for local debugging:

```powershell
cd E:\01PROJEKTER\EverythingAI
.\start_all_debug.bat
```

Open:

```text
User UI:  http://localhost:5151
Admin UI: http://localhost:5152/admin.html
Backend:  http://127.0.0.1:4100
```

Run backend tests:

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

Run frontend validation:

```powershell
cd E:\01PROJEKTER\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

Manual Wiki schema repair, if needed for older local SQLite databases:

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm run repair:wiki-schema
```

The backend startup scripts also run Wiki schema repair before API startup.

## Local MVP optimization environment variables

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT=50000
EVERYTHINGAI_WIKI_TOPIC_CONTENT_LIMIT=4000
EVERYTHINGAI_WIKI_CHUNK_CHAR_LIMIT=900
```

Recommended for first local tests:

```powershell
$env:EVERYTHINGAI_MAX_FILE_SIZE_BYTES="262144000"
$env:EVERYTHINGAI_EXCLUDE_NAMES="node_modules,.git,dist,build"
$env:EVERYTHINGAI_EXCLUDE_EXTENSIONS=".exe,.dll,.iso,.zip"
$env:EVERYTHINGAI_WATCH_DEBOUNCE_MS="1000"
```

## Important local MVP safety rules

```text
Delete actions are disabled.
Permanent purge is blocked in the local MVP.
Move/rename requires preview and explicit approval.
Failed execution attempts are audited.
Undo requires explicit approval.
Active trashed files are hidden from normal file list and keyword/unified search.
includeTrashed=true is only for recovery/admin views.
AI summaries must not populate source-backed document body content.
```

## Current architecture split

```text
services/api                 Backend API, SQLite persistence, indexing, extraction, search, AI/knowledge services, safe actions, recovery, audit
apps/everything-ai-ui         React user/admin frontend
http://localhost:5151         Official safe user UI
http://localhost:5152/admin.html  Admin/operator UI during local development
```

## Documentation

See the `/docs` folder.

### Current local MVP documentation

- [`LOCAL_MVP_STATUS_2026-05-21.md`](docs/LOCAL_MVP_STATUS_2026-05-21.md)
- [`HANDOVER_2026-05-21_EVERYTHINGAI_LOCAL_MVP_88_TEST_BASELINE.json`](docs/HANDOVER_2026-05-21_EVERYTHINGAI_LOCAL_MVP_88_TEST_BASELINE.json)
- [`MVP_FINALIZATION_PLAN.md`](docs/MVP_FINALIZATION_PLAN.md)
- [`KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)
- [`WINDOWS_LOCAL_SMOKE_TEST.md`](docs/WINDOWS_LOCAL_SMOKE_TEST.md)
- [`MVP_SMOKE_TEST_RUNBOOK.md`](docs/MVP_SMOKE_TEST_RUNBOOK.md)
- [`MVP_API_ROUTES.md`](docs/MVP_API_ROUTES.md)
- [`LOCAL_MVP_VS_CENTRAL_PLATFORM.md`](docs/LOCAL_MVP_VS_CENTRAL_PLATFORM.md)
- [`WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md`](docs/WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md)
- [`VALIDATION_2026-05-21_PHASE4_COMPLETE.md`](docs/VALIDATION_2026-05-21_PHASE4_COMPLETE.md)
- [`VALIDATION_2026-05-21_WIKI_CONTENT_CONTROL.md`](docs/VALIDATION_2026-05-21_WIKI_CONTENT_CONTROL.md)

### Future product track

The future archive/organization product track is captured separately:

- [`AI_ORGANIZATION_WORKSPACE_DESIGN.md`](docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md)
- GitHub issue `#21`: Future Track: AI Organization Workspace / Managed Knowledge Archive

This future track should remain separate from the current local MVP unless explicitly selected as the next priority.

### Product and architecture references

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
- [`PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- [`TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
- [`DATA_MODEL.md`](docs/DATA_MODEL.md)
- [`SECURITY_AND_FILE_SAFETY.md`](docs/SECURITY_AND_FILE_SAFETY.md)
- [`ROADMAP.md`](docs/ROADMAP.md)

### Enterprise workspace documentation

The production target remains a governed enterprise cognitive workspace, but it is not part of the current local MVP baseline.

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

## Local file brain MVP details

The runnable MVP lives in `services/api`. It scans local folders, reads file metadata, computes SHA-256 content hashes, extracts document text, searches metadata/content with SQLite FTS, answers through local Ollama when configured, generates insights, finds duplicates, watches folders, and safely organizes files after preview and approval.

File move/rename execution is available only through an explicit approved action preview. Delete actions are not implemented. The local MVP includes governed recovery metadata: files can be moved to a local trash state, hidden from normal list/search results, restored, and audited. Permanent purge is explicitly blocked in the MVP.

## Install

```bash
cd services/api
npm install
```

## Run the local API

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm start
```

The default local development token is:

```text
replace-with-your-local-development-token
```

Use it as:

```text
Authorization: Bearer replace-with-your-local-development-token
```

## Test

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

Current local MVP validation status:

```text
88 tests passing / 0 failing
```

## Manual MVP smoke test

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
Wiki/source evidence flow
```

## Common CLI flows

Index a folder:

```bash
npm run index -- "C:\path\to\test-folder"
```

List indexed records:

```bash
npm run files:list -- -- --limit 20
```

Extract document text:

```bash
npm run extract
```

Search indexed files:

```bash
npm run search -- "supplier contract"
```

Generate local deterministic embeddings:

```bash
npm run embeddings -- --limit 1000
```

Run semantic-style search:

```bash
npm run semantic -- "supplier contract renewal"
```

Generate insights:

```bash
npm run insights -- --limit 25
```

Find duplicates:

```bash
npm run duplicates
```

Watch a folder:

```bash
npm run watch -- "C:\path\to\folder"
```

Generate preview-only organization suggestions:

```bash
npm run suggest -- "<file-id>"
```

Create safe action previews:

```bash
npm run preview -- "<suggestion-id>"
```

Execute approved organization actions:

```bash
npm run execute -- "<preview-id>" --approve
```

Undo supported filesystem actions:

```bash
npm run undo -- "<execution-id>" --approve
```

## API route reference

See:

```text
docs/MVP_API_ROUTES.md
```

Core routes include:

```text
POST /api/index
POST /api/extract
GET /api/status
GET /api/files
GET /api/search
GET /api/semantic-search
GET /api/intelligence/document-context/:fileId
POST /api/suggestions
POST /api/action-previews
POST /api/action-executions
POST /api/action-executions/:executionId/undo
POST /api/execution-batches
GET /api/execution-batches
GET /api/execution-batches/:batchId
POST /api/execution-batches/:batchId/approve
POST /api/execution-batches/:batchId/run
GET /api/audit-log
GET /api/recovery/trash
POST /api/recovery/trash
POST /api/recovery/trash/:trashId/restore
POST /api/recovery/trash/:trashId/purge
GET /api/watch/status
POST /api/watch
POST /api/unwatch
GET /api/wiki
GET /api/wiki/pages/:pageId
GET /api/wiki/pages/:pageId/evidence
GET /api/wiki/chunks/:chunkRef
```

## AnythingLLM sync

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

## Known local MVP limitations

- Full production platform architecture is not implemented yet.
- Multi-user/tenant auth is not implemented yet.
- PostgreSQL/pgvector migration is still a later phase.
- Semantic search currently uses deterministic local token vectors by default.
- Async neural embedding providers are not enabled in the local MVP path yet.
- Advanced document intelligence for tables, charts, figures, images, OCR, and layout is a future layer.
- AI Organization Workspace / Managed Knowledge Archive is captured as a future track, not current MVP execution work.

## PM recommendation

```text
Preserve the 88/88 green baseline.
Avoid broad runtime refactors immediately.
Do not start enterprise governance tickets as MVP work.
Do not implement AI Organization Workspace unless explicitly selected.
Only do small controlled UI modularization or documentation updates next.
```
