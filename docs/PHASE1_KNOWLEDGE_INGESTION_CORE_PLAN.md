# Phase 1 — Knowledge Ingestion Core Plan

## Status

```text
PLANNED
PENDING USER APPROVAL BEFORE IMPLEMENTATION
```

## Objective

Stabilize the EverythingAI knowledge ingestion core so source paths, file indexing, extraction, embedding readiness, knowledge readiness, failed-file reporting, and ingestion/planning separation become reliable and modular.

Phase 1 is the first phase that may begin runtime implementation work after Phase 0.

---

# Phase 1 Scope

Phase 1 focuses on:

```text
- source path ingestion reliability
- file indexing behavior
- metadata normalization
- extraction status visibility
- failed file reporting
- separating ingestion from planning
- preparing ingestion for the future job layer
- preserving current MVP compatibility
```

---

# Phase 1 Non-Goals

Phase 1 should NOT fully implement:

```text
- complete async job queue
- planning sessions
- full Knowledge Access Router
- chunk-level embeddings
- PostgreSQL migration
- UI redesign
- production auth/tenant model
```

Those belong to later phases.

---

# Permanent Rules Applied in Phase 1

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

```text
Routes → Services → Repositories → Database
```

```text
Watcher may trigger ingestion/extraction/embedding/knowledge refresh.
Watcher must not trigger planning.
```

```text
No runtime refactor may silently change existing user-facing behavior unless explicitly documented.
```

---

# Phase 1 Step Breakdown

## Step 1.1 — Runtime Ingestion Audit

### Objective

Audit the actual ingestion-related runtime code before changing it.

### Files to inspect

```text
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/indexer/fileScanner.js
services/api/src/automation/localPipeline.js
services/api/src/watcher/watchService.js
services/api/src/extractors/extractionRunner.js
services/api/src/db/client.js
services/api/src/db/schema.sql
services/api/test/localMvp.test.js
```

### Deliverables

```text
- identify exact ingestion flow
- identify current automatic planning coupling
- identify DB writes involved in ingestion
- identify watcher ingestion behavior
- identify extraction/reporting gaps
- identify regression-sensitive endpoints
```

### Runtime changes

```text
None
```

### Risk

```text
LOW
```

---

## Step 1.2 — Define Target Ingestion Service Boundary

### Objective

Define the implementation boundary for a future `ingestionService` without yet performing a large refactor.

### Target future module

```text
services/api/src/ingestion/ingestionService.js
```

### Responsibilities

```text
- index source path
- scan folder
- persist indexed files
- return ingestion summary
- optionally run extraction/embedding/knowledge pipeline
- never generate planning suggestions
```

### Deliverables

```text
- small implementation design
- service method signatures
- compatibility strategy for existing routes
```

### Runtime changes

Possibly none, unless a very small safe helper is introduced.

### Risk

```text
LOW
```

---

## Step 1.3 — Split Local Automation Pipeline Into Knowledge Pipeline and Planning Pipeline

### Objective

Remove the conceptual and runtime coupling where ingestion can automatically generate organization suggestions.

### Current issue

`runLocalAutomationPipeline()` can currently run:

```text
extraction
embeddings
insights
knowledge
suggestions
```

### Target separation

```text
runKnowledgeIngestionPipeline()
  - extraction
  - embeddings
  - insights
  - knowledge build

runPlanningPipeline()
  - suggestions only when user starts planning
```

### Files likely affected

```text
services/api/src/automation/localPipeline.js
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/watcher/watchService.js
services/api/src/routes/actions.routes.js
```

### Deliverables

```text
- ingestion no longer automatically creates planning suggestions
- planning remains available through existing suggestion endpoint
- current routes remain compatible
- no execution behavior changed
```

### Risk

```text
MEDIUM
```

### Why medium

This changes automatic side effects. It is the first meaningful runtime behavior cleanup.

### Required verification

```text
- indexing still works
- extraction still works
- embeddings still work
- insights/knowledge still work
- suggestions still work when explicitly requested
- watcher no longer creates suggestions automatically
```

---

## Step 1.4 — Add Ingestion Result Shape / Summary Normalization

### Objective

Make ingestion responses clearer and more consistent without breaking compatibility.

### Target summary fields

```text
sourcePath
indexed
skipped
failed
extracted
embedded
insightsGenerated
knowledgeUpdated
errors
warnings
```

### Files likely affected

