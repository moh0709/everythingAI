# Phase 2 — Step 2.2 Minimal Job Contract and Runtime Boundary

## Status

```text
COMPLETE
```

## Objective

Define the minimal job contract and runtime boundary for EverythingAI before implementing the lightweight job layer.

This step prepares a low-risk synchronous job wrapper that can later evolve into persistent jobs and external queues.

---

# Core Job Principle

A job is an orchestration record around work that may be long-running, failure-prone, user-visible, or useful to track.

Jobs do not own business logic.

Correct pattern:

```text
Job Runner
  ↓
Domain Service
  ↓
Repository / Provider / Filesystem
```

Incorrect pattern:

```text
Job Runner contains ingestion/extraction/planning/execution rules directly
```

---

# Phase 2 Minimal Job Strategy

Phase 2 should begin with:

```text
in-memory job records
synchronous execution
completed/failed status capture
basic progress shape
GET visibility endpoints
```

Phase 2 should not yet require:

```text
jobs database table
external queue
worker service
Redis/BullMQ/Celery
background execution after HTTP response
```

---

# Minimal Job Contract

```ts
export type JobRecord = {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: 'low' | 'normal' | 'high' | 'critical';
  progress: JobProgress;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};
```

---

# Minimal Job Types

Phase 2 should start with these types:

```text
KNOWLEDGE_INGESTION_PIPELINE
WATCHER_CYCLE
```

Supported but optional in later Phase 2:

```text
INDEX_SOURCE
EXTRACT_FILES
GENERATE_EMBEDDINGS
GENERATE_INSIGHTS
BUILD_KNOWLEDGE
```

Deferred:

```text
RUN_PLANNING
CREATE_PREVIEWS
EXECUTE_ACTIONS
UNDO_ACTIONS
```

Reason:

```text
Planning sessions and execution jobs require stronger lifecycle and safety rules.
```

---

# Minimal Job Statuses

```ts
export type JobStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed';
```

Phase 2 intentionally does not yet include:

```text
queued
retrying
cancelled
```

These belong to the future persistent/async job layer.

---

# Minimal Job Progress

```ts
export type JobProgress = {
  percent: number | null;
  currentStep: string | null;
  totalItems: number | null;
  completedItems: number | null;
  failedItems: number | null;
  skippedItems: number | null;
  message: string | null;
};
```

For Phase 2 synchronous jobs, progress may be coarse.

Recommended initial values:

```text
created: percent 0
running: percent 10
completed: percent 100
failed: percent null or last known
```

---

# Runtime Boundary

## New target files

```text
services/api/src/jobs/jobTypes.js
services/api/src/jobs/jobService.js
services/api/src/jobs/jobRunner.js
services/api/src/routes/jobs.routes.js
```

---

# jobTypes.js Responsibility

Defines:

```text
- JOB_TYPES
- JOB_STATUSES
- helper validation if needed
```

No runtime execution logic.

---

# jobService.js Responsibility

Owns in-memory job state:

```text
createJob()
startJob()
completeJob()
failJob()
getJob()
listJobs()
clearOldJobs() optional later
```

For Phase 2, this can use:

```text
Map<string, JobRecord>
```

---

# jobRunner.js Responsibility

Wraps synchronous domain work:

```text
runJob({ type, input }, async (job) => {
  return await domainWork();
});
```

It should:

```text
1. create job
2. mark running
3. execute callback
4. mark completed with output
5. mark failed on error
6. rethrow error or return failed job depending route use
```

Recommended default:

```text
rethrow errors after recording failed job
```

This preserves existing route error behavior.

---

# jobs.routes.js Responsibility

Expose read-only job visibility first:

```text
GET /api/jobs
GET /api/jobs/:jobId
```

Do not implement yet:

```text
POST cancel
POST retry
```

---

# Job Record Retention

Because jobs are in-memory in Phase 2:

```text
jobs reset on server restart
```

This is acceptable for Phase 2.

Future persistent jobs can use:

```text
jobs table
job_events table
```

---

# Compatibility Rules

## Rule 1 — Do not break current synchronous endpoints

Existing routes should still return the current result payload.

If job wrapping is added, route responses may include:

```text
job
```

or:

```text
jobId
```

but should not become async-only yet.

---

## Rule 2 — Preserve error behavior

If a route currently fails through Express error handling, job wrapper should record failure and still let the route fail normally.

---

## Rule 3 — No execution jobs yet

Do not job-wrap filesystem execution actions in early Phase 2.

---

## Rule 4 — Watcher must not create planning jobs

Watcher job integration may create:

```text
WATCHER_CYCLE
KNOWLEDGE_INGESTION_PIPELINE
```

but not:

```text
RUN_PLANNING
EXECUTE_ACTIONS
```

---

# Recommended Job Response Shape

When routes include job metadata, use:

```ts
job: {
  id: string;
  type: string;
  status: string;
  progress: JobProgress;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
```

Avoid returning full sensitive input/output by default in route payloads unless useful.

---

# Future Migration Path

## Phase 2

```text
in-memory synchronous jobs
```

## Later phase

```text
SQLite jobs table
```

## Production phase

```text
external queue / worker system
```

The same job contract should be compatible across all three levels.

---

# Step 2.2 Due Diligence

## Architecture consistency

```text
PASS
```

The job boundary follows Phase 0 and Phase 2 principles.

## Runtime safety

```text
PASS
```

No runtime code changed in this step.

## Implementation readiness

```text
PASS
```

The project can proceed to Step 2.3.

## Main watchpoint

```text
Do not accidentally make routes async-only.
```

---

# Result

```text
Step 2.2 passes due diligence.
```

The project can proceed to:

```text
Step 2.3 — Implement In-Memory/Synchronous Job Wrapper
```
