# Phase 0 — Step 0.4 Lifecycle Event System

## Status

```text
COMPLETE
```

## Objective

Define the lifecycle event system for EverythingAI so ingestion, extraction, embeddings, knowledge, retrieval, planning, previews, execution, jobs, and observability can communicate through stable event semantics.

This document is part of **Improvement Project One**.

---

# Why Lifecycle Events Matter

EverythingAI processes files through many stages:

```text
source path
  ↓
file discovery
  ↓
indexing
  ↓
extraction
  ↓
embeddings
  ↓
knowledge build
  ↓
retrieval/search/chat/wiki
  ↓
planning
  ↓
preview
  ↓
approval
  ↓
execution
  ↓
audit/undo
```

Without a formal event model, later implementation will become tightly coupled and hard to debug.

Lifecycle events allow:

```text
- status tracking
- progress reporting
- auditability
- async job migration
- watcher stability
- UI updates
- retries
- diagnostics
- future worker queues
```

---

# Core Event Principle

Events describe something that happened.

They must not directly perform business logic.

Correct pattern:

```text
Module performs action
  ↓
Module records event
  ↓
Observers/jobs/UI can react later
```

Incorrect pattern:

```text
Event directly moves files
Event directly changes planning rules
Event directly calls external provider unexpectedly
```

---

# Event Categories

## 1. Source Path Events

Source path events describe user-approved filesystem scope changes.

```text
SOURCE_PATH_ADDED
SOURCE_PATH_PAUSED
SOURCE_PATH_RESUMED
SOURCE_PATH_REMOVED
SOURCE_PATH_FAILED
```

### Owner

```text
Source Paths Module
```

### Notes

Removing a source path from scope must not silently delete indexed knowledge unless a future explicit cleanup policy is approved.

---

## 2. File Ingestion Events

File ingestion events describe file discovery and indexing.

```text
FILE_DISCOVERED
FILE_INDEXED
FILE_SKIPPED
FILE_INDEX_FAILED
FILE_CHANGED
FILE_REMOVED_FROM_SCOPE
```

### Owner

```text
Ingestion Module
```

### Notes

These events are allowed to trigger extraction/embedding/knowledge jobs later.

They must not trigger planning automatically.

---

## 3. Extraction Events

Extraction events describe document text extraction.

```text
EXTRACTION_STARTED
EXTRACTION_COMPLETED
EXTRACTION_FAILED
EXTRACTION_UNSUPPORTED
EXTRACTION_SKIPPED
```

### Owner

```text
Extraction Module
```

### Notes

Extraction events can update knowledge readiness.

They must not create planning suggestions directly.

---

## 4. Embedding Events

Embedding events describe vector-generation lifecycle.

```text
EMBEDDING_STARTED
EMBEDDING_GENERATED
EMBEDDING_FAILED
EMBEDDING_SKIPPED
EMBEDDING_STALE
```

### Owner

```text
Embeddings Module
```

### Notes

Embedding events support semantic search readiness and future re-embedding jobs.

---

## 5. Knowledge Events

Knowledge events describe generated knowledge and wiki readiness.

```text
KNOWLEDGE_BUILD_STARTED
KNOWLEDGE_UPDATED
KNOWLEDGE_BUILD_FAILED
KNOWLEDGE_PAGE_CREATED
KNOWLEDGE_PAGE_UPDATED
KNOWLEDGE_PAGE_STALE
```

### Owner

```text
Knowledge Module
```

### Notes

Knowledge events support:

```text
- Wiki
- Technical Manual
- Help Manual
- source maps
- entity pages
- topic pages
```

Knowledge events must not execute file actions.

---

## 6. Retrieval Events

Retrieval events describe search/chat/wiki retrieval activity.

```text
RETRIEVAL_REQUESTED
RETRIEVAL_INTENT_DETECTED
RETRIEVAL_COMPLETED
RETRIEVAL_FAILED
```

### Owner

```text
Search & Retrieval Module
```

### Notes

These events are useful for diagnostics and ranking improvements.

They should not store sensitive query contents in production without a privacy policy.

---

## 7. Chat Events

Chat events describe AI answer generation.

```text
CHAT_REQUESTED
CHAT_RETRIEVAL_COMPLETED
CHAT_PROVIDER_STARTED
CHAT_PROVIDER_COMPLETED
CHAT_PROVIDER_FAILED
CHAT_FALLBACK_USED
```

### Owner

```text
AI Chat Module
```

### Notes

Chat must use the shared retrieval engine.

Chat events should preserve source-reference visibility.

---

## 8. Planning Events

Planning events describe user-initiated organization planning.

```text
PLANNING_SESSION_CREATED
PLANNING_STARTED
PLANNING_COMPLETED
PLANNING_FAILED
PLANNING_CANCELLED
PLANNING_SUGGESTION_CREATED
PLANNING_SUGGESTION_REJECTED
```

### Owner

