# Phase 7.1 Current Wiki Backend Map

Date: 2026-05-27  
Repository: `moh0709/everythingAI`  
Branch: `main`  
Scope: Backend inspection map only

## Purpose

This document records the actual current backend state for the EverythingAI Wiki / Durable Knowledge Engine before making further Phase 7.1 implementation changes.

Important correction from inspection:

Phase 7.1 is not starting from zero. Durable Wiki persistence already exists in the backend.

This document is documentation-only. It does not change runtime code, schema, tests, frontend code, UI design, or destructive file-action policy.

## Files Inspected

```text
services/api/src/knowledge/knowledgeService.js
services/api/src/routes/wiki.routes.js
services/api/src/db/wikiRepository.js
services/api/src/db/wikiIncrementalRepository.js
services/api/src/knowledge/wikiIncrementalService.js
services/api/src/knowledge/wikiSelectiveRebuildService.js
services/api/src/db/schema.sql
```

## High-Level Finding

The backend already contains a substantial durable Wiki foundation:

- durable Wiki tables exist in `schema.sql`
- `wikiRepository.js` can create/ensure durable Wiki schema
- generated Wiki pages can be persisted
- page sections can be persisted
- page sources can be persisted
- source chunks can be persisted
- page relations can be persisted
- rebuild records can be persisted
- persisted Wiki pages are preferred by `/api/wiki` when available
- source chunk lookup routes already exist
- incremental rebuild planning exists
- selective replacement planning exists

The next phase should therefore be validation/hardening, not initial persistence design.

## Current Wiki Generation Flow

File:

```text
services/api/src/knowledge/knowledgeService.js
```

Key exports/functions:

```text
buildKnowledgeIndex()
buildWikiPages()
```

Important internal functions:

```text
createSourceChunks()
createDocumentSourceChunks()
makeSourceForInsight()
buildWorkspaceMarkdown()
buildCategoryMarkdown()
buildTopicMarkdown()
buildFileMarkdown()
sourceFootnotes()
renderChunkText()
```

Current generation flow:

```text
indexed_files
  -> file_extractions
  -> file_insights
  -> buildWikiPages()
  -> generated wiki object
  -> optional persistence through Wiki routes/repository
```

Important behavior:

- `createSourceChunks()` generates source chunks from extracted text.
- Chunk refs are readable references like `S1:C1`, `S1:C2`, etc.
- `createDocumentSourceChunks()` enriches generated chunks with page metadata.
- File pages render source-backed extracted content directly into markdown.
- Topic/category/workspace pages use controlled source-backed summaries and source references.
- `buildWikiPages()` returns generated pages; persistence happens outside the service.

## Current Wiki Routes

File:

```text
services/api/src/routes/wiki.routes.js
```

Important routes:

```text
GET  /wiki
GET  /wiki/pages/:slug
GET  /wiki/pages/:pageId/evidence
GET  /wiki/pages/:pageId/chunks/:chunkRef
GET  /wiki/rebuild-plan
POST /wiki/build
```

Important behavior:

- `GET /wiki` first tries `listPersistedWikiPages()`.
- If no persisted Wiki exists, it falls back to `buildWikiPages()`.
- `POST /wiki/build` generates file insights, builds Wiki pages, calculates a selective replacement plan, persists Wiki pages, saves dependencies/fingerprints, updates build state, and records rebuild metadata.
- `GET /wiki/pages/:pageId/evidence` returns persisted evidence for a page.
- `GET /wiki/pages/:pageId/chunks/:chunkRef` resolves a persisted chunk by page ID and chunk ref.

This means the API already has a durable read path and chunk lookup path.

## Current Durable Wiki Repository

File:

```text
services/api/src/db/wikiRepository.js
```

Important functions:

```text
ensureWikiPersistenceSchema()
clearPersistedWiki()
replacePersistedWikiPages()
persistWikiPages()
listPersistedWikiPages()
getPersistedWikiPageBySlug()
getPersistedWikiPageEvidence()
getPersistedWikiChunkByRef()
recordWikiRebuild()
```

Important persistence behavior:

- `ensureWikiPersistenceSchema()` creates durable Wiki tables if missing.
- `persistWikiPages()` clears existing persisted Wiki data and inserts generated pages.
- `replacePersistedWikiPages()` deletes and replaces only selected pages.
- `insertPages()` inserts pages, sections, sources, chunks, and relations.
- `hydrateWikiPage()` reconstructs API-compatible Wiki page objects from durable rows.
- `getPersistedWikiChunkByRef()` joins chunks with source file data for lookup.

## Current Durable Tables

Defined in:

```text
services/api/src/db/schema.sql
services/api/src/db/wikiRepository.js
```

Existing durable Wiki tables:

```text
wiki_pages
wiki_page_sections
wiki_page_sources
wiki_source_chunks
wiki_page_relations
wiki_rebuilds
```

Existing incremental/rebuild support tables:

```text
wiki_build_state
wiki_file_fingerprints
wiki_page_dependencies
```

## Current Durable Data Model

### `wiki_pages`

