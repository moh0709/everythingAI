# Phase 0 — Step 0.1 Architecture Audit

## Status

```text
COMPLETE
```

## Objective

Audit the actual runtime architecture of the EverythingAI MVP implementation and compare it against the modular architecture goals defined in Improvement Project One.

---

# Runtime Architecture Summary

The runtime MVP is significantly more advanced than the older AI-agent planning documents suggest.

The current runtime implementation already includes:

```text
- SQLite persistence
- metadata indexing
- extraction pipeline
- embeddings pipeline
- semantic search
- insights generation
- knowledge index
- planning suggestions
- preview generation
- execution layer
- undo layer
- watcher system
- AI provider runtime
- provider settings persistence
- AnythingLLM integration
```

The implementation foundation is strong.

The largest remaining problem is not missing functionality.

The largest remaining problem is:

```text
architectural coupling
```

between:

```text
routes
DB helpers
services
automation pipeline
watchers
planning logic
```

---

# Actual Runtime Module Map

## Existing Runtime Modules

### API Layer

```text
services/api/src/routes/*
```

### Database Layer

```text
services/api/src/db/client.js
services/api/src/db/schema.sql
```

### Indexing Layer

```text
services/api/src/indexer/*
```

### Extraction Layer

```text
services/api/src/extractors/*
```

### Search Layer

```text
services/api/src/search/*
```

### Embeddings Layer

```text
services/api/src/embeddings/*
```

### Knowledge Layer

```text
services/api/src/knowledge/*
```

### Insights Layer

```text
services/api/src/insights/*
```

### Suggestions / Planning Layer

```text
services/api/src/suggestions/*
services/api/src/integrations/organizor/*
```

### Preview Layer

```text
services/api/src/previews/*
```

### Execution Layer

```text
services/api/src/actions/*
```

### Watcher Layer

```text
services/api/src/watcher/*
```

### Automation Pipeline

```text
services/api/src/automation/*
```

### AI Provider Layer

```text
services/api/src/ai/*
```

### Integration Layer

```text
services/api/src/routes/integrations.routes.js
```

---

# Major Findings

## Finding 1 — The MVP is already modular by folder structure

The folder structure is surprisingly good.

Subsystem separation already exists conceptually.

This significantly reduces Phase 0 implementation risk.

PASS.

---

## Finding 2 — Runtime coupling still exists

Current routes frequently:

```text
- open DB directly
- call DB helpers directly
- call services directly
- orchestrate multiple systems themselves
```

Examples:

```text
files.routes.js
search.routes.js
sourcePaths.routes.js
intelligence.routes.js
```

This violates the target architecture:

```text
Routes → Services → Repositories → Providers
```

This is the largest architectural issue discovered.

NOT BLOCKING.

But must be corrected gradually.

---

## Finding 3 — db/client.js is overloaded

The current database module acts as:

```text
- connection manager
- repository layer
- search layer
- FTS synchronizer
- execution helper
- labels helper
- audit helper
- embeddings repository
- settings repository
- status system
```

This creates a future maintainability risk.

Recommendation:

Later split into:

```text
repositories/files
repositories/extractions
repositories/search
repositories/planning
repositories/executions
repositories/embeddings
repositories/settings
repositories/audit
```

NOT BLOCKING.

---

## Finding 4 — Ingestion and planning are still coupled

The current watcher and indexing flow still triggers:

```text
runLocalAutomationPipeline()
```

which includes:

```text
extraction
embeddings
insights
knowledge build
suggestions
```

This violates the new architecture principle:

```text
Ingestion = automatic
Planning = user initiated
```

This is one of the most important future refactor targets.

Expected future fix:

```text
ingestion pipeline
≠
planning pipeline
```

---

## Finding 5 — Unified search already partially exists

The runtime already contains:

```text
/search
/semantic-search
/unified-search
/chat
/knowledge
```

This is very important.

It means the project already started evolving toward:

```text
one retrieval layer
```

However:

The current unified search is still a:

```text
manual aggregation endpoint
```

not a true:

```text
intent-driven hybrid retrieval engine
```

This becomes the target of Phase 5A.

---

## Finding 6 — Provider runtime is already advanced

The provider runtime already supports:

```text
Ollama
OpenRouter
Mistral
Cerebras
Google
Anthropic
Azure OpenAI
OpenAI-compatible providers
```

with:

```text
provider settings persistence
provider masking
provider fallback behavior
```

This strongly reduces future provider integration risk.

PASS.

---

## Finding 7 — Watcher concurrency risk exists

Current watcher architecture:

```text
fs.watch
+ debounce
+ queued cycles
```

This is good for MVP.

But future risks remain:

```text
- overlapping extraction states
- planning against stale data
- embedding collisions
- watcher storms
- partial knowledge rebuilds
```

This validates the need for:

```text
Phase 2
Phase 7
```

PASS WITH KNOWN RISK.

---

## Finding 8 — Knowledge and Search are still partially mixed

Current implementation partially mixes:

```text
knowledge
search
insights
semantic retrieval
```

inside overlapping route structures.

This is acceptable for MVP.

But later phases should separate:

```text
retrieval
knowledge intelligence
AI answering
```

more cleanly.

---

# Current Architecture Maturity Assessment

| Area | Assessment |
|---|---|
| Folder/module structure | Strong |
| Runtime functionality | Strong MVP |
| DB structure | Good MVP |
| Planning safety | Good foundation |
| Retrieval architecture | Partial |
| AI provider architecture | Strong |
| Modularity enforcement | Partial |
| Async architecture | Weak MVP |
| Watcher reliability | Medium risk |
| Production readiness | Early MVP |

---

# Most Important Architectural Refactors (Future)

## Priority 1

Separate:

```text
ingestion
planning
execution
```

fully.

---

## Priority 2

Introduce:

```text
service layer
repository layer
contracts layer
```

strictly.

---

## Priority 3

Create:

```text
Knowledge Access Router
```

for:

```text
Search
Chat
Wiki
```

---

## Priority 4

Introduce:

```text
job abstraction layer
```

before watcher scaling.

---

## Priority 5

Introduce:

```text
EmbeddingProvider abstraction
```

before vector scaling.

---

# Due Diligence Result

```text
PASS
```

No blocking architectural inconsistencies were discovered.

The runtime MVP is sufficiently stable and modular to continue Phase 0.

---

# Next Step

```text
Step 0.2 — Define Core Module Boundaries
```
