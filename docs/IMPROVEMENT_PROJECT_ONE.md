# EverythingAI — Improvement Project One

## Status

```text
Initialized
Phase 0 approved to begin
```

This document is the saved master plan for **Improvement Project One**.

The purpose of this project is to harden EverythingAI into a modular, reliable, searchable, explainable, and safe local-first AI file brain.

---

## Core Operating Model

Before any phase starts:

```text
Phase
  ↓
Detailed step breakdown
  ↓
Due diligence on step plan
  ↓
Architecture consistency check
  ↓
Dependency validation
  ↓
Regression-risk review
  ↓
Implementation start
```

After every step:

```text
- Report what was implemented
- List affected modules/files
- Report risks found
- Report verification result
- Report regressions found/fixed
- Define next step
```

Implementation can proceed autonomously unless one of the stop conditions is triggered.

---

## Mandatory Stop Conditions

Stop and engage the user when:

```text
- architectural decision required
- conflicting design discovered
- safety concern discovered
- unclear product behavior
- ambiguous UX behavior
- production tradeoff decision needed
- external-provider strategy decision needed
- filesystem safety concern exists
```

---

## Core Project Principles

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

```text
Knowledge Access ≠ File Organization
```

```text
Search + Chat + Wiki must share one retrieval engine
```

```text
Routes → Services → Repositories → Providers
```

```text
Filesystem actions ONLY through execution layer
```

```text
Planning must work without AI provider through deterministic fallback
```

```text
Search must work offline without cloud AI providers
```

---

## Knowledge Access Model

EverythingAI will expose three simple knowledge access surfaces:

```text
1. One Search Bar
2. One AI Chatbot
3. One Wikipedia-style Knowledge Explorer
```

The Wikipedia-style area must include:

```text
- Knowledge Wiki
- Technical Manual
- Help / User Manual
```

### Knowledge Wiki

The Knowledge Wiki is for generated knowledge pages, topics, entities, source maps, summaries, classifications, duplicate groups, and relationships.

### Technical Manual

The Technical Manual is the system manual for the project itself. It must document:

```text
- architecture layers
- ingestion pipeline
- database/index/vector layers
- provider system
- planning system
- execution safety rules
- API structure
- module boundaries
- lifecycle events
- pipeline statuses
- deployment notes
```

### Help / User Manual

The Help section is the user manual. It must explain:

```text
- adding source paths
- consuming knowledge
- searching
- chatting
- using the Wiki
- running planning
- reviewing previews
- approving execution
- undoing actions
- reading errors/status
```

---

## Master Phase Plan

## Phase 0 — Core Contracts & Modular Architecture

Purpose: prepare the project for modular growth before changing major functionality.

Deliverables:

```text
- Define module boundaries
- Define shared contracts/models
- Define service-layer structure
- Define lifecycle events
- Define pipeline statuses
- Define file identity rules
- Define retrieval contracts
- Define planning session contracts
```

---

## Phase 1 — Knowledge Ingestion Core

Purpose: make ingestion stable and reliable.

Deliverables:

```text
- Improve source path ingestion
- Improve metadata normalization
- Improve extraction reporting
- Improve failed-file tracking
- Improve ingestion status visibility
- Separate ingestion from planning
```

---

## Phase 2 — Async Pipeline & Job Layer

Purpose: make long-running work controllable.

Deliverables:

```text
- Add internal job abstraction
- Add job statuses
- Add retry handling
- Add pipeline progress tracking
- Add structured logs
- Prepare future Redis/BullMQ/Celery integration
```

---

## Phase 3 — Planning Separation Architecture

Purpose: make planning user-controlled.

Deliverables:

```text
- Remove automatic planning from ingestion pipeline
- Add explicit planning run endpoint
- Add planning sessions
- Add planning snapshots
- Add planning history
```

---

## Phase 4 — Planning Engine Rebuild

Purpose: improve organization intelligence.