Stores generated Wiki pages with:

- page ID
- slug
- title
- page type
- category/subcategory
- summary
- markdown
- content hash
- source fingerprint
- citation coverage score
- weak source warning
- rebuild version
- status
- generated/updated timestamps

### `wiki_page_sections`

Stores addressable markdown sections extracted from generated Wiki pages.

### `wiki_page_sources`

Stores source references such as `S1`, source file IDs, paths, evidence snippets, order, and source hash.

### `wiki_source_chunks`

Stores chunk references such as `S1:C3`, stable chunk keys, text, evidence, line/char positions, page number, and content hash.

### `wiki_page_relations`

Stores relations between pages.

Current relation persistence uses `semantic` relation type for generated related pages.

### `wiki_rebuilds`

Stores rebuild metadata such as mode, status, input, summary, timestamps, and errors.

## Current Incremental Wiki Support

Files:

```text
services/api/src/db/wikiIncrementalRepository.js
services/api/src/knowledge/wikiIncrementalService.js
services/api/src/knowledge/wikiSelectiveRebuildService.js
```

Current capabilities:

- persist Wiki build state
- persist file fingerprints
- persist page dependencies
- detect changed files by content hash and content length
- identify pages depending on changed files
- generate a rebuild plan
- build a selective replacement plan

Important current flow:

```text
collectCurrentWikiFingerprints()
  -> detectChangedWikiFiles()
  -> getWikiPagesDependingOnFiles()
  -> buildIncrementalWikiPlan()
  -> buildSelectiveReplacementPlan()
```

## Current Build Flow

`POST /wiki/build` currently performs:

```text
generateFileInsights()
buildWikiPages()
buildSelectiveReplacementPlan()
if selective replacement:
  replacePersistedWikiPages()
else:
  persistWikiPages()
saveWikiPageDependencies()
saveWikiFileFingerprints()
updateWikiBuildState()
recordWikiRebuild()
return wiki payload
```

## Current Evidence Chain

The backend already supports this chain in persisted form:

```text
wiki page
  -> wiki page section
  -> wiki page source
  -> wiki source chunk
  -> indexed file
```

The route layer exposes evidence and chunk lookup endpoints.

## Important Correction To Phase 7.1 Plan

Previous Phase 7.1 planning assumed the durable persistence model still needed to be introduced.

Actual inspection shows:

- the model already exists
- repository functions already exist
- schema already exists
- API routes already use the persisted model
- incremental planning already exists

Therefore, the next work should not be "add persistence from scratch".

The next work should be:

1. validate current durable Wiki behavior with tests
2. identify gaps between design and implementation
3. harden citation/chunk stability
4. ensure selective rebuild behavior is correct
5. update docs to reflect actual implemented status

## Known Risk Areas To Validate Next

### 1. `hasDurableWikiSchema()` behavior

In `wikiRepository.js`, `hasDurableWikiSchema()` returns `true` when `wiki_pages` does not exist.

This may be intentional because `ensureWikiPersistenceSchema()` then creates missing tables, but the naming can be misleading.

### 2. Schema duplication

Durable Wiki schema exists in both:

```text
services/api/src/db/schema.sql
services/api/src/db/wikiRepository.js
```

This can be acceptable, but future changes must keep both aligned.

### 3. Selective replacement no-op behavior

`buildSelectiveReplacementPlan()` returns `no-op` when no changed files exist.

Current `POST /wiki/build` treats non-selective-replacement as full persistence through `persistWikiPages()`.

This may mean `no-op` still causes a full persistence replacement. This should be tested and either accepted or corrected.

### 4. Stable chunk key strength

Current stable chunk key uses:

```text
file_id
absolute_path
source_ref
chunk_number
line_start
line_end
first 240 chars of text/evidence
```

This is useful but may still change when chunk order or line boundaries shift.

### 5. Rebuild version

`rebuild_version` appears to be inserted as `1` during page persistence.

If version history matters, this should be hardened later.

### 6. Citation coverage score

Current citation coverage score is based on markdown citation refs divided by number of sources.

This may be too rough for real evidence coverage.

## Recommended Next Step

Do not add new schema yet.

Next recommended action:

Run or inspect backend tests related to Wiki persistence and rebuild behavior.

Relevant test files to inspect next:

```text
services/api/test/localMvp.test.js
services/api/test/wiki*.test.js
services/api/test/jobs.test.js
```

Expected next documentation artifact:

```text
docs/PHASE7_1_WIKI_TEST_COVERAGE_MAP.md
```

## Suggested Next Implementation Ticket

Title:

`Phase 7.1: Validate and harden durable Wiki persistence`

Scope:

- inspect existing Wiki tests
- map coverage gaps
- add missing tests only where needed
- validate persisted pages, sections, sources, chunks, evidence routes, and selective rebuild behavior
- avoid schema changes unless tests expose a real gap

## Current Status

Phase 7.1 backend inspection is complete enough to correct the plan:

EverythingAI already has the foundation of the durable knowledge engine. The next phase is validation and hardening, not initial construction.