```text
Planning Module
```

### Notes

Planning events must only happen after explicit user planning initiation.

Planning must not execute filesystem operations.

---

## 9. Preview Events

Preview events describe action validation.

```text
PREVIEW_CREATED
PREVIEW_READY
PREVIEW_BLOCKED
PREVIEW_INVALIDATED
```

### Owner

```text
Preview Module
```

### Notes

Preview events are the safety checkpoint between planning and execution.

---

## 10. Approval Events

Approval events describe user approval decisions.

```text
ACTION_APPROVED
ACTION_REJECTED
EXECUTION_BATCH_APPROVED
EXECUTION_BATCH_REJECTED
```

### Owner

```text
Approval / Execution Boundary
```

### Notes

Approval does not mean execution succeeded.

Execution success requires a separate execution event.

---

## 11. Execution Events

Execution events describe actual file or app-level action attempts.

```text
ACTION_EXECUTION_STARTED
ACTION_EXECUTED
ACTION_FAILED
ACTION_UNDO_STARTED
ACTION_UNDONE
ACTION_UNDO_FAILED
```

### Owner

```text
Execution Module
```

### Notes

Filesystem execution must only happen here.

No other module may emit `ACTION_EXECUTED`.

---

## 12. Watcher Events

Watcher events describe live filesystem monitoring.

```text
WATCHER_STARTED
WATCHER_STOPPED
WATCHER_EVENT_RECEIVED
WATCHER_CYCLE_QUEUED
WATCHER_CYCLE_STARTED
WATCHER_CYCLE_COMPLETED
WATCHER_CYCLE_FAILED
```

### Owner

```text
Watcher Module
```

### Notes

Watcher events may lead to ingestion jobs.

Watcher events must not directly lead to planning suggestions or execution.

---

## 13. Job Events

Job events describe async lifecycle.

```text
JOB_CREATED
JOB_QUEUED
JOB_STARTED
JOB_PROGRESS_UPDATED
JOB_COMPLETED
JOB_FAILED
JOB_CANCELLED
JOB_RETRIED
```

### Owner

```text
Job Layer Module
```

### Notes

The current MVP does not yet have a formal job layer.

These events prepare future worker/queue architecture.

---

## 14. Provider Events

Provider events describe AI/external provider lifecycle.

```text
PROVIDER_CONNECTION_TEST_STARTED
PROVIDER_CONNECTION_TEST_COMPLETED
PROVIDER_CONNECTION_TEST_FAILED
PROVIDER_MODEL_DISCOVERY_STARTED
PROVIDER_MODEL_DISCOVERY_COMPLETED
PROVIDER_MODEL_DISCOVERY_FAILED
PROVIDER_EXECUTION_STARTED
PROVIDER_EXECUTION_COMPLETED
PROVIDER_EXECUTION_FAILED
```

### Owner

```text
Provider Module
```

### Notes

Provider events must not leak secrets or API keys.

---

## 15. Integration Events

Integration events describe external sync lifecycle.

```text
INTEGRATION_SYNC_STARTED
INTEGRATION_SYNC_COMPLETED
INTEGRATION_SYNC_FAILED
INTEGRATION_RECORD_SKIPPED
```

### Owner

```text
Integration Module
```

---

## 16. System Events

System events describe app-level operational state.

```text
SYSTEM_STARTED
SYSTEM_STOPPED
SYSTEM_STATUS_CHECKED
SYSTEM_CONFIG_UPDATED
SYSTEM_ERROR
```

### Owner

```text
System Module
```

---

# Canonical Event Contract

The canonical event shape is:

```ts
export type LifecycleEvent = {
  eventId: string;
  eventType: LifecycleEventType;
  entityType: LifecycleEntityType;
  entityId: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  sourceModule: string;
  jobId?: string | null;
  correlationId?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  deviceId?: string | null;
  payload?: Record<string, unknown>;
  createdAt: string;
};
```

---

# Entity Types

```text
source_path
file
extraction
embedding
knowledge_page
retrieval_request
chat_request
planning_session
planning_suggestion
action_preview
action_execution
watcher
job
provider
integration
system
```

---

# Event Severity Rules

## debug

Used for verbose internal diagnostics.

## info

Used for normal successful lifecycle events.

## warning

Used for non-blocking issues, skipped items, stale data, or recoverable problems.

## error

Used for failed operations that require attention.

## critical

Used for safety-sensitive failures or data-integrity risks.

---

# Event Source Rules

Each module may only emit events it owns.

Examples:

```text
Ingestion Module → FILE_INDEXED
Extraction Module → EXTRACTION_COMPLETED
Planning Module → PLANNING_SUGGESTION_CREATED
Execution Module → ACTION_EXECUTED
```

Forbidden:

```text
Planning Module → ACTION_EXECUTED
Watcher Module → PLANNING_SUGGESTION_CREATED
Knowledge Module → ACTION_APPROVED
Provider Module → FILE_INDEXED
```