```text
services/api/src/automation/localPipeline.js
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
```

### Deliverables

```text
- normalized ingestion summary object
- preserve old response fields where possible
- improve visibility of what happened
```

### Risk

```text
LOW-MEDIUM
```

---

## Step 1.5 — Improve Failed File and Extraction Reporting

### Objective

Make failed indexing/extraction easier to understand and later show in UI.

### Focus

```text
- skipped file reasons
- failed indexing errors
- failed extraction errors
- unsupported file types
- too-large files
- excluded paths/extensions
```

### Files likely affected

```text
services/api/src/indexer/fileScanner.js
services/api/src/extractors/extractionRunner.js
services/api/src/db/client.js
services/api/src/routes/files.routes.js
services/api/src/routes/system.routes.js
```

### Deliverables

```text
- clearer failed/skipped reporting
- no scan should fail completely because one file fails
- status endpoint should expose useful counts if safe
```

### Risk

```text
MEDIUM
```

---

## Step 1.6 — Source Path Remove/Cleanup Policy Decision Point

### Objective

Define and implement only the safe minimum behavior for removing source paths from scope.

### Important decision

Removing source path can mean different things:

```text
Option A: remove watch root only
Option B: mark indexed files as removed_from_scope
Option C: delete indexed metadata/extractions/embeddings
Option D: ask user which cleanup mode to use
```

### Recommendation for Phase 1

Implement or preserve the safest behavior:

```text
remove source path from active scope
stop watcher
DO NOT delete indexed knowledge silently
```

If runtime change is needed, implement `removed_from_scope` only in a later DB/state phase.

### Stop condition

If cleanup behavior needs a product decision, stop and ask user.

### Risk

```text
MEDIUM
```

---

## Step 1.7 — Add Regression Tests for Ingestion/Planning Separation

### Objective

Protect the most important Phase 1 behavior change.

### Tests should verify

```text
- indexing pipeline does not auto-create suggestions
- explicit suggestion generation still works
- watcher ingestion does not auto-create suggestions
- extraction and knowledge pipeline still run
```

### Files likely affected

```text
services/api/test/localMvp.test.js
or new test file under services/api/test/
```

### Risk

```text
LOW-MEDIUM
```

---

## Step 1.8 — Phase 1 Runtime Verification

### Objective

Run verification after implementation.

### Verification checklist

```text
npm test
manual index test
manual extract test
manual embeddings test
manual knowledge build test
manual explicit suggestions test
manual watcher sanity check if possible
```

### Risk

```text
LOW
```

---

## Step 1.9 — Phase 1 Completion Due Diligence

### Objective

Confirm Phase 1 is complete and ready for Phase 2 planning.

### Verify

```text
- ingestion no longer triggers planning automatically
- current MVP functionality remains intact
- source path behavior is safe
- failed-file reporting improved
- tests pass or known limitations documented
- no unsafe filesystem behavior introduced
```

### Deliverable

```text
docs/PHASE1_COMPLETION_DUE_DILIGENCE.md
```

---

# Proposed Implementation Order

```text
1. Step 1.1 Runtime Ingestion Audit
2. Step 1.2 Define Target Ingestion Service Boundary
3. Step 1.3 Split Knowledge Pipeline from Planning Pipeline
4. Step 1.4 Normalize Ingestion Result Shape
5. Step 1.5 Improve Failure Reporting
6. Step 1.6 Source Path Cleanup Policy
7. Step 1.7 Regression Tests
8. Step 1.8 Runtime Verification
9. Step 1.9 Completion Due Diligence
```

---

# Phase 1 Due Diligence

## Architecture consistency

```text
PASS
```

Phase 1 follows the Phase 0 module boundaries.

## Dependency order

```text
PASS
```

The plan audits before refactoring, then separates pipelines before adding tests.

## Runtime safety

```text
PASS WITH MEDIUM RISK
```

The main runtime risk is Step 1.3 because it intentionally changes automatic suggestion side effects.

## Filesystem safety

```text
PASS
```

No execution behavior changes are planned.

## User approval requirement

```text
REQUIRED BEFORE IMPLEMENTATION
```

Because Phase 1 may change runtime behavior.

---

# Recommendation

Assistant recommendation:

```text
Approve Phase 1 plan.
Begin Step 1.1 Runtime Ingestion Audit.
Do not modify runtime code until Step 1.1 and Step 1.2 are complete.
```
