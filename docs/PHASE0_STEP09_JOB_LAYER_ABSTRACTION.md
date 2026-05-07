# Phase 0 — Step 0.9 Job Layer Abstraction

## Status

```text
COMPLETE
```

## Objective

Define the official job layer abstraction for EverythingAI so long-running and repeatable work can be tracked, retried, cancelled, observed, and later moved to a real queue/worker architecture without redesigning the platform.

This document is part of **Improvement Project One**.

---

# Core Job Principle

Anything that may take time, process many files, retry after failure, or update progress should be represented as a job.

Examples:

```text
- index source path
- extract files
- generate embeddings
- build knowledge
- run planning
- create previews
- execute actions
- sync integration
- watcher cycle
```

The current MVP can still run jobs synchronously at first, but the architecture must treat these workflows as jobs.

---

# Why a Job Layer Is Required

EverythingAI has many long-running operations:

```text
folder scanning
content extraction
embedding generation
knowledge building
planning sessions
bulk previews
bulk execution
integration sync
watcher cycles
```

Without a job layer, the system risks:

```text
- overlapping scans
- watcher storms
- UI uncertainty
- missing progress indicators
- failed work with no retry path
- stale partial states
- hard-to-debug background behavior
- blocked HTTP requests
```

---

# Job Layer Responsibilities

The job layer is responsible for:

```text
- creating jobs
- queueing jobs
- tracking status
- tracking progress
- recording input/output
- recording errors
- retrying failed work
- cancellation support
- preventing unsafe concurrency
- linking jobs to lifecycle events
- preparing future worker migration
```

The job layer is NOT responsible for:

```text
- implementing domain business logic
- generating embeddings itself
- extracting text itself
- executing files directly
- deciding planning suggestions
```

Jobs orchestrate work.

Domain services perform work.

---

# Job Types

Official job types:

```text
INDEX_SOURCE
EXTRACT_FILES
GENERATE_EMBEDDINGS
REGENERATE_STALE_EMBEDDINGS
BUILD_KNOWLEDGE
RUN_PLANNING
CREATE_PREVIEWS
EXECUTE_ACTIONS
UNDO_ACTIONS
WATCHER_CYCLE
SYNC_INTEGRATION
CLEANUP_SOURCE_SCOPE
```

---

# Job Contract

```ts
export type JobRecord = {
  jobId: string;
  jobType: JobType;
  status: JobStatus;
  priority: 'low' | 'normal' | 'high' | 'critical';

  sourceRootId?: string | null;
  fileId?: string | null;
  planningSessionId?: string | null;
  executionBatchId?: string | null;
  integrationId?: string | null;

  correlationId?: string | null;
  parentJobId?: string | null;

  input?: Record<string, unknown>;
  output?: Record<string, unknown>;

  progress: JobProgress;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string | null;

  createdAt: string;
  queuedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
};
```

---

# JobType

```ts
export type JobType =
  | 'INDEX_SOURCE'
  | 'EXTRACT_FILES'
  | 'GENERATE_EMBEDDINGS'
  | 'REGENERATE_STALE_EMBEDDINGS'
  | 'BUILD_KNOWLEDGE'
  | 'RUN_PLANNING'
  | 'CREATE_PREVIEWS'
  | 'EXECUTE_ACTIONS'
  | 'UNDO_ACTIONS'
  | 'WATCHER_CYCLE'
  | 'SYNC_INTEGRATION'
  | 'CLEANUP_SOURCE_SCOPE';
```

---

# JobStatus

```ts
export type JobStatus =
  | 'created'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';
```

---

# JobProgress

```ts
export type JobProgress = {
  percent?: number | null;
  currentStep?: string | null;
  totalItems?: number | null;
  completedItems?: number | null;
  failedItems?: number | null;
  skippedItems?: number | null;
  message?: string | null;
};
```

---

# Job State Machine

```text
created → queued
queued → running
running → completed
running → failed
running → retrying
retrying → queued
queued → cancelled
running → cancelled
failed → queued
```

Forbidden:

```text
completed → running
cancelled → running
failed → completed without running
```

---

# Job Ownership

Each job type has one owning module.

