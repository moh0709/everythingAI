# Phase 0 — Step 0.5 Pipeline State Machine

## Status

```text
COMPLETE
```

## Objective

Define the official pipeline state machine for EverythingAI so ingestion, extraction, embeddings, knowledge build, retrieval readiness, planning, previews, execution, undo, and jobs have deterministic state transitions.

This document is part of **Improvement Project One**.

---

# Why a State Machine Matters

EverythingAI processes files through multiple stages.

Without strict states, the system can accidentally:

```text
- plan against stale knowledge
- search incomplete extraction data
- embed outdated content
- execute previews that are no longer valid
- show misleading UI status
- retry failed work incorrectly
- duplicate watcher work
```

The state machine prevents this by defining:

```text
- allowed states
- allowed transitions
- invalid transitions
- failure states
- retry behavior
- readiness behavior
```

---

# Core State Principle

A state describes the current readiness of an entity.

An event describes something that happened.

```text
Event → may change State
State → controls what can happen next
```

Example:

```text
EXTRACTION_COMPLETED event
  ↓
file extraction state becomes extracted
  ↓
file becomes eligible for embedding
```

---

# Main State Domains

EverythingAI has several separate state machines:

```text
1. Source Path State
2. File Index State
3. Extraction State
4. Embedding State
5. Knowledge State
6. Retrieval Readiness State
7. Planning Session State
8. Planning Suggestion State
9. Action Preview State
10. Action Execution State
11. Job State
12. Watcher State
```

These should remain separate.

Do not collapse everything into one global status.

---

# 1. Source Path State Machine

## States

```text
active
paused
stopped
failed
removed
```

## Meaning

| State | Meaning |
|---|---|
| active | Source path is in scope and watcher may be active |
| paused | Source path remains in scope but watcher/auto-processing is paused |
| stopped | Source path exists but watcher is not running |
| failed | Source path encountered a watcher/access error |
| removed | Source path was removed from scope |

## Allowed transitions

```text
stopped → active
active → paused
paused → active
active → stopped
paused → stopped
active → failed
paused → failed
stopped → removed
paused → removed
failed → removed
failed → active
```

## Forbidden transitions

```text
removed → active
removed → paused
removed → stopped
```

A removed source path must be re-added as a new scope decision.

---

# 2. File Index State Machine

## States

```text
discovered
indexed
skipped
failed
removed_from_scope
stale
```

## Meaning

| State | Meaning |
|---|---|
| discovered | File was found but not yet fully indexed |
| indexed | Metadata and identity are indexed |
| skipped | File was intentionally skipped by rules |
| failed | Indexing failed |
| removed_from_scope | File no longer belongs to an active source path |
| stale | Indexed record exists but file metadata/content may have changed |

## Allowed transitions

```text
discovered → indexed
discovered → skipped
discovered → failed
indexed → stale
indexed → removed_from_scope
stale → indexed
stale → failed
failed → indexed
failed → skipped
skipped → discovered
indexed → failed
```

## Forbidden transitions

```text
removed_from_scope → indexed
removed_from_scope → stale
```

A removed file must be rediscovered through a source path scan.

---

# 3. Extraction State Machine

## States

```text
not_started
queued
running
extracted
unsupported
skipped
failed
stale
```

## Meaning

| State | Meaning |
|---|---|
| not_started | No extraction has been attempted |
| queued | Extraction job is queued |
| running | Extraction is in progress |
| extracted | Text/metadata extraction succeeded |
| unsupported | File type is unsupported |
| skipped | Extraction was skipped by policy |
| failed | Extraction failed |
| stale | Extraction exists but file content changed |

## Allowed transitions

```text
not_started → queued
queued → running
running → extracted
running → unsupported
running → skipped
running → failed
extracted → stale
stale → queued
failed → queued
unsupported → queued
skipped → queued
```

## Forbidden transitions

```text
running → queued
extracted → running
failed → extracted without running
```

Extraction must pass through running when executed asynchronously.

---

# 4. Embedding State Machine

## States

```text
not_started
queued
running
embedded
skipped
failed
stale
```

## Meaning

| State | Meaning |
|---|---|
| not_started | No embedding exists |
| queued | Embedding job queued |
| running | Embedding generation in progress |
| embedded | Embedding exists and matches source text/model |
| skipped | Embedding skipped by policy |
| failed | Embedding generation failed |
| stale | Embedding exists but text/model changed |

## Allowed transitions

```text
not_started → queued
queued → running
running → embedded
running → skipped
running → failed
embedded → stale
stale → queued
failed → queued
skipped → queued
```

## Forbidden transitions

