# Phase 2 — Job Layer & Pipeline Orchestration Plan

## Status

```text
PLANNED
PENDING IMPLEMENTATION
```

## Objective

Introduce a lightweight job-layer foundation for EverythingAI so long-running workflows can be tracked, reported, retried later, and gradually moved toward async orchestration without destabilizing the current MVP.

Phase 2 builds directly on Phase 1, where ingestion and planning were separated.

---

# Phase 2 Scope

Phase 2 focuses on:

```text
- lightweight job abstraction
- synchronous job wrapper first
- job result/progress shape
- job lifecycle states
- job diagnostics foundation
- watcher readiness for job orchestration
- future queue compatibility
```

---

# Phase 2 Non-Goals

Phase 2 should NOT fully implement:

```text
- external queue system
- Redis/BullMQ/Celery worker architecture
- full persistent async scheduling
- planning sessions
- full observability dashboard
- frontend job-progress UI redesign
```

Those belong to later phases.

---

# Permanent Rules Applied in Phase 2

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

```text
Jobs orchestrate services.
Services perform domain work.
```

```text
No job may execute filesystem actions unless previews are approved.
```

```text
Watcher may schedule or run ingestion/knowledge jobs.
Watcher must not schedule planning jobs automatically.
```

---

# Phase 2 Step Breakdown

## Step 2.1 — Audit Current Long-Running Runtime Flows

### Objective

Identify which current runtime operations should become job-backed over time.

### Files to inspect

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
services/api/test/localMvp.test.js
```

### Deliverables

```text
- identify job candidates
- identify sync workflows to wrap first
- identify job status storage options
- identify route compatibility risks
- identify test impact
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

## Step 2.2 — Define Minimal Job Contract and Runtime Boundary

### Objective

Define the minimum job model that can be implemented without a large queue rewrite.

### Target future files

```text
services/api/src/jobs/jobService.js
services/api/src/jobs/jobRunner.js
services/api/src/jobs/jobTypes.js
```

### Minimum job fields

```text
jobId
jobType
status
progress
input
output
errorMessage
createdAt
startedAt
completedAt
```

### Runtime changes

Possibly documentation only or creation of constants/helpers.

### Risk

```text
LOW
```

---

## Step 2.3 — Implement In-Memory/Synchronous Job Wrapper

### Objective

Introduce a safe first job implementation that wraps existing synchronous work.

### Target behavior

```text
create job
mark running
execute function immediately
capture output/error
mark completed/failed
return job result
```

### Important rule

This should not change actual async behavior yet.

It creates a job abstraction without introducing concurrency complexity.

### Files likely affected

```text
services/api/src/jobs/jobService.js
services/api/src/jobs/jobRunner.js
services/api/src/jobs/jobTypes.js
services/api/test/localMvp.test.js
```

### Risk

```text
LOW-MEDIUM
```

---

## Step 2.4 — Wrap Knowledge Ingestion Pipeline as a Job

### Objective

Allow knowledge ingestion to be run through the job wrapper.

### Target flow

```text
runJob(INDEX_SOURCE or BUILD_KNOWLEDGE_PIPELINE)
  ↓
runKnowledgeIngestionPipeline()
```

### Compatibility strategy

Existing routes may still return current response shape, but include optional job metadata if safe.

### Files likely affected

```text
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/automation/localPipeline.js
services/api/src/jobs/*
```

### Risk

```text
MEDIUM
```

---

## Step 2.5 — Add Basic Job Route

### Objective

Expose basic job visibility for current in-memory/synchronous jobs.

### Target endpoints

```text
GET /api/jobs
GET /api/jobs/:jobId
```

### Future endpoints not required yet

```text
cancel
retry
```

### Files likely affected

```text
services/api/src/routes/jobs.routes.js
services/api/src/server.js
or central router registration file
```

### Risk

```text
MEDIUM
```

---

## Step 2.6 — Prepare Watcher Job Integration Without Full Queue

### Objective

Prepare watcher cycles to be represented as jobs without introducing external queues.

### Target behavior

```text
watcher cycle
  ↓
job wrapper records WATCHER_CYCLE
  ↓
scan + knowledge ingestion
```

### Important rule

Watcher still must not schedule planning jobs.

### Files likely affected

```text
services/api/src/watcher/watchService.js
services/api/src/jobs/*
services/api/test/localMvp.test.js
```

### Risk

```text
MEDIUM
```

---

## Step 2.7 — Add Job Regression Tests

### Objective

Protect job-layer behavior.

### Tests should verify

```text
- job wrapper marks completed job
- job wrapper captures failure
- knowledge ingestion can be job-wrapped
- watcher still does not create suggestions
- explicit planning remains separate
```

### Files likely affected

```text
services/api/test/localMvp.test.js
or new services/api/test/jobs.test.js
```

### Risk

```text
LOW-MEDIUM
```

---

## Step 2.8 — Runtime Verification

### Objective

Verify Phase 2 runtime behavior.

### Required verification

```text
npm test
manual job route check if server available
manual ingestion job check
watcher sanity check if possible
```

### Risk

```text
LOW
```

---

## Step 2.9 — Phase 2 Completion Due Diligence

### Objective

Confirm Phase 2 is complete and ready for Phase 3 planning.

### Deliverable

```text
docs/PHASE2_COMPLETION_DUE_DILIGENCE.md
```

---

# Proposed Implementation Order

```text
1. Step 2.1 Audit current long-running flows
2. Step 2.2 Define minimal job contract/runtime boundary
3. Step 2.3 Implement synchronous job wrapper
4. Step 2.4 Wrap knowledge ingestion pipeline as a job
5. Step 2.5 Add basic job route
6. Step 2.6 Prepare watcher job integration
7. Step 2.7 Add job regression tests
8. Step 2.8 Runtime verification
9. Step 2.9 Completion due diligence
```

---

# Phase 2 Due Diligence

## Architecture consistency

```text
PASS
```

The plan follows Phase 0 and Phase 1 boundaries.

## Dependency order

```text
PASS
```

The plan starts with audit and contract before implementation.

## Runtime safety

```text
PASS WITH MEDIUM RISK
```

The main risks are route integration and watcher job integration.

## Filesystem safety

```text
PASS
```

No execution behavior changes are required.

## Recommendation

```text
Approve Phase 2 plan.
Begin Step 2.1 audit before runtime changes.
```
