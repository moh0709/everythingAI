# Phase 0 — Step 0.10 Observability & Diagnostics Layer

## Status

```text
COMPLETE
```

## Objective

Define the official observability and diagnostics architecture for EverythingAI so the system can be debugged, monitored, audited, and operated reliably as it grows from local MVP to production platform.

This document is part of **Improvement Project One**.

---

# Core Observability Principle

EverythingAI must be explainable not only to users, but also to operators and developers.

Every major workflow should answer:

```text
What happened?
When did it happen?
What module did it happen in?
Which file/source/job/session was involved?
Did it succeed or fail?
Why did it fail?
Can it be retried?
Was it safe?
```

---

# Observability Responsibilities

The observability layer is responsible for:

```text
- structured logs
- lifecycle event visibility
- job visibility
- pipeline diagnostics
- failure diagnostics
- watcher diagnostics
- provider diagnostics
- retrieval diagnostics
- planning diagnostics
- execution audit visibility
- health/status reporting
- performance timing
```

The observability layer is NOT responsible for:

```text
- performing business logic
- deciding planning outcomes
- executing filesystem actions
- storing full sensitive document contents
- replacing audit logs
```

---

# Main Observability Domains

## 1. Structured Logs

Logs should be structured enough to filter by:

```text
module
level
entityType
entityId
jobId
correlationId
sourceRootId
fileId
planningSessionId
executionId
```

Recommended log levels:

```text
debug
info
warning
error
critical
```

---

## 2. Lifecycle Events

Lifecycle events describe system progress over time.

Examples:

```text
FILE_INDEXED
EXTRACTION_COMPLETED
EMBEDDING_GENERATED
KNOWLEDGE_UPDATED
PLANNING_COMPLETED
ACTION_EXECUTED
JOB_FAILED
```

Lifecycle events support:

```text
- tracing
- UI progress
- diagnostics
- future queue visibility
```

---

## 3. Audit Logs

Audit logs are for accountability and safety-sensitive history.

Audit-worthy events include:

```text
- source path added/removed
- provider configuration changed
- planning session approved
- action preview approved/rejected
- file renamed/moved
- action failed
- action undone
```

Every filesystem action must be auditable.

---

## 4. Job Diagnostics

Job diagnostics answer:

```text
What job is running?
How far has it progressed?
Which item failed?
Will it retry?
What caused the failure?
```

Job diagnostics must include:

```text
jobId
jobType
status
progress
attempts
errorMessage
startedAt
completedAt
```

---

## 5. Pipeline Diagnostics

Pipeline diagnostics show the state of:

```text
ingestion
extraction
embeddings
knowledge
planning
previews
execution
```

They should expose:

```text
- counts
- failures
- stale records
- skipped records
- last successful run
- current active jobs
```

---

## 6. Watcher Diagnostics

Watcher diagnostics show live folder monitoring behavior.

Required visibility:

```text
sourceRootId
rootPath
watcherStatus
lastEventAt
lastCycleStartedAt
lastCycleCompletedAt
queuedCycleCount
runningCycle
lastError
```

Watcher diagnostics are critical because watcher issues can create confusing user experiences.

---

## 7. Provider Diagnostics

Provider diagnostics show AI provider status without leaking secrets.

Required visibility:

```text
provider
model
enabled status
remote policy status
last test status
last execution status
last error
latency
```

Provider diagnostics must never expose:

```text
API keys
secrets
tokens
raw authorization headers
```

---

## 8. Retrieval Diagnostics

Retrieval diagnostics explain why search/chat/wiki returned certain results.

Useful fields:

```text
query
mode
intent
retrievalPlan
adaptersUsed
resultCounts
rankingStrategy
fallbackUsed
latency
```

In production, query logging must respect privacy policy.

---

## 9. Planning Diagnostics

Planning diagnostics explain why suggestions were generated.

Useful fields:

```text
planningSessionId
mode
provider
settings
filesAnalyzed
suggestionsGenerated
averageConfidence
blockedByPolicy
failedFiles
fallbackUsed
```

---

## 10. Execution Diagnostics

Execution diagnostics explain action outcomes.

Useful fields:

```text
executionId
previewId
fileId
actionType
sourcePath
targetPath
status
errorMessage
undoAvailable
```

Execution diagnostics overlap with audit logs and must remain safety-focused.

---

# Canonical Diagnostic Record

```ts
export type DiagnosticRecord = {
  diagnosticId: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  module: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  jobId?: string | null;
  correlationId?: string | null;
  sourceRootId?: string | null;
  fileId?: string | null;
  planningSessionId?: string | null;
  executionId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
```

