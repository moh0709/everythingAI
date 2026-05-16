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
- reading mode
- source reveal/open context actions

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

Status: mostly complete, validation ongoing

Tasks:

- [x] Remove legacy in-memory API routes
- [x] Modularize Express routes
- [x] Add request helper validation
- [x] Add local MVP vs central platform documentation
- [x] Add Windows smoke test guide
- [x] Backend automated test baseline previously validated: 78 passed / 0 failed
- [ ] Re-run `npm test` after latest Wiki/source precision changes
- [ ] Fix any new test failures if found

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

Status: in progress

Tasks:

- [x] Add debounce
- [x] Prevent overlapping rescans
- [x] Add queued pending rerun handling
- [ ] Add watcher stress test on Windows
- [ ] Add UI status for watcher queue/running state

### Phase 4 — Extraction and embedding optimization

Status: in progress

Tasks:

- [x] Skip unchanged already-extracted files by default
- [x] Add force extraction option internally
- [x] Generate content-first wiki pages from extracted text
- [x] Generate chunk-level wiki citation markers such as `[S1:C3]`
- [ ] Avoid regenerating embeddings for unchanged extracted text
- [ ] Add future provider interface for real neural embeddings
- [ ] Add persistent source chunk table design / implementation
- [ ] Add PDF page-level source references where extractor can provide page metadata

### Phase 5 — Safety hardening

Status: in progress

Tasks:

- [x] Keep delete actions disabled
- [x] Keep move/rename behind preview + explicit approval
- [x] Add stronger filesystem execution validation
- [x] Audit failed execution attempts
- [x] Add backend reveal-source-file route for local source opening
- [ ] Add nested undo regression test
- [ ] Add failed execution regression test

### Phase 6 — UI polish and Wiki/Knowledge UX

Status: active / in progress

Completed:

- [x] Split user-facing safe UI from admin/operator UI
- [x] Keep official user UI on `apps/everything-ai-ui` / `UserApp.tsx`
- [x] Add Start / Explore / Wiki / Ask navigation
- [x] Add source-backed Wiki view
- [x] Add content-first file wiki pages
- [x] Add category/topic/source-file tree navigation
- [x] Add intelligent Wiki search across titles, topics, page content, sources, and snippets
- [x] Add Reading Mode for cleaner article reading
- [x] Add clickable `[[Related Page]]` navigation
- [x] Add source rail with file path, source context, and reveal-in-folder action
- [x] Add toast notification system for important user-triggered actions
- [x] Add `start_all_debug.bat` to validate/build UI and start backend/user/admin dev servers

Remaining:

- [ ] Finish frontend renderer styling for chunk citation badges `[S1:C3]`
- [ ] Make citations clickable and jump to Source Locations / source preview
- [ ] Add true progress feedback during Build Knowledge / Build Wiki, not only final toast
- [ ] Add page-level search inside selected wiki article
- [ ] Add better table/image extraction and rendering in wiki pages
- [ ] Reduce metadata further in reading surfaces
- [ ] Split `UserApp.tsx` into smaller components
- [ ] Add clearer local settings instructions

### Phase 7 — Documentation finalization

Status: active / in progress

Tasks:

- [x] Add MVP finalization plan
- [x] Add known limitations document
- [x] Add current handover JSON for next AI agent
- [ ] Update README with final local test results after latest changes are validated locally
- [ ] Update Windows smoke test after local tests
- [ ] Add dedicated Wiki/Knowledge Base technical design doc

## Environment variables for MVP optimization

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT=50000
EVERYTHINGAI_WIKI_TOPIC_CONTENT_LIMIT=4000
EVERYTHINGAI_WIKI_CHUNK_CHAR_LIMIT=900
```

## Definition of done

The local MVP is finalized when:

1. `npm test` passes locally after latest changes.
2. `npm run typecheck` passes in `apps/everything-ai-ui`.
3. `npm run build` passes in `apps/everything-ai-ui`.
4. A safe Windows folder can be indexed without errors.
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

The Wiki/Knowledge Base direction is now confirmed: it should feel like a source-backed encyclopedia / book-reading layer over the user's local files, with content-first pages, strong navigation, intelligent search, and traceable citations.

Do not add production-platform features until the local MVP is stable.
