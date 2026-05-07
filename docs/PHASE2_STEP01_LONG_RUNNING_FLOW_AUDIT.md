# Phase 2 — Step 2.1 Long-Running Runtime Flow Audit

## Status

```text
COMPLETE
```

## Objective

Audit current long-running runtime flows and identify which operations should become job-backed over time.

This step is audit-only and does not modify runtime code.

---

# Files Reviewed

```text
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/routes/watch.routes.js
services/api/src/watcher/watchService.js
services/api/src/automation/localPipeline.js
services/api/src/extractors/extractionRunner.js
services/api/src/embeddings/embeddingService.js
services/api/src/insights/insightService.js
services/api/src/knowledge/knowledgeService.js
services/api/src/suggestions/suggestionService.js
services/api/src/actions/actionExecutor.js
services/api/src/db/schema.sql
services/api/src/db/client.js
services/api/src/server.js
services/api/test/localMvp.test.js
```

---

# Main Finding

The project now has a clean enough ingestion/planning separation to introduce a lightweight job layer safely.

The safest first job-backed target is:

```text
Knowledge ingestion pipeline
```

not execution.

Execution should remain later and more carefully controlled because it touches filesystem actions.

---

# Job Candidate Inventory

## Candidate 1 — INDEX_SOURCE

### Current entry points

```text
POST /api/index
POST /api/source-paths when watch=false
watcher cycle
```

### Current work

```text
scanFolder()
upsertIndexedFile()
```

### Job suitability

```text
HIGH
```

### Reason

Folder scanning can be long-running and benefits from progress reporting.

---

## Candidate 2 — KNOWLEDGE_INGESTION_PIPELINE

### Current entry points

```text
POST /api/index when auto=true
POST /api/source-paths when watch=false
watcher cycle when auto=true
```

### Current work

```text
runKnowledgeIngestionPipeline()
  - extractIndexedFiles()
  - generateEmbeddings()
  - generateFileInsights()
  - buildKnowledgeIndex()
```

### Job suitability

```text
VERY HIGH
```

### Reason

This is the most important first job target because it is long-running, non-destructive, and already separated from planning.

---

## Candidate 3 — EXTRACT_FILES

### Current entry points

```text
POST /api/extract
runKnowledgeIngestionPipeline()
```

### Job suitability

```text
HIGH
```

### Reason

Extraction can be slow and fail per file. It already has improved diagnostics from Phase 1.

---

## Candidate 4 — GENERATE_EMBEDDINGS

### Current entry points

```text
runKnowledgeIngestionPipeline()
CLI embeddings command
```

### Job suitability

```text
MEDIUM-HIGH
```

### Reason

Current deterministic embeddings are fast, but future provider-based embeddings will need job tracking.

---

## Candidate 5 — GENERATE_INSIGHTS

### Current entry points

```text
runKnowledgeIngestionPipeline()
CLI insights command
```

### Job suitability

```text
HIGH
```

### Reason

Insights may call providers and can become slow/failure-prone.

---

## Candidate 6 — BUILD_KNOWLEDGE

### Current entry points

```text
runKnowledgeIngestionPipeline()
manual knowledge build tests
```

### Job suitability

```text
MEDIUM
```

### Reason

Current knowledge build is local and relatively lightweight, but it belongs inside pipeline progress tracking.

---

## Candidate 7 — WATCHER_CYCLE

### Current entry points

```text
startFolderWatcher()
fs.watch event
runQueuedCycle()
```

### Job suitability

```text
HIGH
```

### Reason

Watcher cycles need visibility, concurrency control, and diagnostics.

Important:

```text
Watcher jobs must not schedule planning jobs automatically.
```

---

## Candidate 8 — RUN_PLANNING

### Current entry points

```text
generatePreviewSuggestions()
runPlanningPipeline()
POST /api/suggestions through existing action routes if present
```

### Job suitability

```text
MEDIUM, BUT DEFER
```

### Reason

Planning should become job-backed later, but Phase 2 should not expand into planning sessions yet.

Planning sessions are Phase 3.

---

## Candidate 9 — CREATE_PREVIEWS

### Current entry points

```text
createActionPreview()
```

### Job suitability

```text
LOW-MEDIUM, DEFER
```

### Reason

Preview creation is not the first job-layer priority.

---

## Candidate 10 — EXECUTE_ACTIONS

### Current entry points

```text
executeActionPreview()
undoActionExecution()
```

### Job suitability

```text
HIGH, BUT DEFER
```

### Reason

Execution is a strong future job candidate, but it modifies files and requires more locking, approval, and rollback safety.

Do not job-wrap execution in early Phase 2.

---

# Current Storage Situation

The current schema has:

```text
audit_log
```

but no:

```text
jobs
job_events
lifecycle_events
```

Phase 2 should begin with an in-memory/synchronous job abstraction first.

Persistent jobs can come later after the contract is stable.

---

# Route Compatibility Risks

## Risk 1 — Existing synchronous responses

Routes like:

```text
POST /api/index
POST /api/source-paths
```

currently return immediate scan/automation results.

Phase 2 should not replace these with async-only job IDs yet.

Recommended compatibility approach:

```text
keep existing response fields
add optional job metadata
```

---

## Risk 2 — Server route registration

Adding job routes requires registering a new router in:

```text
services/api/src/server.js
```

This is low risk if route names do not conflict.

Recommended route:

```text
GET /api/jobs
GET /api/jobs/:jobId
```

---

## Risk 3 — Watcher lifetime and DB handles

Watcher currently receives a database handle and keeps using it for cycles.

Job wrapping watcher cycles should be done carefully.

For Phase 2, the safest watcher change is:

```text
wrap each cycle in an in-memory job record
without changing DB ownership yet
```

---

# Recommended First Job Types for Phase 2

Use these first:

```text
KNOWLEDGE_INGESTION_PIPELINE
WATCHER_CYCLE
```

Optionally later:

```text
INDEX_SOURCE
EXTRACT_FILES
GENERATE_EMBEDDINGS
GENERATE_INSIGHTS
BUILD_KNOWLEDGE
```

Do not yet implement:

```text
EXECUTE_ACTIONS
UNDO_ACTIONS
RUN_PLANNING sessions
```

---

# Recommended Minimal Job Runtime

Phase 2 should start with:

```text
in-memory job store
synchronous runJob wrapper
completed/failed state capture
progress placeholder
GET /api/jobs
GET /api/jobs/:jobId
```

This avoids database migrations and queue complexity while establishing the architecture.

---

# Step 2.1 Due Diligence

## Architecture consistency

```text
PASS
```

## Phase 1 compatibility

```text
PASS
```

The Phase 1 ingestion/planning separation makes the job layer safer to introduce.

## Runtime safety

```text
PASS
```

No runtime code changed.

## Recommended next target

```text
Step 2.2 — Define Minimal Job Contract and Runtime Boundary
```

---

# Result

```text
Step 2.1 passes due diligence.
```