| Job Type | Owning Module |
|---|---|
| INDEX_SOURCE | Ingestion Module |
| EXTRACT_FILES | Extraction Module |
| GENERATE_EMBEDDINGS | Embeddings Module |
| REGENERATE_STALE_EMBEDDINGS | Embeddings Module |
| BUILD_KNOWLEDGE | Knowledge Module |
| RUN_PLANNING | Planning Module |
| CREATE_PREVIEWS | Preview Module |
| EXECUTE_ACTIONS | Execution Module |
| UNDO_ACTIONS | Execution Module |
| WATCHER_CYCLE | Watcher Module |
| SYNC_INTEGRATION | Integration Module |
| CLEANUP_SOURCE_SCOPE | Source Paths Module |

---

# Job Orchestration Rules

## Rule 1 — Jobs orchestrate services

Correct:

```text
Job Runner
  ↓
Domain Service
  ↓
Repository / Provider / Filesystem
```

Incorrect:

```text
Job Runner contains extraction/parsing/planning logic directly
```

---

## Rule 2 — Jobs must emit lifecycle events

Examples:

```text
JOB_CREATED
JOB_STARTED
JOB_PROGRESS_UPDATED
JOB_COMPLETED
JOB_FAILED
```

Domain-specific events should also be emitted by domain services.

---

## Rule 3 — Jobs must support correlation IDs

A full pipeline should be traceable.

Example:

```text
INDEX_SOURCE job
  ↓ same correlationId
EXTRACT_FILES job
  ↓ same correlationId
GENERATE_EMBEDDINGS job
  ↓ same correlationId
BUILD_KNOWLEDGE job
```

---

## Rule 4 — Jobs should be idempotent where possible

Running the same job twice should not corrupt data.

Examples:

```text
upsert indexed file
upsert extraction
upsert embedding
rebuild knowledge page
```

Execution jobs are special and must use stronger safeguards.

---

## Rule 5 — Execution jobs require approval

No job may execute filesystem actions unless the related previews are approved.

---

## Rule 6 — Watcher jobs must not trigger planning

Watcher cycles may create ingestion/extraction/embedding/knowledge jobs.

Watcher cycles must not create planning jobs automatically.

---

# Job Dependency Model

Jobs can create child jobs.

Example ingestion pipeline:

```text
INDEX_SOURCE
  ↓
EXTRACT_FILES
  ↓
GENERATE_EMBEDDINGS
  ↓
BUILD_KNOWLEDGE
```

Example planning pipeline:

```text
RUN_PLANNING
  ↓
CREATE_PREVIEWS
  ↓
EXECUTE_ACTIONS only after approval
```

These pipelines must remain separate.

---

# Concurrency Rules

## Rule 1 — One watcher cycle per source root

Prevent:

```text
WATCHER_CYCLE(sourceRootId=A)
WATCHER_CYCLE(sourceRootId=A)
```

from running at the same time.

---

## Rule 2 — Avoid duplicate file processing

Do not run multiple extraction/embedding jobs for the same unchanged file at the same time.

---

## Rule 3 — Planning must use a stable snapshot

Planning job must use a captured planning snapshot, not constantly changing live file context.

---

## Rule 4 — Execution must lock target files/actions

Execution jobs should prevent two actions from modifying the same file simultaneously.

---

# Retry Rules

## Retryable failures

```text
- temporary file access failure
- provider timeout
- watcher transient failure
- integration network issue
- temporary database lock
```

## Non-retryable failures

```text
- unsupported file type
- unsafe target path
- approval missing
- target file already exists
- provider disabled by policy
- source file removed permanently
```

## Retry policy

Default recommendation:

```text
maxAttempts = 3
backoff = exponential
```

Execution jobs require special handling and should not blindly retry unsafe filesystem operations.

---

# Cancellation Rules

Jobs should support cancellation when safe.

Safe to cancel:

```text
INDEX_SOURCE
EXTRACT_FILES
GENERATE_EMBEDDINGS
BUILD_KNOWLEDGE
RUN_PLANNING
SYNC_INTEGRATION
```

Careful cancellation required:

```text
EXECUTE_ACTIONS
UNDO_ACTIONS
```

because filesystem operations may be mid-action.

---

# Progress Reporting Rules

Each job should update:

```text
percent
currentStep
totalItems
completedItems
failedItems
skippedItems
message
```

This supports UI progress indicators later.

---

# Job Storage Strategy

## Current MVP

No formal job table yet.

Long-running work is mostly direct/synchronous.

## Future target

Add table:

```text
jobs
```

Possible related table:

```text
job_events
```

