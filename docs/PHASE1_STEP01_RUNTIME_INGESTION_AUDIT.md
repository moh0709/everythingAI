# Phase 1 — Step 1.1 Runtime Ingestion Audit

## Status

```text
COMPLETE
```

## Objective

Audit the current runtime ingestion implementation before making Phase 1 runtime changes.

This step is audit-only and does not modify runtime behavior.

---

# Files Audited

```text
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/indexer/fileScanner.js
services/api/src/automation/localPipeline.js
services/api/src/watcher/watchService.js
services/api/src/extractors/extractionRunner.js
services/api/src/extractors/documentExtractor.js
services/api/src/db/client.js
services/api/src/db/schema.sql
services/api/src/routes/system.routes.js
services/api/test/localMvp.test.js
```

---

# Current Runtime Ingestion Flow

## Manual index route

Current route:

```text
POST /api/index
```

Current flow:

```text
files.routes.js
  ↓
scanFolder()
  ↓
upsertIndexedFile()
  ↓
optional runLocalAutomationPipeline()
```

If `auto !== false`, the route runs the local automation pipeline.

---

## Source path route

Current route:

```text
POST /api/source-paths
```

Current flow when watch is enabled:

```text
sourcePaths.routes.js
  ↓
upsertWatchRoot()
  ↓
startFolderWatcher(auto: true)
```

Current flow when watch is disabled:

```text
sourcePaths.routes.js
  ↓
scanFolder()
  ↓
runLocalAutomationPipeline()
```

---

## Watcher flow

Current watcher flow:

```text
watchService.js
  ↓
fs.watch()
  ↓
debounced cycle
  ↓
scanFolder()
  ↓
runLocalAutomationPipeline(auto: true)
```

The watcher currently includes extraction, embeddings, insights, knowledge build, and suggestions indirectly through `runLocalAutomationPipeline()`.

---

# Current Local Automation Pipeline

Current pipeline:

```text
runLocalAutomationPipeline()
  ↓
extractIndexedFiles()
  ↓
generateEmbeddings()
  ↓
generateFileInsights()
  ↓
buildKnowledgeIndex()
  ↓
generatePreviewSuggestions()
```

This confirms the current coupling:

```text
ingestion
  ↓
knowledge pipeline
  ↓
planning suggestions
```

This violates the Improvement Project One rule:

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

---

# Scanner Findings

## Strong points

`fileScanner.js` already has:

```text
- recursive scanning
- symlink skipping
- unsafe/system folder exclusions
- excluded extension support
- max file size support
- content hashing
- skipped counters
- failed counters
- skipped reasons list
- progress callback support
```

This is a strong MVP foundation.

## Limitations

Skipped files are counted and included in `skippedReasons`, but skipped file records are not persisted as indexed file records.

This means the UI/status layer can report skip counts from the scan result but cannot query historical skipped files from the database.

This is acceptable for now, but future diagnostics may need persisted skip records or a diagnostics table.

---

# Extraction Findings

## Strong points

The extraction runner already:

```text
- processes indexed files
- skips unchanged extracted files
- supports force mode
- records extracted/failed/unsupported status
- continues after failed files
- returns counters
```

Supported formats:

```text
.txt
.md
.csv
.pdf
.docx
.xlsx
```

## Limitations

Extraction reporting is mostly counter-based.

It does not yet return detailed per-file failure summaries suitable for UI diagnostics.

Future improvement:

```text
- failedItems[]
- unsupportedItems[]
- skippedItems[]
```

without storing sensitive content.

---

# System Status Findings

The system status currently includes useful counts:

```text
total_files
indexed_files
failed_files
extracted_files
failed_extractions
searchable_files
embedded_files
insight_files
suggestions
previews
executions
undone_executions
labeled_files
active_watch_roots
last_indexed_at
```

This is a good dashboard foundation.

However, it does not yet distinguish:

```text
knowledge ingestion status
planning status
stale records
skipped records
watcher cycle diagnostics
```

Those belong to later phases.

---

# Test Suite Findings

The current test suite is strong and covers:

```text
- recursive indexing
- folder exclusions
- hashing
- extraction failures
- search
- chat retrieval
- suggestions
- previews
- execution
- undo
- labels
- AnythingLLM sync
- insights
- semantic search
- duplicates
- watcher behavior
- knowledge build
- system status
- automatic local pipeline
```

Important regression point:

Current tests expect automatic suggestions in at least these areas:

```text
watcher test expects status.suggestions > 0
automatic local pipeline test expects organization suggestions
```

These tests must be updated when Step 1.3 separates ingestion from planning.

---

# Main Architectural Finding

The biggest runtime issue is confirmed:

```text
runLocalAutomationPipeline() mixes knowledge ingestion and planning suggestions.
```

This is the primary Phase 1 runtime target.

Target separation:

```text
runKnowledgeIngestionPipeline()
  - extraction
  - embeddings
  - insights
  - knowledge

runPlanningPipeline()
  - suggestions only when user starts planning
```

---

# Regression-Sensitive Areas

## Area 1 — Existing API responses

`POST /api/index` and `POST /api/source-paths` currently include `automation` results.

Any changes should preserve response compatibility where possible.

## Area 2 — Watcher tests

Watcher tests currently expect automatic suggestions.

This expectation must change.

## Area 3 — Local automation pipeline tests

Automatic pipeline tests currently expect suggestions.

This must be split into:

```text
knowledge pipeline test
explicit planning/suggestion test
```

## Area 4 — Status counts

After separating planning from ingestion, `status.suggestions` may no longer increase after ingestion alone.

This is intended behavior.

---

# Step 1.1 Due Diligence

## Architecture consistency

```text
PASS
```

The audit confirms the Phase 1 plan is aligned with real runtime architecture.

## Implementation readiness

```text
PASS
```

Enough runtime detail is now known to proceed to Step 1.2.

## Runtime safety

```text
PASS
```

No runtime code was changed.

## Main risk identified

```text
Tests and some UI expectations may currently assume suggestions are created automatically.
```

This risk is manageable and should be handled in Step 1.3 and Step 1.7.

---

# Result

```text
Step 1.1 passes due diligence.
```

The project can proceed to:

```text
Step 1.2 — Define Target Ingestion Service Boundary
```
