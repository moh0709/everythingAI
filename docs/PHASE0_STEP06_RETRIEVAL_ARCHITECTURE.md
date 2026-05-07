# Phase 0 — Step 0.6 Retrieval Architecture

## Status

```text
COMPLETE
```

## Objective

Define the official retrieval architecture for EverythingAI so the system can support one search bar, one AI chatbot, and one Wikipedia-style knowledge explorer through a shared retrieval foundation.

This document is part of **Improvement Project One**.

---

# Core Retrieval Principle

EverythingAI must expose three user-facing knowledge access surfaces:

```text
1. Search
2. Chat
3. Wiki
```

But these must not become three separate retrieval systems.

They must share one backend retrieval engine:

```text
Search
Chat
Wiki
  ↓
Knowledge Access Router
  ↓
Hybrid Retrieval Layer
  ↓
Metadata DB + Keyword Search + Vector Search + Knowledge Pages
```

---

# Why This Matters

If Search, Chat, and Wiki each implement their own retrieval logic, the system will become inconsistent.

Bad architecture:

```text
Search → custom search logic
Chat → custom retrieval logic
Wiki → custom page lookup logic
```

Good architecture:

```text
Search → Retrieval Engine
Chat → Retrieval Engine
Wiki → Retrieval Engine
```

This ensures:

```text
- same source references
- same ranking rules
- same fallback behavior
- same filters
- same permissions later
- same retrieval quality
- easier debugging
- easier future vector/search migration
```

---

# Retrieval Architecture Layers

## Layer 1 — User Access Surface

The user interacts through:

```text
- Search Bar
- AI Chatbot
- Wiki Explorer
```

Each surface sends a normalized retrieval request.

---

## Layer 2 — Knowledge Access Router

The Knowledge Access Router decides how to interpret the request.

Responsibilities:

```text
- normalize query
- detect search intent
- select retrieval modes
- apply filters
- call retrieval adapters
- merge results
- rank results
- return source references
```

---

## Layer 3 — Intent Analyzer

The Intent Analyzer determines what the user is likely asking for.

Possible intents:

```text
find_file
find_content
semantic_question
explore_topic
find_entity
manual_help
technical_manual
unknown
```

---

## Layer 4 — Retrieval Planner

The Retrieval Planner converts intent into a retrieval plan.

Example:

```text
Query: "invoice from supplier"
Intent: find_content
Plan:
  - use metadata search
  - use keyword search
  - use semantic search
  - rank exact matches first
```

Example:

```text
Query: "how does indexing work?"
Intent: technical_manual
Plan:
  - use manual pages
  - use knowledge pages
  - use semantic search
  - rank manual pages first
```

Example:

```text
Query: "where is budget.xlsx?"
Intent: find_file
Plan:
  - use metadata search
  - use filename/path search
  - rank exact filename first
```

---

## Layer 5 — Retrieval Adapters

Retrieval adapters query different backends.

Adapters:

```text
MetadataRetrievalAdapter
KeywordRetrievalAdapter
SemanticRetrievalAdapter
KnowledgePageRetrievalAdapter
ManualPageRetrievalAdapter
EntityRetrievalAdapter
PlanningRecordRetrievalAdapter
```

Each adapter must return the same canonical result shape:

```text
RetrievalResult
```

---

## Layer 6 — Result Merger

The Result Merger combines results from multiple adapters.

Responsibilities:

```text
- deduplicate results
- merge duplicate source references
- normalize scores
- preserve source provenance
- group related results
```

---

## Layer 7 — Ranker

The Ranker sorts results by relevance.

Ranking strategies:

```text
exact_first
semantic_first
hybrid
manual_first
recent_first
source_confidence
```

---

## Layer 8 — Response Formatter

The formatter prepares the final output for:

```text
SearchResponse
ChatAnswer
KnowledgePage
```

---

# Canonical Retrieval Flow

```text
User Query
  ↓
Normalize Request
  ↓
Detect Intent
  ↓
Create Retrieval Plan
  ↓
Run Retrieval Adapters
  ↓
Merge Results
  ↓
Rank Results
  ↓
Attach Source References
  ↓
Return to Search / Chat / Wiki
```