Deliverables:

```text
- Use filename, path, metadata, content, entities, summaries
- Add provider-driven planning
- Keep deterministic fallback planning
- Improve move/rename/tag/category suggestions
- Add grouped folder-structure planning
- Add confidence reasoning
```

---

## Phase 5A — Unified Search & Retrieval

Purpose: create one intelligent search bar.

Deliverables:

```text
- Add Knowledge Access Router
- Add query intent detection
- Add hybrid retrieval
- Search normal DB for filenames/paths/metadata
- Search FTS for exact content
- Search vector layer for semantic meaning
- Merge and rank results
- Return source references
```

Modes:

```text
auto
files
content
semantic
entities
wiki
```

Default mode:

```text
auto
```

---

## Phase 5B — Wikipedia-style Knowledge Explorer

Purpose: make the knowledge base explorable.

Deliverables:

```text
- Knowledge Wiki pages
- Topic pages
- Entity pages
- Document summaries
- Classifications
- Relationships
- Duplicate groups
- Source maps
- Knowledge build status
```

---

## Phase 5C — AI Knowledge Chat

Purpose: create one chatbot for answers.

Deliverables:

```text
- Chat uses same retrieval router as search
- Hybrid retrieval before answer generation
- AI answers with source references
- Fallback answer when provider unavailable
- Provider selection support
```

---

## Phase 5D — Help & Technical Manual

Purpose: document the product inside the product.

Deliverables:

```text
- Help section = user manual
- Technical Manual section = system manual
- Manual pages generated from project docs where possible
- Manual searchable through the same search bar
- Manual available in Wiki area
```

---

## Phase 6 — Backend Safety & Rule Enforcement

Purpose: enforce rules in backend, not only UI.

Deliverables:

```text
- Confidence threshold enforcement
- Allow/disable rename
- Allow/disable move
- Allow/disable tag
- Allow/disable category
- Dry-run-only mode
- Require-approval mode
- Better blocked-action explanations
```

---

## Phase 7 — Watcher & Automation Stability

Purpose: make live folder monitoring safe.

Deliverables:

```text
- Stable watcher queue
- Debounce improvements
- No overlapping rescans
- Restart persistence
- Event deduplication
- Cleanup behavior when source paths are removed
```

---

## Phase 8 — Vector Architecture Hardening

Purpose: prepare semantic search for growth.

Deliverables:

```text
- EmbeddingProvider interface
- Chunking strategy
- Embedding model selection
- pgvector/Qdrant-ready abstraction
- Hybrid ranking improvements
- Re-embedding strategy
```

---

## Phase 9 — UI/UX Operational Maturity

Purpose: make the system easy to use.

Deliverables:

```text
- Better progress indicators
- Ingestion status dashboard
- Planning session UI
- Preview queue UI
- Undo UI
- Search/Chat/Wiki navigation
- Error explanations
- Batch selection controls
```

---

## Phase 10 — Production Foundation Preparation

Purpose: prepare future production architecture.

Deliverables:

```text
- PostgreSQL migration plan
- pgvector/vector DB migration plan
- Worker queue migration plan
- Auth preparation
- Tenant/workspace preparation
- Client-agent architecture refinement
- Backup/migration strategy
```

---

## Current Phase 0 Step Plan

```text
0.1 Repository & Runtime Architecture Audit
0.2 Define Core Module Boundaries
0.3 Define Shared Contracts & Canonical Models
0.4 Define Lifecycle Event System
0.5 Define Pipeline State Machine
0.6 Define Retrieval Architecture
0.7 Define Embedding Provider Abstraction
0.8 Define Planning Session Architecture
0.9 Define Job Layer Abstraction
0.10 Define Observability & Diagnostics Layer
0.11 Final Phase 0 Due Diligence
```

---

## Implementation Readiness

```text
Improvement Project One: approved for implementation
Current active phase: Phase 0
Current active step: Step 0.1
```