The current `audit_log` is not enough for detailed job progress.

---

# Suggested jobs table

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  source_root_id TEXT,
  file_id TEXT,
  planning_session_id TEXT,
  execution_batch_id TEXT,
  integration_id TEXT,
  correlation_id TEXT,
  parent_job_id TEXT,
  input_json TEXT,
  output_json TEXT,
  progress_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TEXT NOT NULL,
  queued_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT
);
```

---

# Job Layer Implementation Stages

## Stage 1 — Synchronous job wrapper

Wrap current direct work as job records but execute immediately.

Best for Phase 2.

## Stage 2 — In-process queue

Queue jobs in memory with concurrency control.

Best for local MVP hardening.

## Stage 3 — Persistent queue

Use SQLite jobs table for restart recovery.

Best for robust local MVP.

## Stage 4 — External queue

Use:

```text
Redis/BullMQ
Celery
other worker queue
```

Best for production architecture.

---

# Job API Target

Future endpoints:

```text
GET /api/jobs
GET /api/jobs/:jobId
POST /api/jobs/:jobId/cancel
POST /api/jobs/:jobId/retry
```

Domain endpoints can return job records:

```text
POST /api/index → JobRecord
POST /api/extract → JobRecord
POST /api/planning/sessions/:id/run → JobRecord
```

For compatibility, existing endpoints may keep synchronous response mode until UI is ready.

---

# Watcher Integration

Watcher should schedule jobs instead of directly running full pipelines.

Future flow:

```text
WATCHER_EVENT_RECEIVED
  ↓
WATCHER_CYCLE job queued
  ↓
INDEX_SOURCE job
  ↓
EXTRACT_FILES job
  ↓
GENERATE_EMBEDDINGS job
  ↓
BUILD_KNOWLEDGE job
```

No planning job should be created automatically by watcher.

---

# Planning Integration

Planning should be job-based:

```text
RUN_PLANNING job
  ↓
PlanningSession status running
  ↓
PlanningSuggestions created
  ↓
PlanningSession status ready/partially_ready/failed
```

---

# Execution Integration

Execution should be job-based for batch operations:

```text
EXECUTE_ACTIONS job
  ↓
ExecutionBatch running
  ↓
ActionExecution records
  ↓
ExecutionBatch completed/partially_failed/failed
```

Execution still requires explicit approval before job creation or execution.

---

# MVP Mapping

Current direct operations:

```text
POST /api/index
POST /api/extract
POST /api/embeddings
POST /api/insights
POST /api/suggestions
POST /api/action-previews
POST /api/action-executions
watchService.runQueuedCycle()
```

Future target:

```text
job-backed orchestration
```

without breaking existing API behavior initially.

---

# Known MVP Gaps

## Gap 1 — No jobs table

Future fix:

```text
jobs table
```

---

## Gap 2 — No unified progress reporting

Future fix:

```text
JobProgress
```

---

## Gap 3 — Watcher directly runs pipeline

Future fix:

```text
watcher schedules jobs
```

---

## Gap 4 — No cancellation support

Future fix:

```text
cancelable job statuses
```

---

## Gap 5 — No retry policy

Future fix:

```text
retryable/non-retryable error classification
```

---

# Recommended Future Module Structure

```text
services/api/src/jobs/jobService.js
services/api/src/jobs/jobRunner.js
services/api/src/jobs/jobQueue.js
services/api/src/jobs/jobPolicies.js
services/api/src/jobs/jobProgress.js
services/api/src/routes/jobs.routes.js
services/api/src/repositories/jobsRepository.js
```

Recommended future contracts:

```text
services/api/src/contracts/jobs.contracts.js
```

Recommended future tests:

```text
services/api/test/jobStateTransitions.test.js
services/api/test/jobRetryPolicy.test.js
services/api/test/jobConcurrency.test.js
services/api/test/watcherJobIntegration.test.js
```

---

# Step 0.9 Due Diligence

## Architecture consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Watcher compatibility

```text
PASS
```

## Planning/execution safety

```text
PASS
```

## Future production queue compatibility

```text
PASS
```

## Runtime regression risk

```text
LOW
```

This step is documentation and architecture-contract only. It does not change runtime behavior.

---

# Result

```text
Step 0.9 passes due diligence.
```

The project can proceed to:

```text
Step 0.10 — Define Observability & Diagnostics Layer
```