---

# Search Modes

The official modes are:

```text
auto
files
content
semantic
entities
wiki
manual
technical
help
planning
```

## auto

The system determines the retrieval strategy.

## files

Focus on filenames, paths, extensions, metadata.

## content

Focus on exact words inside extracted text.

## semantic

Focus on meaning/context using embeddings.

## entities

Focus on people, companies, products, topics, dates, references.

## wiki

Focus on generated knowledge pages.

## manual

Focus on both Help and Technical Manual.

## technical

Focus on Technical Manual pages.

## help

Focus on Help/User Manual pages.

## planning

Focus on planning sessions, suggestions, previews, executions.

---

# Search Intent Rules

## Intent: find_file

Signals:

```text
- query includes extension like .pdf, .xlsx, .docx
- query includes words like file, folder, path, where is
- query resembles filename
```

Preferred retrieval:

```text
metadata search
keyword filename/path search
```

Ranking:

```text
exact_first
```

---

## Intent: find_content

Signals:

```text
- query asks for specific words or phrases
- query includes invoice/order/customer/project names
- query is not phrased as a question requiring reasoning
```

Preferred retrieval:

```text
keyword search
metadata search
semantic search optional
```

Ranking:

```text
hybrid
```

---

## Intent: semantic_question

Signals:

```text
- query asks why/how/what/which
- query asks for explanation
- query asks for meaning, summary, comparison, relationship
```

Preferred retrieval:

```text
semantic search
keyword search
knowledge pages
```

Ranking:

```text
semantic_first
```

---

## Intent: explore_topic

Signals:

```text
- query is broad topic
- query asks to explore, show everything about, summarize topic
```

Preferred retrieval:

```text
knowledge pages
semantic search
entities
```

Ranking:

```text
hybrid
```

---

## Intent: find_entity

Signals:

```text
- query is a person/company/project/product/date
- query asks who/where/when related to a named entity
```

Preferred retrieval:

```text
entity retrieval
knowledge pages
keyword search
semantic search
```

Ranking:

```text
source_confidence
```

---

## Intent: manual_help

Signals:

```text
- query asks how to use the app
- query includes words like help, guide, how do I, settings, source path, planning, approve, undo
```

Preferred retrieval:

```text
Help/User Manual
Technical Manual optional
```

Ranking:

```text
manual_first
```

---

## Intent: technical_manual

Signals:

```text
- query asks how the system works
- query includes architecture, API, database, vector, pipeline, module, contract, event, state
```

Preferred retrieval:

```text
Technical Manual
architecture docs
knowledge pages optional
```

Ranking:

```text
manual_first
```

---

# Retrieval Source Responsibilities

## Metadata DB

Best for:

```text
- exact filename
- path
- extension
- size
- dates
- status
- labels
- categories
```

Must work offline.

---

## Keyword Search / FTS

Best for:

```text
- exact document terms
- phrase-like content search
- snippets
- filename/path/content hybrid search
```

Current MVP:

```text
SQLite FTS
```

Future:

```text
Meilisearch / OpenSearch
```

---

## Semantic Vector Search

Best for:

```text
- meaning-based search
- context search
- similar documents
- conceptual queries
- RAG source discovery
```

Current MVP:

```text
deterministic file-level embeddings
```

Future:

```text
chunk-level embeddings
pgvector / Qdrant / Weaviate
```

---

## Knowledge Pages

Best for:

```text
- topic exploration
- entity pages
- document summaries
- source maps
- relationships
- wiki browsing
```

---

## Manual Pages

Best for:

```text
- Help/User Manual
- Technical Manual
- onboarding
- troubleshooting
- architecture explanations
```

---

## Planning Records

Best for:

```text
- planning sessions
- suggestions
- previews
- executions
- audit/execution history
```

Planning records must not be mixed into general knowledge search unless the query intent or filter requests them.

---

# Search Response Rules

Every retrieval response must include:

```text
query
mode
intent
results
sourceReferences
totals
```

Every result should explain:

```text
- why it matched
- where it came from
- source type
- confidence/score
```

---

# Chat Retrieval Rules

Chat must use retrieval before answering.

Correct flow:

```text
Question
  ↓
Knowledge Access Router
  ↓
Retrieval Results
  ↓
Provider Prompt
  ↓
Answer with SourceReferences
```

If no retrieval results exist:

```text
Chat must say it has no sufficient local source context.
```

Chat must not hallucinate unsupported answers.

---

# Wiki Retrieval Rules

Wiki should use the same retrieval foundation.

Wiki can retrieve:

```text
- existing generated knowledge pages
- related files
- related entities
- related manual pages
- source references
```

Wiki page generation should be separate from retrieval.

Retrieval finds.

Knowledge generation writes/updates pages.

---

# Manual Retrieval Rules

Technical Manual and Help/User Manual are first-class searchable knowledge sources.

They should be indexed as:

```text
manual_page
help_page
technical_page
```

They must be available through:

```text
- Search
- Chat
- Wiki Explorer
```

But technical/manual pages should be ranked first only when intent suggests manual/help/technical use.

---

# Fallback Behavior

## If semantic search is unavailable

Use:

```text
metadata search + keyword search
```

## If keyword search is unavailable

Use:

```text
metadata search + semantic search if available
```

## If provider is unavailable

Search still works.

Chat returns retrieval-based fallback or provider-unavailable response.

## If no extraction exists

Use:

```text
metadata only
```

## If knowledge pages are stale

Return stale marker and source files where possible.

---

# Privacy and Security Rules

Retrieval must respect future:

```text
- tenant permissions
- user permissions
- source path permissions
- device permissions
```

Current MVP is local-first and single-user, but contracts must be production-ready.

Retrieval logs must not store full sensitive document contents by default.

---

# MVP Mapping

Current endpoints:

```text
GET /api/search
GET /api/semantic-search
GET /api/unified-search
POST /api/chat
GET /api/knowledge
```

Future target:

```text
POST /api/knowledge/search
POST /api/knowledge/chat
GET /api/knowledge/wiki
```

The old endpoints can remain as compatibility wrappers during migration.

---

# Recommended Future Module Structure

```text
services/api/src/retrieval/knowledgeAccessRouter.js
services/api/src/retrieval/intentAnalyzer.js
services/api/src/retrieval/retrievalPlanner.js
services/api/src/retrieval/adapters/metadataRetrievalAdapter.js
services/api/src/retrieval/adapters/keywordRetrievalAdapter.js
services/api/src/retrieval/adapters/semanticRetrievalAdapter.js
services/api/src/retrieval/adapters/knowledgePageRetrievalAdapter.js
services/api/src/retrieval/adapters/manualPageRetrievalAdapter.js
services/api/src/retrieval/resultMerger.js
services/api/src/retrieval/resultRanker.js
services/api/src/retrieval/sourceReferenceBuilder.js
```

Recommended future contracts:

```text
services/api/src/contracts/retrieval.contracts.js
services/api/src/contracts/sourceReferences.contracts.js
```

Recommended future tests:

```text
services/api/test/retrievalIntent.test.js
services/api/test/hybridRetrieval.test.js
services/api/test/retrievalFallbacks.test.js
```

---

# Known MVP Gaps

## Gap 1 — Unified search is not yet intent-driven

Current `/unified-search` aggregates multiple result groups manually.

Future fix:

```text
Knowledge Access Router
```

---

## Gap 2 — Source references are not standardized everywhere

Future fix:

```text
SourceReference[]
```

used consistently across search, chat, and wiki.

---

## Gap 3 — Manual pages are not yet first-class indexed sources

Future fix:

```text
Technical Manual + Help pages indexed as manual sources
```

---

## Gap 4 — Semantic retrieval is file-level, not chunk-level

Future fix:

```text
chunk-level embeddings
```

---

## Gap 5 — Retrieval permissions are not yet modeled

Future fix:

```text
tenant/user/source permission filters
```

for production platform.

---

# Step 0.6 Due Diligence

## Architecture consistency

```text
PASS
```

## Search/Chat/Wiki unification

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Offline-first compatibility

```text
PASS
```

## Future vector/search migration compatibility

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
Step 0.6 passes due diligence.
```

The project can proceed to:

```text
Step 0.7 — Define Embedding Provider Abstraction
```