---

# Correlation IDs

Long-running flows should use a shared correlation ID.

Example ingestion flow:

```text
correlationId: ingest-2026-xxxx

SOURCE_PATH_ADDED
FILE_DISCOVERED
FILE_INDEXED
EXTRACTION_STARTED
EXTRACTION_COMPLETED
EMBEDDING_STARTED
EMBEDDING_GENERATED
KNOWLEDGE_UPDATED
```

Example planning flow:

```text
correlationId: planning-session-xxxx

PLANNING_SESSION_CREATED
PLANNING_STARTED
PLANNING_SUGGESTION_CREATED
PLANNING_COMPLETED
PREVIEW_CREATED
PREVIEW_READY
ACTION_APPROVED
ACTION_EXECUTION_STARTED
ACTION_EXECUTED
```

---

# Event Storage Strategy

## Current MVP

The current MVP already has:

```text
audit_log
```

This can be used as the initial event storage foundation.

## Future target

Later, events can be stored in:

```text
lifecycle_events
```

or split into:

```text
audit_log
job_events
system_events
```

depending on production requirements.

---

# Audit Log vs Lifecycle Events

## Audit log

Audit log is for important accountability events.

Examples:

```text
ACTION_EXECUTED
ACTION_FAILED
ACTION_UNDONE
SOURCE_PATH_REMOVED
PROVIDER_CONFIG_UPDATED
```

## Lifecycle events

Lifecycle events include both audit-worthy and operational events.

Examples:

```text
FILE_DISCOVERED
EXTRACTION_STARTED
JOB_PROGRESS_UPDATED
RETRIEVAL_COMPLETED
```

### Rule

Not every lifecycle event must be an audit event.

But every filesystem action event must be auditable.

---

# Event Privacy Rules

Events must not store:

```text
- API keys
- provider secrets
- full document text
- sensitive file contents
- unnecessary personal data
```

Events may store:

```text
- fileId
- sourceRootId
- status
- small snippets if explicitly allowed
- error messages
- counts
- timing metadata
```

---

# Event Usage by Future Phases

## Phase 1 — Knowledge Ingestion Core

Uses:

```text
SOURCE_PATH_ADDED
FILE_DISCOVERED
FILE_INDEXED
FILE_SKIPPED
EXTRACTION_COMPLETED
EXTRACTION_FAILED
```

## Phase 2 — Async Pipeline & Job Layer

Uses:

```text
JOB_CREATED
JOB_STARTED
JOB_PROGRESS_UPDATED
JOB_COMPLETED
JOB_FAILED
```

## Phase 3 — Planning Separation

Uses:

```text
PLANNING_SESSION_CREATED
PLANNING_STARTED
PLANNING_COMPLETED
```

## Phase 4 — Planning Engine Rebuild

Uses:

```text
PLANNING_SUGGESTION_CREATED
PLANNING_FAILED
```

## Phase 5A — Unified Search & Retrieval

Uses:

```text
RETRIEVAL_REQUESTED
RETRIEVAL_INTENT_DETECTED
RETRIEVAL_COMPLETED
```

## Phase 5C — AI Knowledge Chat

Uses:

```text
CHAT_REQUESTED
CHAT_PROVIDER_COMPLETED
CHAT_FALLBACK_USED
```

## Phase 6 — Safety & Rule Enforcement

Uses:

```text
PREVIEW_BLOCKED
ACTION_REJECTED
ACTION_FAILED
```

## Phase 7 — Watcher Stability

Uses:

```text
WATCHER_EVENT_RECEIVED
WATCHER_CYCLE_QUEUED
WATCHER_CYCLE_COMPLETED
WATCHER_CYCLE_FAILED
```

---

# Current MVP Gaps

## Gap 1 — No generic lifecycle event store yet

Current audit_log can cover some events but not all operational events.

Future fix:

```text
lifecycle_events table or job_events table
```

---

## Gap 2 — No correlation IDs yet

Long-running flows cannot yet be traced end-to-end.

Future fix:

```text
correlationId added to job/event records
```

---

## Gap 3 — Events are not emitted consistently

Current code records execution audit events, but ingestion/extraction/search events are not consistently emitted.

Future fix:

```text
central event service
```

---

## Gap 4 — Watcher cycles are not fully observable

Watcher behavior is partly logged but not yet structured as events.

Future fix:

```text
watcher event records + job records
```

---

# Future Implementation Target

Recommended future module:

```text
services/api/src/events/eventService.js
```

Recommended future repository:

```text
services/api/src/repositories/eventsRepository.js
```

Recommended future contract file:

```text
services/api/src/contracts/events.contracts.js
```

---

# Step 0.4 Due Diligence

## Architecture consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Safety consistency

```text
PASS
```

## Future async compatibility

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
Step 0.4 passes due diligence.
```

The project can proceed to:

```text
Step 0.5 — Define Pipeline State Machine
```
