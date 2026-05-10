# Unified Search Visibility Rules

This document records the local MVP visibility rules for semantic search and unified search.

## Validation status

```text
47 tests passing / 0 failing
```

## Scope

The rules apply to:

```text
GET /api/semantic-search
GET /api/unified-search
```

## Default visibility

Normal user-facing semantic and unified search must not leak active trashed files or file-linked metadata.

```text
/api/semantic-search                 -> hides active trashed files by default
/api/unified-search                  -> hides active trashed file-linked rows by default
```

## Recovery/admin visibility

Recovery/admin views may opt into trashed visibility with `includeTrashed=true`.

```text
/api/semantic-search?includeTrashed=true
/api/unified-search?includeTrashed=true
```

When included, trashed rows must expose:

```text
recovery_status = trashed
```

## Unified search buckets

Unified search applies trash visibility to all file-linked buckets:

```text
files
semantic
insights
labels
suggestions
executions
```

This prevents related metadata such as labels, insights, suggestions, and execution history from exposing trashed files in normal search views.

## Implementation notes

Implemented helpers:

```text
services/api/src/recovery/trashVisibility.js
- annotateFileLinkedRows()
- filterActiveFileLinkedRows()
```

Implemented services/routes:

```text
services/api/src/search/semanticSearch.js
services/api/src/search/unifiedSearchService.js
services/api/src/routes/search.routes.js
```

Test coverage:

```text
services/api/test/unifiedSearchVisibility.test.js
```

Covered behavior:

```text
semantic search hides trashed files by default
semantic search includes trashed files with includeTrashed=true
unified search does not leak trashed file-linked rows by default
unified search includes trashed file-linked rows with includeTrashed=true
```