---

# Health Status Contract

```ts
export type SystemHealthStatus = {
  status: 'ok' | 'degraded' | 'failed';
  service: string;
  timestamp: string;
  database: ComponentHealth;
  watcher: ComponentHealth;
  jobs: ComponentHealth;
  providers: ComponentHealth[];
  retrieval: ComponentHealth;
  storage?: ComponentHealth;
};

export type ComponentHealth = {
  name: string;
  status: 'ok' | 'degraded' | 'failed' | 'unknown';
  message?: string | null;
  lastCheckedAt: string;
  metrics?: Record<string, unknown>;
};
```

---

# Metrics Categories

## Ingestion Metrics

```text
totalFilesDiscovered
totalFilesIndexed
totalFilesSkipped
totalFilesFailed
lastIndexedAt
```

## Extraction Metrics

```text
totalExtracted
totalUnsupported
totalFailed
averageExtractionTimeMs
```

## Embedding Metrics

```text
totalEmbedded
totalStaleEmbeddings
totalEmbeddingFailures
embeddingProvider
embeddingModel
averageEmbeddingTimeMs
```

## Retrieval Metrics

```text
totalSearches
averageSearchLatencyMs
fallbackCount
zeroResultCount
```

## Planning Metrics

```text
totalPlanningSessions
totalSuggestions
averageConfidence
blockedSuggestions
providerFallbackCount
```

## Execution Metrics

```text
totalExecutions
totalFailedExecutions
totalUndoActions
blockedPreviewCount
```

## Watcher Metrics

```text
activeWatchRoots
watcherCyclesCompleted
watcherCyclesFailed
lastWatcherEventAt
queuedWatcherCycles
```

## Provider Metrics

```text
providerStatus
modelStatus
lastLatencyMs
lastError
remoteProvidersEnabled
```

---

# Privacy Rules

Observability must not store:

```text
- API keys
- provider secrets
- full extracted document text
- full prompts by default
- full user chat history by default
- sensitive personal data unless explicitly enabled
```

Observability may store:

```text
- IDs
- counts
- statuses
- timings
- error messages
- short safe snippets if explicitly allowed
```

---

# Current MVP Mapping

Current health endpoint:

```text
GET /health
```

Current status endpoint:

```text
GET /api/status
```

Current audit support:

```text
audit_log table
```

Current system counts:

```text
getSystemStatus()
```

Current gaps:

```text
- no structured diagnostics table
- no job diagnostics table
- no correlation IDs
- limited watcher diagnostics
- limited provider diagnostics
- limited retrieval diagnostics
```

---

# Recommended Future Module Structure

```text
services/api/src/observability/diagnosticService.js
services/api/src/observability/healthService.js
services/api/src/observability/metricsService.js
services/api/src/observability/logRedaction.js
services/api/src/routes/diagnostics.routes.js
services/api/src/repositories/diagnosticsRepository.js
```

Recommended future contracts:

```text
services/api/src/contracts/diagnostics.contracts.js
services/api/src/contracts/health.contracts.js
services/api/src/contracts/metrics.contracts.js
```

Recommended future tests:

```text
services/api/test/diagnosticsRedaction.test.js
services/api/test/healthStatus.test.js
services/api/test/jobDiagnostics.test.js
services/api/test/watcherDiagnostics.test.js
```

---

# Recommended Future API Endpoints

```text
GET /api/health
GET /api/status
GET /api/diagnostics
GET /api/diagnostics/jobs
GET /api/diagnostics/watchers
GET /api/diagnostics/providers
GET /api/diagnostics/retrieval
GET /api/audit-log
```

Existing endpoints can remain for compatibility.

---

# Observability Implementation Stages

## Stage 1 — Extend current status output

Add more structured status fields without schema changes.

## Stage 2 — Add diagnostics service

Centralize diagnostic record creation and redaction.

## Stage 3 — Add jobs + job diagnostics

Expose job progress and failure causes.

## Stage 4 — Add watcher/provider/retrieval diagnostics

Make major operational systems visible.

## Stage 5 — Add production monitoring hooks

Prepare external monitoring and alerting.

---

# Step 0.10 Due Diligence

## Architecture consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Privacy/safety consistency

```text
PASS
```

## Job/watcher compatibility

```text
PASS
```

## Future production compatibility

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
Step 0.10 passes due diligence.
```

The project can proceed to:

```text
Step 0.11 — Final Phase 0 Due Diligence
```
