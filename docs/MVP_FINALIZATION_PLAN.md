# MVP FINALIZATION PLAN

## Objective

Finalize the current EverythingAI local MVP so it is stable, optimized, safe, and ready for serious local testing before moving to the full central platform architecture.

## Current MVP scope

The current MVP is split into:

```text
services/api                 Backend API, SQLite persistence, indexing, extraction, search, AI/knowledge services, safe actions, recovery, audit
apps/everything-ai-ui         React user/admin frontend
http://localhost:5151         Official safe user UI
http://localhost:5152/admin.html  Admin/operator UI during local development
```

The local MVP is focused on:

- local folder indexing
- SQLite metadata storage
- document text extraction
- SQLite FTS search
- deterministic vector-style local semantic search
- Ollama/provider-based local chat when configured
- deterministic and provider-assisted insights/classifications
- duplicate detection
- folder watching
- organization suggestions
- safe action previews
- approved move/rename execution
- undo
- audit log
- recovery/trash/restore
- source-backed content-first wiki pages
- category/topic knowledge navigation
- intelligent wiki search
- page-level article search
- reading mode
- source reveal/open context actions
- source verification UX with citations, source cards, copy citation/path actions, preview drawer foundation, durable evidence routes, persisted source chunks, evidence quality badges, durable chunk metadata display, hardened active chunk matching, collapsed metadata details, responsive source preview drawer behavior, safer table/image rendering, clearer local settings guidance, and extracted frontend connection-settings state

## Not part of local MVP finalization

The following items are intentionally deferred to the production-platform phase:

- PostgreSQL migration
- pgvector/Qdrant production vector store
- multi-user tenant model
- central client/server sync
- installed remote client agent
- SaaS deployment
- Windows installer
- enterprise permission model

## Finalization phases

### Phase 1 — Stabilization

Status: complete / validated locally on Windows

Tasks:

- [x] Remove legacy in-memory API routes
- [x] Modularize Express routes
- [x] Add request helper validation
- [x] Add local MVP vs central platform documentation
- [x] Add Windows smoke test guide
- [x] Backend automated test baseline previously validated: 78 passed / 0 failed
- [x] Re-run `npm test` after latest Wiki/source precision changes and watcher database-path fix
- [x] Fix new test failures found during validation
- [x] Repair local SQLite Wiki schema drift found during Windows runtime smoke testing
- [x] Add backend startup schema repair before API dev/start commands
- [x] Validate Windows local UI flow after schema repair
- [x] Reconfirm backend automated tests after schema repair

Validation result:

```text
Date: 2026-05-21
Windows local UI smoke test: PASS
Backend command: cd E:\01PROJEKTER\EverythingAI\services\api && npm test
Backend result: 80 tests / 80 passed / 0 failed
Frontend typecheck: PASS
Frontend production build: PASS
```

Related validation notes:

```text
docs/VALIDATION_2026-05-21_WINDOWS_SCHEMA_DRIFT_REPAIR.md
docs/VALIDATION_2026-05-21_WINDOWS_LOCAL_UI_SMOKE_PASS.md
docs/VALIDATION_2026-05-21_BACKEND_TESTS_AFTER_SCHEMA_REPAIR.md
docs/VALIDATION_2026-05-21_FULL_LOCAL_MVP_BASELINE.md
```

### Phase 2 — Scanner optimization

Status: in progress

Tasks:

- [x] Add configurable max file size
- [x] Add configurable exclude names
- [x] Add configurable exclude extensions
- [x] Track skipped reasons
- [x] Add progress callback support
- [ ] Add persisted unchanged-file skip strategy
- [ ] Add clearer scan report in UI

### Phase 3 — Watcher optimization

Status: in progress / watcher regression fixed

Tasks:

- [x] Add debounce
- [x] Prevent overlapping rescans
- [x] Add queued pending rerun handling
- [x] Fix watcher cycles to use the caller database path instead of the default database path
- [x] Validate watcher test fix on desktop through Issue #20
- [ ] Add watcher stress test on Windows
- [ ] Add UI status for watcher queue/running state

### Phase 4 — Extraction and embedding optimization

Status: in progress

Tasks:

- [x] Skip unchanged already-extracted files by default
- [x] Add force extraction option internally
- [x] Generate content-first wiki pages from extracted text
- [x] Generate chunk-level wiki citation markers such as `[S1:C3]`
- [x] Add persistent Wiki/Knowledge Base technical design for durable pages, sections, sources, chunks, relations, and rebuilds
- [x] Add durable Wiki schema tables for pages, sections, sources, chunks, relations, and rebuilds
- [x] Add durable Wiki repository read/write helpers
- [x] Add durable Wiki evidence API routes
- [x] Add backend tests for durable Wiki persistence and evidence routes
- [x] Add frontend TypeScript contracts and API helpers for durable Wiki evidence
- [ ] Avoid regenerating embeddings for unchanged extracted text
- [ ] Add future provider interface for real neural embeddings
- [ ] Add PDF page-level source references where extractor can provide page metadata

### Phase 5 — Safety hardening

Status: in progress / failed-execution regression coverage validated

Tasks:

- [x] Keep delete actions disabled
- [x] Keep move/rename behind preview + explicit approval
- [x] Add stronger filesystem execution validation
- [x] Audit failed execution attempts
- [x] Add backend reveal-source-file route for local source opening
- [ ] Add nested undo regression test
- [x] Add failed execution regression test

Validation note:

```text
Date: 2026-05-21
Backend tests passed 80/80 after schema repair.
Failed execution coverage includes blocked preview rejection, missing source rejection, target-exists rejection, and active trashed file rejection with failed audit/no unsafe mutation behavior.
```

### Phase 6 — UI polish and Wiki/Knowledge UX

Status: active / nearly complete

Completed:

- [x] Split user-facing safe UI from admin/operator UI
- [x] Keep official user UI on `apps/everything-ai-ui` / `UserApp.tsx`
- [x] Add Start / Explore / Wiki / Ask navigation
- [x] Add source-backed Wiki view
- [x] Add content-first file wiki pages
- [x] Add category/topic/source-file tree navigation
- [x] Add intelligent Wiki search across titles, topics, page content, sources, and snippets
- [x] Add page-level search inside selected wiki article with match count and highlighted matches
- [x] Add Reading Mode for cleaner article reading
- [x] Add clickable `[[Related Page]]` navigation
- [x] Add source rail with file path, source context, and reveal-in-folder action
- [x] Add toast notification system for important user-triggered actions
- [x] Add `start_all_debug.bat` to validate/build UI and start backend/user/admin dev servers
- [x] Render chunk-level citation badges such as `[S1:C3]`
- [x] Make citations clickable and highlight matching source cards
- [x] Add source card actions: preview source, copy citation, copy path, reveal in folder, and open source context
- [x] Add source preview drawer foundation for source metadata, evidence, path, and chunks
- [x] Separate article reading content from supporting metadata using Document Content and collapsed Document Details
- [x] Group About This Document, Extracted Entities, Related Pages, Sources, Source Locations, and Evidence Snippets into collapsed tabs
- [x] Add async Wiki rebuild orchestration panel with live progress, clear history, and help tooltips
- [x] Remove noisy success toasts from GET/polling requests
- [x] Add frontend types/API helpers for durable Wiki page, evidence, and chunk endpoints
- [x] Add Wiki evidence quality badges for source count, section count, citation coverage, weak-source warning, and source fingerprint
- [x] Add durable source/chunk metadata display in source preview drawer
- [x] Harden `[S1:Cx]` drawer matching by mapping both `ref` and durable `chunk_ref` to the same chunk element
- [x] Improve source preview drawer responsive layout for narrow screens
- [x] Add safer table/image rendering in wiki pages
- [x] Add clearer local settings instructions in Start and Explore views
- [x] Extract connection/folder settings state from `UserApp.tsx` into `useConnectionSettings`

Remaining:

- [ ] Continue splitting remaining large `UserApp.tsx` workflow responsibilities into smaller state/controller modules

Important current instruction:

```text
Pause broad UserApp refactoring until the next runtime-priority task is chosen.
Do not move buildKnowledgeWorkspace() yet.
Do not combine UX work and workflow extraction in the same commit.
```

### Phase 7 — Documentation finalization

Status: active / in progress

Tasks:

- [x] Add MVP finalization plan
- [x] Add known limitations document
- [x] Add current handover JSON for next AI agent
- [x] Update MVP finalization plan with Phase 1 evidence-inspection progress
- [x] Add dedicated Wiki/Knowledge Base technical design doc
- [x] Link dedicated Wiki/Knowledge Base technical design doc from README
- [x] Update documentation with backend validation result after durable Wiki changes
- [x] Update documentation with frontend typecheck/build validation result after durable Wiki types/API helpers
- [x] Update documentation with frontend typecheck/build validation result after Wiki evidence quality badges
- [x] Update documentation with frontend typecheck/build validation result after source drawer metadata display
- [x] Update documentation with frontend typecheck/build validation result after active chunk matching hardening
- [x] Update documentation with frontend typecheck/build validation result after page-level article search
- [x] Update documentation with frontend typecheck/build validation result after collapsed metadata details
- [x] Update documentation with frontend typecheck/build validation result after responsive source drawer polish
- [x] Update documentation with frontend typecheck/build validation result after table/image rendering polish
- [x] Update documentation with frontend typecheck/build validation result after local settings guidance polish
- [x] Update documentation with frontend typecheck/build validation result after connection settings hook extraction
- [x] Update Windows smoke test after local tests
- [x] Add validation notes for Windows schema-drift repair, Windows local UI smoke pass, backend tests, and full local MVP baseline

## Latest validation results

```text
Date: 2026-05-21

Windows local UI smoke test:
Command: cd E:\01PROJEKTER\EverythingAI && .\start_all_debug.bat
User UI: http://localhost:5151
Flow: Start -> Explore -> Wiki -> Ask
Result: PASS

Backend:
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
Result: 80 tests / 80 passed / 0 failed

Frontend:
cd E:\01PROJEKTER\EverythingAI\apps\everything-ai-ui
npm run typecheck
Result: passed

cd E:\01PROJEKTER\EverythingAI\apps\everything-ai-ui
npm run build
Result: passed
Observed: 1533 modules transformed, built in 1.16s
```

## Runtime repair added during validation

The Windows smoke test exposed schema drift in an older local SQLite database.

Observed missing-column failures:

```text
no such column: status
no such column: source_ref
no such column: page_source_id
```

Repair utility:

```text
services/api/src/db/repairWikiSchema.js
```

Manual repair command:

```text
cd E:\01PROJEKTER\EverythingAI\services\api
npm run repair:wiki-schema
```

Startup hardening:

```text
services/api/package.json
npm run dev and npm start now run Wiki schema repair before API startup.
```

## Environment variables for MVP optimization

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT=50000
EVERYTHINGAI_WIKI_TOPIC_CONTENT_LIMIT=4000
```

## Definition of done

The local MVP is finalized when:

1. `npm test` passes locally after latest changes. Current result: PASS, 80/80.
2. `npm run typecheck` passes in `apps/everything-ai-ui`. Current result: PASS.
3. `npm run build` passes in `apps/everything-ai-ui`. Current result: PASS.
4. A safe Windows folder can be indexed without errors. Current result: smoke-tested through user UI.
5. Extraction works for supported file types.
6. Search and semantic-style search work.
7. Insights and suggestions are generated.
8. User can build and browse source-backed wiki pages.
9. Wiki pages prioritize real document content over metadata.
10. Wiki source citations are precise enough for user trust.
11. Move/rename actions require preview and approval.
12. Failed action attempts are audited.
13. Undo works for nested files and is audited.
14. Watch mode does not overload the app during normal file changes.
15. README and smoke-test documentation match the tested behavior.

## Final MVP principle

The local MVP should be boring, safe, and reliable before adding more intelligence.

The Wiki/Knowledge Base direction is now confirmed: it should feel like a source-backed encyclopedia / book-reading layer over the user's local files, with content-first pages, strong navigation, intelligent search, page-level article search, source preview, evidence inspection, traceable citations, durable source chunks, rebuild history, visible evidence quality indicators, durable chunk metadata display, reliable citation-to-chunk navigation, collapsed metadata details, responsive source preview behavior, safer table/image rendering, clear local setup guidance, and gradually modularized frontend state.

Do not add production-platform features until the local MVP is stable.
