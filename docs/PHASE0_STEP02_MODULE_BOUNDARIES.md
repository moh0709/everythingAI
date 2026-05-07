# Phase 0 — Step 0.2 Module Boundaries

## Status

```text
COMPLETE
```

## Objective

Define the official module boundaries for EverythingAI so future implementation stays modular, scalable, testable, and safe.

This document is part of **Improvement Project One**.

---

# Core Architecture Rule

EverythingAI must follow this dependency direction:

```text
Routes
  ↓
Services
  ↓
Repositories
  ↓
Database / Storage
```

External AI and integration dependencies must follow:

```text
Services
  ↓
Providers / Integrations
```

Filesystem operations must follow:

```text
Planning
  ↓
Preview
  ↓
Execution
  ↓
Filesystem
```

No module may bypass this flow without an explicit architecture decision.

---

# Main Module Boundaries

## 1. API Routes Module

### Current location

```text
services/api/src/routes/*
```

### Responsibility

Routes are responsible only for:

```text
- HTTP request parsing
- request validation
- authentication/authorization handoff
- calling application services
- returning HTTP responses
```

### Routes must NOT

```text
- contain business logic
- directly manipulate database records
- orchestrate multi-step pipelines
- decide planning logic
- execute filesystem operations
- call AI providers directly
```

### Future target

Routes should call services only.

Example:

```text
POST /api/index
  → ingestionService.indexSourcePath()
```

---

## 2. Ingestion Module

### Current related locations

```text
services/api/src/indexer/*
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
```

### Responsibility

The ingestion module is responsible for:

```text
- scanning source paths
- discovering files
- reading metadata
- normalizing paths
- hashing files
- creating/updating indexed file records
- reporting skipped/failed files
```

### Ingestion may trigger

```text
- extraction
- embeddings
- knowledge build
```

### Ingestion must NOT trigger

```text
- planning suggestions
- action previews
- action execution
```

### Core rule

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

---

## 3. Source Paths Module

### Current related locations

```text
services/api/src/routes/sourcePaths.routes.js
services/api/src/watcher/watchService.js
services/api/src/db/schema.sql → watch_roots
```

### Responsibility

Source Paths define the user-approved filesystem scope.

Responsible for:

```text
- adding source folders
- listing source folders
- pausing source folders
- resuming source folders
- removing source folders from scope
- preserving source identity
- controlling watcher attachment
```

### Source Paths must NOT

```text
- directly create organization suggestions
- execute file operations
- silently delete indexed knowledge unless explicitly configured
```

---

## 4. Extraction Module

### Current location

```text
services/api/src/extractors/*
```

### Responsibility

Extraction is responsible for:

```text
- reading supported document formats
- extracting text
- extracting basic document metadata
- marking extraction status
- preserving extraction errors
```

### Extraction must NOT

```text
- generate organization plans
- call filesystem execution
- decide final knowledge structure
```

### Output contract

Extraction produces:

```text
ExtractedContent
```

which can later feed:

```text
- embeddings
- insights
- knowledge pages
- retrieval
- planning context
```

---

## 5. Embeddings Module

### Current location

```text
services/api/src/embeddings/*
```

### Responsibility

Embeddings are responsible for:

```text
- converting extracted text into vector representation
- storing embedding records
- supporting semantic retrieval
- tracking embedding model/source
```

### Embeddings must NOT

```text
- decide search ranking alone
- generate user-facing answers
- create planning suggestions directly
```

### Future target

Introduce:

```text
EmbeddingProvider interface
```

Supported provider types:

```text
- deterministic-local
- Ollama embeddings
- local BGE/nomic models
- OpenAI-compatible embeddings
- pgvector-backed storage
- Qdrant/Weaviate-backed storage
```

---

## 6. Search & Retrieval Module

### Current related locations

```text
services/api/src/search/*
services/api/src/routes/search.routes.js
services/api/src/db/client.js → searchIndexedFiles()
```

### Responsibility

Search & Retrieval is responsible for:

```text
- keyword search
- filename/path search
- metadata search
- semantic search
- hybrid search
- query intent analysis
- result merging
- ranking
- source references
```

### This module powers

```text
- one search bar
- one chatbot
- one Wikipedia-style knowledge explorer
```

### Search must work without AI provider

Search must remain functional offline.

### Future target

Create:

```text
Knowledge Access Router
```

with modes:

```text
auto
files
content
semantic
entities
wiki
```

---

## 7. Knowledge Module

### Current location

```text
services/api/src/knowledge/*
```

### Responsibility

The knowledge module is responsible for:

```text
- generated knowledge pages
- topic pages
- entity pages
- summaries
- classifications
- relationships
- source maps
- duplicate groups
- knowledge build status
```

### Knowledge must NOT

```text
- execute filesystem actions
- silently reorganize files
- replace search/retrieval logic
```

### Knowledge surfaces

The Knowledge area contains:

```text
- Knowledge Wiki
- Technical Manual
- Help / User Manual
```

---

## 8. AI Chat Module

### Current related locations

```text
services/api/src/ai/*
services/api/src/routes/search.routes.js → /chat
```

### Responsibility

AI Chat is responsible for:

```text
- answering user questions
- using retrieved local sources
- citing source references
- using selected provider when available
- returning fallback answers when provider unavailable
```

### AI Chat must use Retrieval

Chat must not independently search documents.

Correct flow:

```text
question
  ↓
Knowledge Access Router
  ↓
Hybrid Retrieval
  ↓
AI Chat Answer
```

---

## 9. Provider Module

### Current related locations

```text
services/api/src/ai/providerRuntime.js
services/api/src/settings/*
services/api/src/routes/providerSettings.routes.js
```

### Responsibility

Providers are responsible for:

```text
- AI model execution
- provider settings
- API key handling
- model discovery
- connection testing
- provider-specific error handling
```

### Providers must NOT

```text
- own business logic
- directly manipulate indexed files
- decide file organization actions
- bypass retrieval context
```

### Provider rule

Providers are replaceable adapters.

---

## 10. Planning Module

### Current related locations

```text
services/api/src/suggestions/*
services/api/src/integrations/organizor/*
```

### Responsibility

Planning is responsible for:

```text
- analyzing indexed files
- using filename/path/metadata/content/insights/entities
- creating planning suggestions
- grouping suggestions into planning sessions
- assigning confidence
- explaining reasons
```

### Planning must NOT

```text
- execute filesystem actions
- directly rename or move files
- run automatically during ingestion
```

### Planning execution rule

Planning starts only when user initiates planning.

---

## 11. Preview Module

### Current location

```text
services/api/src/previews/*
```

### Responsibility

Preview is responsible for:

```text
- validating planned actions
- detecting target conflicts
- blocking unsafe paths
- calculating target paths
- marking preview status
- explaining blocked reasons
```

### Preview must NOT

```text
- modify files
- call AI providers
- create new suggestions
```

---

## 12. Execution Module

### Current location

```text
services/api/src/actions/*
```

### Responsibility

Execution is responsible for:

```text
- executing approved previews
- applying app-level labels/categories
- renaming files
- moving files
- recording audit logs
- recording undo data
- undoing supported actions
```

### Execution rules

```text
- explicit approval required
- preview must be ready
- preview must be executable
- source must exist
- target must not exist
- target must remain inside allowed boundary
```

### Execution must NOT

```text
- generate suggestions
- perform unapproved actions
- delete files silently
```

---

## 13. Watcher Module

### Current location

```text
services/api/src/watcher/*
```

### Responsibility

Watcher is responsible for:

```text
- watching approved source paths
- debouncing filesystem events
- triggering safe rescans
- avoiding overlapping cycles
- updating watch root status
```

### Watcher may trigger

```text
- ingestion
- extraction
- embeddings
- knowledge refresh
```

### Watcher must NOT trigger

```text
- planning suggestions
- previews
- execution
```

This is a current coupling issue to fix in a later phase.

---

## 14. Job Layer Module

### Current status

```text
Not formalized yet
```

### Responsibility

The job layer will be responsible for:

```text
- long-running task tracking
- progress reporting
- retries
- failures
- cancellation support
- future worker queue migration
```

### Target job types

```text
INDEX_SOURCE
EXTRACT_FILES
GENERATE_EMBEDDINGS
BUILD_KNOWLEDGE
RUN_PLANNING
CREATE_PREVIEWS
EXECUTE_ACTIONS
SYNC_INTEGRATION
```

---

## 15. Observability Module

### Current status

```text
Partial through logs and audit_log
```

### Responsibility

Observability is responsible for:

```text
- structured logs
- job metrics
- pipeline status
- failure reporting
- timing data
- audit visibility
- debugging context
```

---

## 16. Integration Module

### Current related locations

```text
services/api/src/routes/integrations.routes.js
```

### Responsibility

Integrations are responsible for:

```text
- syncing with external knowledge systems
- AnythingLLM bridge
- future SharePoint / OneDrive / Google Drive connectors
```

### Integrations must NOT

```text
- own canonical source of truth
- replace EverythingAI local index
- execute local filesystem actions
```

---

# Dependency Rules

## Allowed Dependencies

```text
Routes → Services
Services → Repositories
Services → Providers
Services → Other Services through explicit interfaces
Repositories → Database
Providers → External APIs
Execution → Filesystem
```

## Forbidden Dependencies

```text
Routes → Database directly
Planning → Filesystem execution
Knowledge → Filesystem execution
Search → AI provider requirement
Provider → Database business records directly
Watcher → Planning suggestions
Ingestion → Planning suggestions
```

---

# Current Known Boundary Violations

These are accepted in the current MVP but must be reduced gradually.

## Violation 1 — Routes directly use DB helpers

Examples:

```text
files.routes.js
search.routes.js
sourcePaths.routes.js
intelligence.routes.js
actions.routes.js
```

Future fix:

```text
routes → services → repositories
```

---

## Violation 2 — db/client.js is too broad

Current db/client.js contains many repository responsibilities.

Future fix:

```text
split repositories by domain
```

---

## Violation 3 — Watcher can trigger planning suggestions indirectly

Current watcher can run local automation pipeline, which can generate suggestions.

Future fix:

```text
separate ingestion pipeline from planning pipeline
```

---

## Violation 4 — Unified search is aggregation, not router-based retrieval

Current unified search aggregates several data sources manually.

Future fix:

```text
Knowledge Access Router
```

---

# Step 0.2 Due Diligence

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

## Future phase compatibility

```text
PASS
```

## Implementation risk

```text
LOW
```

This step is documentation and architecture-contract only. It does not change runtime behavior.

---

# Result

```text
Step 0.2 passes due diligence.
```

The project can proceed to:

```text
Step 0.3 — Define Shared Contracts & Canonical Models
```
