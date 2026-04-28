# MVP FINALIZATION PLAN

## Objective

Finalize the current EverythingAI local MVP so it is stable, optimized, safe, and ready for serious local testing before moving to the full central platform architecture.

## Current MVP scope

The current MVP is the local app in:

```text
services/api
```

It is focused on:

- local folder indexing
- SQLite metadata storage
- document text extraction
- SQLite FTS search
- deterministic vector-style local semantic search
- Ollama-based local chat when configured
- deterministic insights and classifications
- duplicate detection
- folder watching
- organization suggestions
- safe action previews
- approved move/rename execution
- undo
- audit log
- optional AnythingLLM sync

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

Status: in progress

Tasks:

- [x] Remove legacy in-memory API routes
- [x] Modularize Express routes
- [x] Add request helper validation
- [x] Add local MVP vs central platform documentation
- [x] Add Windows smoke test guide
- [ ] Run `npm test` locally
- [ ] Fix any test failures

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
- [ ] Avoid regenerating embeddings for unchanged extracted text
- [ ] Add future provider interface for real neural embeddings
- [ ] Add chunk-level embedding design note

### Phase 5 — Safety hardening

Status: in progress

Tasks:

- [x] Keep delete actions disabled
- [x] Keep move/rename behind preview + explicit approval
- [x] Add stronger filesystem execution validation
- [x] Audit failed execution attempts
- [ ] Add nested undo regression test
- [ ] Add failed execution regression test

### Phase 6 — UI polish

Status: pending

Tasks:

- [ ] Add loading states for long operations
- [ ] Add error panel
- [ ] Add clearer warnings before execution
- [ ] Add pipeline status indicators
- [ ] Add clearer local settings instructions

### Phase 7 — Documentation finalization

Status: in progress

Tasks:

- [x] Add MVP finalization plan
- [x] Add known limitations document
- [ ] Update README after local tests
- [ ] Update Windows smoke test after local tests

## Environment variables for MVP optimization

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
```

## Definition of done

The local MVP is finalized when:

1. `npm test` passes locally.
2. A safe Windows folder can be indexed without errors.
3. Extraction works for supported file types.
4. Search and semantic-style search work.
5. Insights and suggestions are generated.
6. Move/rename actions require preview and approval.
7. Failed action attempts are audited.
8. Undo works for nested files and is audited.
9. Watch mode does not overload the app during normal file changes.
10. README and smoke-test documentation match the tested behavior.

## Final MVP principle

The local MVP should be boring, safe, and reliable before adding more intelligence.

Do not add production-platform features until the local MVP is stable.