```text
embedded → running without stale/queued
failed → embedded without running
```

---

# 5. Knowledge State Machine

## States

```text
not_started
queued
building
ready
partial
failed
stale
```

## Meaning

| State | Meaning |
|---|---|
| not_started | No knowledge build exists |
| queued | Knowledge build queued |
| building | Knowledge build running |
| ready | Knowledge page/index is ready |
| partial | Some knowledge generated but incomplete |
| failed | Knowledge build failed |
| stale | Knowledge exists but source changed |

## Allowed transitions

```text
not_started → queued
queued → building
building → ready
building → partial
building → failed
ready → stale
partial → queued
failed → queued
stale → queued
```

## Forbidden transitions

```text
failed → ready without building
ready → building without stale/queued
```

---

# 6. Retrieval Readiness State

Retrieval readiness is a computed state, not necessarily a stored table state.

## States

```text
metadata_ready
keyword_ready
semantic_ready
knowledge_ready
partial_ready
not_ready
```

## Meaning

| State | Meaning |
|---|---|
| metadata_ready | File metadata can be searched |
| keyword_ready | Extracted content is keyword searchable |
| semantic_ready | Embeddings exist |
| knowledge_ready | Knowledge page/index exists |
| partial_ready | Some retrieval paths are available |
| not_ready | No retrieval path available |

## Computed from

```text
File Index State
Extraction State
Embedding State
Knowledge State
```

## Rule

Search should degrade gracefully.

Example:

```text
If semantic search is unavailable,
use metadata + keyword search.
```

---

# 7. Planning Session State Machine

## States

```text
draft
queued
running
ready
partially_ready
failed
cancelled
approved
executed
archived
```

## Meaning

| State | Meaning |
|---|---|
| draft | Session exists but has not started |
| queued | Planning job queued |
| running | Planning is generating suggestions |
| ready | Suggestions are ready for review |
| partially_ready | Some suggestions generated; some failed/blocked |
| failed | Planning failed |
| cancelled | User/system cancelled planning |
| approved | User approved some/all plan items |
| executed | Approved executable items were executed |
| archived | Session closed for history |

## Allowed transitions

```text
draft → queued
queued → running
running → ready
running → partially_ready
running → failed
running → cancelled
ready → approved
partially_ready → approved
approved → executed
ready → archived
partially_ready → archived
failed → archived
cancelled → archived
executed → archived
failed → queued
```

## Forbidden transitions

```text
draft → executed
running → executed
ready → executed without approved
cancelled → executed
archived → running
```

---

# 8. Planning Suggestion State Machine

## States

```text
proposed
accepted
rejected
converted_to_preview
superseded
invalidated
```

## Meaning

| State | Meaning |
|---|---|
| proposed | Suggestion was generated |
| accepted | User accepted suggestion for preview |
| rejected | User rejected suggestion |
| converted_to_preview | Preview was created |
| superseded | A newer suggestion replaced it |
| invalidated | Source file/context changed |

## Allowed transitions

```text
proposed → accepted
proposed → rejected
proposed → superseded
proposed → invalidated
accepted → converted_to_preview
accepted → rejected
converted_to_preview → invalidated
```

## Forbidden transitions

```text
rejected → converted_to_preview
invalidated → accepted
superseded → accepted
```

---

# 9. Action Preview State Machine

## States

```text
created
ready
blocked
approved
rejected
executing
executed
failed
invalidated
```

## Meaning

| State | Meaning |
|---|---|
| created | Preview exists but validation not complete |
| ready | Preview is validated and executable |
| blocked | Preview cannot execute safely |
| approved | User approved preview |
| rejected | User rejected preview |
| executing | Execution started |
| executed | Execution completed |
| failed | Execution failed |
| invalidated | File/context changed after preview |

## Allowed transitions

```text
created → ready
created → blocked
ready → approved
ready → rejected
ready → invalidated
blocked → rejected
blocked → invalidated
approved → executing
executing → executed
executing → failed
failed → ready
```

## Forbidden transitions

```text
blocked → executing
ready → executing without approved
invalidated → executing
rejected → executing
executed → executing
```

---

# 10. Action Execution State Machine

## States

```text
pending
running
executed
failed
undo_pending
undo_running
undone
undo_failed
```

## Meaning

| State | Meaning |
|---|---|
| pending | Execution record created but not started |
| running | Execution in progress |
| executed | Execution completed successfully |
| failed | Execution failed |
| undo_pending | Undo requested |
| undo_running | Undo in progress |
| undone | Undo completed |
| undo_failed | Undo failed |

## Allowed transitions

