# Phase 4 Extraction and Embedding Optimization Complete

Date: 2026-05-21

## Scope

This note records completion of Phase 4 extraction and embedding optimization for the current local MVP finalization plan.

## Completed Phase 4 items

```text
Skip unchanged already-extracted files by default
Add force extraction option internally
Generate content-first wiki pages from extracted text
Generate chunk-level wiki citation markers such as [S1:C3]
Add persistent Wiki/Knowledge Base technical design
Add durable Wiki schema tables
Add durable Wiki repository read/write helpers
Add durable Wiki evidence API routes
Add backend tests for durable Wiki persistence and evidence routes
Add frontend TypeScript contracts and API helpers for durable Wiki evidence
Avoid regenerating embeddings for unchanged extracted text
Add future provider interface for real neural embeddings
Add PDF page-level source references where extractor can provide page metadata
```

## Latest implementation highlights

### Embedding skip

```text
services/api/src/embeddings/embeddingService.js
services/api/test/embeddingSkipUnchanged.test.js
```

Embedding generation now hashes the exact embedding source input and skips regeneration when the embedding model and source hash are unchanged.

### Embedding provider interface

```text
services/api/src/embeddings/embeddingProviders.js
services/api/src/embeddings/embeddingService.js
services/api/test/embeddingProviderInterface.test.js
```

The embedding layer now supports a future provider interface while keeping the default deterministic local provider stable for the local MVP.

### PDF/page metadata source references

```text
services/api/src/knowledge/sourcePageMetadata.js
services/api/src/knowledge/knowledgeService.js
services/api/src/db/client.js
services/api/test/wikiPageMetadata.test.js
```

Extraction metadata can now flow into Wiki source chunks when the extractor provides page metadata such as:

```json
{
  "page_map": [
    { "page_number": 1, "char_start": 0, "char_end": 1000 }
  ]
}
```

Wiki chunks can now carry:

```text
page_number
page-aware location text
```

## Regression repair during validation

A temporary regression occurred while exposing extraction metadata in `services/api/src/db/client.js`.

The issue was repaired by restoring DB client compatibility exports and preserving the new `metadata_json` field.

Relevant repair commits:

```text
96a5fcd Restore DB client compatibility exports
05a77f5 Respect includeTrashed in keyword search service
9453e5a Restore duplicate group listing export
```

## Backend validation

Command:

```text
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

Result:

```text
tests 86
pass 86
fail 0
cancelled 0
skipped 0
todo 0
```

Duration reported:

```text
3377.4699 ms
```

## Important passing tests

```text
embedding generation skips unchanged extracted text and regenerates changed text
embedding generation accepts a custom synchronous provider while default search remains stable
wiki source chunks include page numbers when extraction metadata provides a page map
normal search hides trashed files while includeTrashed returns explicit trashed state
unified search does not leak trashed file-linked rows by default
```

## Status

PASS.

Phase 4 is complete / validated for the current local MVP baseline.
