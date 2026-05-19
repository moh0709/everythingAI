# Wiki / Knowledge Base Technical Design

Status: PROPOSED
Phase: Phase 2 Durable Knowledge Engine
Date: 2026-05-19
Repository: moh0709/everythingAI

---

## 1. Purpose

This document defines the Phase 2 technical design for the EverythingAI Wiki / Knowledge Base.

The project has moved from a file indexer and chatbot-style local search tool toward a source-backed AI knowledge workspace. The Wiki is now expected to behave like a content-first operational encyclopedia generated from local files, with citations, source inspection, evidence snippets, and chunk-level provenance.

Phase 1 established the user-facing evidence workspace:

- content-first Wiki pages
- source cards
- citation badges such as `[S1]` and `[S1:C3]`
- source preview drawer
- chunk-aware source inspection
- async Wiki rebuild panel
- safe source actions such as copy citation, copy path, reveal in folder, and open source context

Phase 2 must harden the backend so this evidence model becomes durable, queryable, versioned, and reliable.

---

## 2. Current baseline

### 2.1 Current runtime structure

```text
services/api
  Backend API, SQLite persistence, extraction, search, AI/knowledge services, safe actions, recovery, audit

apps/everything-ai-ui
  React user/admin frontend

http://localhost:5151
  Official safe user UI

http://localhost:5152/admin.html
  Admin/operator UI during local development
```

### 2.2 Current local MVP capabilities

The current local MVP already supports:

- local folder indexing
- SQLite metadata storage
- document text extraction
- SQLite FTS search
- deterministic vector-style local semantic search
- file insights and classifications
- source-backed Wiki page generation
- category/topic/source-file Wiki navigation
- Wiki search
- Reading Mode
- source reveal/open behavior
- source verification UX
- citation/source card/drawer inspection
- safe action preview/execution/recovery/audit flows

### 2.3 Current Wiki generation flow

Current Wiki generation is primarily assembled in:

```text
services/api/src/knowledge/knowledgeService.js
```

The current flow is conceptually:

```text
indexed_files
  -> file_extractions
  -> file_insights
  -> buildWikiPages()
  -> generated page objects
  -> persisted/served Wiki page API
  -> React Wiki UI
```

The current `knowledgeService.js` generates chunks in memory from extracted text and places source references into generated markdown.

Important current functions/concepts:

```text
createSourceChunks()
fileSource()
sourceFootnotes()
buildWorkspaceMarkdown()
buildCategoryMarkdown()
buildTopicMarkdown()
buildFileMarkdown()
buildKnowledgeIndex()
buildWikiPages()
```

### 2.4 Current limitation

The Phase 1 UI can inspect source chunks, but source chunks are not yet first-class durable database records.

Current chunk references such as `[S1:C3]` are generated from render order and in-memory source ordering. This is useful for UX but not strong enough for long-term evidence provenance.

---

## 3. Design goals

Phase 2 must make the Wiki evidence model durable.

Primary goals:

1. Persist Wiki pages as stable knowledge objects.
2. Persist page sections as addressable reading units.
3. Persist page sources as explicit provenance links.
4. Persist source chunks as stable evidence objects.
5. Persist page relations as navigable semantic links.
6. Preserve citation references across rebuilds where source content has not materially changed.
7. Support incremental rebuilds based on source fingerprints and dependency tracking.
8. Add citation coverage scoring and weak-source warnings.
9. Prepare for provider-based embeddings without requiring production vector infrastructure in the local MVP.
10. Keep user UI safe and non-destructive.

Non-goals for this phase:

- PostgreSQL migration
- pgvector/Qdrant production vector store
- multi-user tenant permissions
- SaaS deployment
- Windows installer
- destructive file mutation in the ordinary user UI

---

## 4. Core principles

### 4.1 Evidence-first knowledge

A generated Wiki claim should be traceable back to one or more source files and, where possible, specific chunks inside extracted text.

### 4.2 Content-first reading

Wiki pages should prioritize actual extracted document content over metadata. Metadata supports reading; it should not dominate the page.

### 4.3 Stable references over render-order references

Phase 1 citation references such as `[S1:C3]` are acceptable for UI readability. Phase 2 must back them with durable IDs so the same source chunk can be found after rebuilds.

### 4.4 Local MVP safety