```text
pending → running
running → executed
running → failed
executed → undo_pending
undo_pending → undo_running
undo_running → undone
undo_running → undo_failed
undo_failed → undo_pending
```

## Forbidden transitions

```text
failed → undone
pending → executed without running
executed → running
undone → running
```

---

# 11. Job State Machine

## States

```text
created
queued
running
completed
failed
cancelled
retrying
```

## Meaning

| State | Meaning |
|---|---|
| created | Job record created |
| queued | Job is waiting to run |
| running | Job is active |
| completed | Job completed successfully |
| failed | Job failed after attempts |
| cancelled | Job was cancelled |
| retrying | Job is waiting for retry |

## Allowed transitions

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

## Forbidden transitions

```text
completed → running
cancelled → running
failed → completed without running
```

---

# 12. Watcher State Machine

## States

```text
starting
active
idle
cycle_queued
cycle_running
failed
stopped
```

## Meaning

| State | Meaning |
|---|---|
| starting | Watcher startup in progress |
| active | Watcher is attached and ready |
| idle | Watcher is active but no cycle running |
| cycle_queued | Change event queued for scan |
| cycle_running | Scan/ingestion cycle is running |
| failed | Watcher failed |
| stopped | Watcher stopped |

## Allowed transitions

```text
starting → active
active → idle
idle → cycle_queued
cycle_queued → cycle_running
cycle_running → idle
cycle_running → failed
failed → starting
active → stopped
idle → stopped
failed → stopped
```

## Forbidden transitions

```text
stopped → active without starting
cycle_running → cycle_running
failed → active without starting
```

---

# Cross-Domain Rules

## Rule 1 — Planning requires retrieval readiness

Planning should only use files with at least:

```text
metadata_ready
```

Planning quality improves with:

```text
keyword_ready
semantic_ready
knowledge_ready
```

But planning must degrade gracefully.

---

## Rule 2 — Semantic search requires embedding readiness

Semantic retrieval requires:

```text
Embedding State = embedded
```

If embeddings are missing or stale, fallback to keyword/metadata search.

---

## Rule 3 — Chat requires retrieval results

Chat should use retrieval first.

If no retrieval sources exist, chat must report limited/no source context instead of hallucinating.

---

## Rule 4 — Execution requires approved ready preview

Execution requires:

```text
Action Preview State = approved
```

and the preview must have previously passed:

```text
ready
```

---

## Rule 5 — Invalidation must happen when file identity changes

If file path/content changes after preview creation:

```text
PlanningSuggestion → invalidated
ActionPreview → invalidated
EmbeddingRecord → stale
KnowledgePage → stale
```

---

## Rule 6 — Watcher must not trigger planning

Watcher may move states through:

```text
file index
extraction
embedding
knowledge
```

Watcher must not move states through:

```text
planning
preview
execution
```

---

# MVP Mapping

## Current Indexed File Status

Current table:

```text
indexed_files.index_status
```

Current values:

```text
indexed
failed
```

Future values should support:

```text
discovered
skipped
removed_from_scope
stale
```

---

## Current Extraction Status

Current table:

```text
file_extractions.extraction_status
```

Current values:

```text
extracted
failed
unsupported
```

Future values should support:

```text
not_started
queued
running
skipped
stale
```

---

## Current Preview Status

Current table:

```text
action_previews.preview_status
```

Current values:

```text
ready
blocked
```

Future values should support:

```text
created
approved
rejected
executing
executed
failed
invalidated
```

---

## Current Execution Status

Current table:

```text
action_executions.status
```

Current values:

```text
executed
undone
failed
```

Future values should support:

```text
pending
running
undo_pending
undo_running
undo_failed
```

---

# Implementation Strategy

Do not add all states to runtime immediately.

Recommended approach:

```text
1. Preserve current MVP statuses
2. Add new state columns/tables gradually
3. Add compatibility mapping
4. Add UI labels only after backend support exists
5. Avoid breaking existing frontend expectations
```

---

# Future Implementation Targets

Recommended future contract file:

```text
services/api/src/contracts/states.contracts.js
```

Recommended future service:

```text
services/api/src/state/stateTransitionService.js
```

Recommended future repository:

```text
services/api/src/repositories/stateRepository.js
```

Recommended future tests:

```text
services/api/test/stateTransitions.test.js
```

---

# Step 0.5 Due Diligence

## Architecture consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Runtime compatibility

```text
PASS
```

## Safety consistency

```text
PASS
```

## Future phase compatibility

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
Step 0.5 passes due diligence.
```

The project can proceed to:

```text
Step 0.6 — Define Retrieval Architecture
```