The Wiki/Knowledge Base must remain read-first and safe. File movement, renaming, deletion, recovery, or operator workflows must remain approval-gated and outside the ordinary Wiki reading flow.

### 4.5 Incremental before intelligent

Before adding more AI creativity, the system must know what changed, what stayed stable, and which knowledge objects need rebuilding.

---

## 5. Proposed durable data model

The current schema already contains foundational tables:

```text
indexed_files
file_extractions
file_search_fts
file_insights
file_embeddings
watch_roots
app_settings
```

Phase 2 should add the following Wiki-specific tables.

---

## 5.1 `wiki_pages`

Purpose:

Store durable generated Wiki page records.

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('system', 'category', 'topic', 'file')),
  category TEXT,
  subcategory TEXT,
  summary TEXT,
  markdown TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  citation_coverage_score REAL,
  weak_source_warning INTEGER NOT NULL DEFAULT 0,
  rebuild_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('active', 'stale', 'failed', 'archived')),
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  error_message TEXT
);
```

Notes:

- `content_hash` hashes the generated markdown.
- `source_fingerprint` hashes the ordered source dependency set and source extraction hashes.
- `rebuild_version` increments when the page is regenerated.
- `status = stale` means dependencies changed but the page has not yet been rebuilt.

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_type ON wiki_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_category ON wiki_pages(category);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_status ON wiki_pages(status);
```

---

## 5.2 `wiki_page_sections`

Purpose:

Store addressable sections inside Wiki pages.

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS wiki_page_sections (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  heading TEXT NOT NULL,
  heading_level INTEGER NOT NULL,
  body_markdown TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_wiki_page_sections_page_id ON wiki_page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_sections_key ON wiki_page_sections(section_key);
```

Use cases:

- page-level search
- table of contents navigation
- future section-specific citations
- future AI question answering against exact Wiki sections

---

## 5.3 `wiki_page_sources`

Purpose:

Persist source references used by each Wiki page.

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS wiki_page_sources (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  filename TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  relative_path TEXT,
  location TEXT,
  evidence TEXT,
  source_order INTEGER NOT NULL,
  source_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE,
  UNIQUE (page_id, source_ref)
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_page_id ON wiki_page_sources(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_file_id ON wiki_page_sources(file_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_ref ON wiki_page_sources(page_id, source_ref);
```

Notes:

- `source_ref` preserves readable labels such as `S1`, `S2`.
- `id` should be stable where possible, based on `page_id + file_id + source_order/source_hash`.
- Source order may still change, but durable `id` provides the real backend anchor.

---

## 5.4 `wiki_source_chunks`

Purpose:

Persist source-level evidence chunks as first-class objects.

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS wiki_source_chunks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  page_source_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  chunk_ref TEXT NOT NULL,
  chunk_number INTEGER NOT NULL,
  stable_chunk_key TEXT NOT NULL,
  heading TEXT,
  text TEXT NOT NULL,
  evidence TEXT,
  location TEXT,
  line_start INTEGER,
  line_end INTEGER,
  char_start INTEGER,
  char_end INTEGER,
  page_number INTEGER,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (page_source_id) REFERENCES wiki_page_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE,
  UNIQUE (page_id, chunk_ref)
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_page_id ON wiki_source_chunks(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_file_id ON wiki_source_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_source ON wiki_source_chunks(page_source_id);
CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_ref ON wiki_source_chunks(page_id, chunk_ref);
CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_stable_key ON wiki_source_chunks(stable_chunk_key);
```

Stable chunk key strategy:

```text
stable_chunk_key = sha256(file_id + extractor_name + normalized_text_window + approximate_position)
```

MVP-safe option:

```text
stable_chunk_key = sha256(file_id + content_hash + chunk_number + normalized_chunk_text_prefix)
```

Better future option:

```text
stable_chunk_key = sha256(file_id + extraction_version + page_number + line_start + normalized_chunk_text)
```

Notes:

- `chunk_ref` can remain UI-readable, for example `S1:C3`.
- `id` should be the backend truth.
- `page_number` is nullable until page-aware PDF extraction is reliable.

---

## 5.5 `wiki_page_relations`

Purpose:

Persist semantic/navigation relationships between Wiki pages.

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS wiki_page_relations (
  id TEXT PRIMARY KEY,
  source_page_id TEXT NOT NULL,
  target_page_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('category', 'topic', 'source_file', 'semantic', 'entity', 'manual')),
  label TEXT,
  score REAL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (target_page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_source ON wiki_page_relations(source_page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_target ON wiki_page_relations(target_page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_type ON wiki_page_relations(relation_type);
```

Use cases:

- Related Pages section
- semantic topic graph
- entity-driven navigation
- future graph visualization

---

## 5.6 `wiki_rebuilds`

Purpose:

Track versioned rebuild runs and validation metadata.

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS wiki_rebuilds (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('full', 'incremental', 'selective')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input_json TEXT NOT NULL,
  summary_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  error_message TEXT
);
```

Use cases:

- rebuild history
- async rebuild panel
- evidence of what was rebuilt and why
- future rollback/version comparison

---

## 6. Citation model

### 6.1 User-facing citation forms

The UI should continue to support:

```text
[S1]
[S1:C3]
```

Meaning:

```text
[S1]    = source-level reference
[S1:C3] = chunk-level reference inside source S1
```

### 6.2 Backend citation mapping

Each citation should map to durable records:

```text
[S1]
  -> wiki_page_sources.id

[S1:C3]
  -> wiki_source_chunks.id
```

### 6.3 Citation click behavior

When a citation is clicked:

```text
citation badge
  -> parse source_ref/chunk_ref
  -> find wiki_page_sources record
  -> find wiki_source_chunks record if chunk ref exists
  -> open Source Preview Drawer
  -> highlight source card
  -> scroll to matching chunk
```

### 6.4 Citation coverage score

Each Wiki page should calculate:

```text
citation_coverage_score = cited_sections / total_claim_sections
```

MVP approximation:

```text
citation_coverage_score = sections_with_any_source_ref / total_sections
```

Future stronger version:

```text
citation_coverage_score = claim_sentences_with_chunk_refs / total_claim_sentences
```

Weak-source warning should be enabled when:

- no sources exist
- source chunks are missing
- page is generated mainly from summaries instead of extracted text
- citation coverage falls below threshold
- extraction is failed or unsupported for important source files

---

## 7. Rebuild orchestration

### 7.1 Full rebuild

Full rebuild should:

```text
read indexed_files
read file_extractions
read file_insights
build pages
build sections
build sources
build chunks
build relations
persist all results transactionally
mark obsolete pages stale or archived
record wiki_rebuilds row
```

### 7.2 Incremental rebuild

Incremental rebuild should detect changed dependencies:

```text
file content_hash changed
file extraction changed
file insight changed
category/topic membership changed
source fingerprint changed
```

Then rebuild only affected pages:

```text
changed file page
affected topic page
affected category page
workspace overview if counts/categories changed
```

### 7.3 Selective rebuild

Selective rebuild should support:

```text
single file page
single topic page
single category page
all pages depending on file_id
```

### 7.4 Transaction boundary

A rebuild should not partially corrupt the Wiki state.

Recommended pattern:

```text
build generated objects in memory
validate generated objects
begin transaction
upsert pages
replace page sections/sources/chunks/relations for affected pages
record rebuild summary
commit
```

If validation fails, do not overwrite the active Wiki page unless explicitly running in repair mode.

---

## 8. Repository/service structure

Recommended files for Phase 2 implementation:

```text
services/api/src/db/wikiRepository.js
  Durable persistence for wiki_pages, wiki_page_sections, wiki_page_sources, wiki_source_chunks, wiki_page_relations, wiki_rebuilds

services/api/src/knowledge/wikiChunkService.js
  Chunk generation, stable chunk keys, citation ref generation

services/api/src/knowledge/wikiPageBuilder.js
  Converts indexed/extracted/insight data into page objects

services/api/src/knowledge/wikiRelationService.js
  Builds category/topic/entity/semantic relations

services/api/src/knowledge/wikiQualityService.js
  Citation coverage, weak-source warnings, source density indicators

services/api/src/knowledge/wikiRebuildService.js
  Full/incremental/selective rebuild orchestration

services/api/src/routes/wiki.routes.js
  Page listing/detail/source/chunk API responses

services/api/src/routes/wikiJobs.routes.js
  Async rebuild job API
```

Migration strategy:

1. Keep current `buildWikiPages()` behavior working.
2. Extract chunk generation into `wikiChunkService.js`.
3. Add repository write/read functions.
4. Persist generated Wiki objects after build.
5. Update routes to prefer persisted Wiki objects.
6. Keep fallback to generated objects until persistence is proven.
7. Add tests.
8. Remove fallback only when stable.

---

## 9. API contract direction

### 9.1 List Wiki pages

```http
GET /wiki/pages
```

Response should include:

```json
{
  "pages": [
    {
      "id": "...",
      "slug": "...",
      "title": "...",
      "page_type": "file",
      "category": "...",
      "subcategory": "...",
      "summary": "...",
      "citation_coverage_score": 0.92,
      "weak_source_warning": false,
      "updated_at": "..."
    }
  ]
}
```

### 9.2 Get Wiki page detail

```http
GET /wiki/pages/:slug
```

Response should include:

```json
{
  "page": {},
  "sections": [],
  "sources": [],
  "chunks": [],
  "relations": [],
  "quality": {
    "citation_coverage_score": 0.92,
    "weak_source_warning": false,
    "source_density": 0.8
  }
}
```

### 9.3 Get source preview

```http
GET /wiki/pages/:pageId/sources/:sourceRef
GET /wiki/pages/:pageId/chunks/:chunkRef
```

The frontend source drawer should be able to request durable source/chunk data directly instead of relying only on embedded page JSON.

---

## 10. Frontend implications

Primary frontend files:

```text
apps/everything-ai-ui/src/user/WikiView.tsx
apps/everything-ai-ui/src/user/WikiSourcePreviewDrawer.tsx
apps/everything-ai-ui/src/user/wikiMarkdown.tsx
apps/everything-ai-ui/src/user/types.ts
apps/everything-ai-ui/src/api.ts
```

Frontend should keep the existing UX model but use durable backend fields when available.

Recommended additions to frontend types:

```ts
export interface WikiPageSection {
  id: string;
  page_id: string;
  section_key: string;
  heading: string;
  heading_level: number;
  body_markdown: string;
  order_index: number;
}

export interface WikiPageSource {
  id: string;
  page_id: string;
  file_id: string;
  source_ref: string;
  filename: string;
  absolute_path: string;
  relative_path?: string;
  location?: string;
  evidence?: string;
}

export interface WikiSourceChunk {
  id: string;
  page_id: string;
  page_source_id: string;
  file_id: string;
  source_ref: string;
  chunk_ref: string;
  chunk_number: number;
  stable_chunk_key: string;
  text: string;
  evidence?: string;
  location?: string;
  line_start?: number;
  line_end?: number;
  char_start?: number;
  char_end?: number;
  page_number?: number;
}
```

The drawer should prefer:

```text
chunk.id
chunk.chunk_ref
chunk.stable_chunk_key
```

instead of relying only on the generated `ref` field.

---

## 11. Extraction roadmap

### 11.1 Text extraction

Current extracted text is stored in:

```text
file_extractions.extracted_text
```

Phase 2 should preserve this but add chunk persistence.

### 11.2 PDF page awareness

PDF page numbers should remain nullable until the extractor can reliably provide page-level metadata.

Target future extraction contract:

```json
{
  "text": "...",
  "pages": [
    {
      "page_number": 1,
      "text": "...",
      "char_start": 0,
      "char_end": 1820
    }
  ]
}
```

### 11.3 Tables/images/charts

Tables/images/charts should not be invented from text.

Future extraction should produce structured artifacts:

```text
extracted_tables
extracted_images
extracted_figures
```

For local MVP Phase 2, document these as planned but do not block durable chunk persistence on them.

---

## 12. Embedding/provider strategy

The local MVP currently has a deterministic vector-style search foundation and `file_embeddings` storage.

Phase 2 should prepare for real embedding providers without requiring production infrastructure.

Suggested abstraction:

```text
services/api/src/embeddings/providerRegistry.js
services/api/src/embeddings/providers/deterministicProvider.js
services/api/src/embeddings/providers/ollamaEmbeddingProvider.js
```

Future embedding targets:

- page sections
- source chunks
- file summaries
- entity clusters
- relation scoring

Do not introduce pgvector/Qdrant inside local MVP finalization unless explicitly approved.

---

## 13. Testing plan

Backend tests should be added or extended in:

```text
services/api/test/localMvp.test.js
services/api/test/wiki*.test.js
services/api/test/jobs.test.js
```

Required test coverage:

- persists Wiki pages
- persists page sections
- persists page sources
- persists source chunks
- stable chunk IDs survive unchanged rebuilds
- changed extracted text marks affected pages stale or rebuilds them
- `[S1]` maps to a persisted source
- `[S1:C3]` maps to a persisted chunk
- source preview response includes durable chunk data
- weak-source warning is true when chunks are missing
- incremental rebuild affects only dependent pages where possible
- rebuild failure does not corrupt active pages

Frontend validation:

- Wiki page opens normally
- citations remain clickable
- source preview drawer opens
- chunk scroll/highlight works
- copy citation/path still works
- async rebuild panel still works
- no destructive actions appear in ordinary Wiki reader flow

---

## 14. Implementation sequence

### Step 1 — Design committed

Create this document:

```text
docs/WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md
```

### Step 2 — Validation gate

Before implementation, close or satisfy:

```text
GitHub Issue #20 — Validate watcher test fix on desktop
```

Do not mark Phase 1 fully validated until backend tests pass locally.

### Step 3 — Schema expansion

Update:

```text
services/api/src/db/schema.sql
```

Add:

```text
wiki_pages
wiki_page_sections
wiki_page_sources
wiki_source_chunks
wiki_page_relations
wiki_rebuilds
```

### Step 4 — Repository layer

Update/create:

```text
services/api/src/db/wikiRepository.js
```

Add functions:

```text
upsertWikiPage()
replaceWikiPageSections()
replaceWikiPageSources()
replaceWikiSourceChunks()
replaceWikiPageRelations()
recordWikiRebuild()
getWikiPageBySlug()
listWikiPages()
getWikiPageEvidence()
```

### Step 5 — Chunk service extraction

Create:

```text
services/api/src/knowledge/wikiChunkService.js
```

Move/refactor chunk logic from:

```text
services/api/src/knowledge/knowledgeService.js
```

### Step 6 — Persistent rebuild path

Create:

```text
services/api/src/knowledge/wikiRebuildService.js
```

Use it from Wiki routes/jobs.

### Step 7 — API/read model update

Update:

```text
services/api/src/routes/wiki.routes.js
```

Routes should prefer persisted Wiki data.

### Step 8 — Frontend type/read support

Update:

```text
apps/everything-ai-ui/src/user/types.ts
apps/everything-ai-ui/src/user/WikiView.tsx
apps/everything-ai-ui/src/user/WikiSourcePreviewDrawer.tsx
```

### Step 9 — Tests

Add backend tests before declaring Phase 2 Step 1 complete.

---

## 15. Acceptance criteria for Phase 2 durable knowledge engine foundation

The foundation is complete when:

1. Wiki pages persist in SQLite.
2. Page sections persist in SQLite.
3. Page sources persist in SQLite.
4. Source chunks persist in SQLite.
5. Citation refs resolve to durable source/chunk records.
6. Source preview drawer works from durable data.
7. Incremental rebuild can identify changed source dependencies.
8. Rebuild history is recorded.
9. Backend test suite passes.
10. Frontend typecheck/build passes.
11. User UI remains safe and non-destructive.
12. README and MVP finalization docs reflect actual validated behavior.

---

## 16. Open questions

These should be answered before deeper Phase 2 implementation:

1. Should `wiki_pages.markdown` remain the primary rendered content, or should sections become the primary render source?
2. Should source chunks be global per file extraction, page-specific, or both?
3. Should chunk IDs prioritize stability across changed text or exact traceability to each rebuild version?
4. Should the local MVP keep only latest Wiki version, or keep previous versions for comparison?
5. Should page-level search use SQLite FTS over `wiki_page_sections`?
6. Should extracted tables be stored as JSON artifacts or rendered markdown first?

Recommended MVP answers:

1. Keep `wiki_pages.markdown` as primary render source for now.
2. Store page-specific chunks first; add global extraction chunks later if needed.
3. Prioritize exact traceability first, then improve stability.
4. Keep latest active version and rebuild history; add page version history later.
5. Yes, add FTS over page sections after durable sections exist.
6. Store JSON artifacts later; render safe markdown summaries first.

---

## 17. Final principle

The Wiki should become the trusted knowledge layer of EverythingAI.

It must not only generate readable pages. It must preserve the evidence chain:

```text
claim
  -> citation
  -> source
  -> chunk
  -> file
  -> path
  -> extraction state
```

This evidence chain is the difference between a simple AI summary tool and a governed operational knowledge workspace.
