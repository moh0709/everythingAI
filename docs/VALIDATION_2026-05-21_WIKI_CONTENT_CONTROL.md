# Wiki Content Control Validation

Date: 2026-05-21

## Scope

This note records validation after adding content-controlled Wiki generation.

## Objective

Wiki pages should be populated in a more controlled, source-grounded way.

The important rule is:

```text
Document body content must come from extracted source text, not from AI summaries or weak metadata.
```

## Implementation

```text
services/api/src/knowledge/contentControl.js
services/api/src/knowledge/knowledgeService.js
services/api/test/wikiContentControl.test.js
```

## Behavior added

```text
AI summaries no longer become fake citation-backed document body content.
File pages use extracted source text first.
Topic/category pages prefer real source chunks.
Pages without extracted text clearly show that source-backed content is not available yet.
About This Document shows content-control state.
```

The user-facing fallback message is:

```text
No source-backed extracted document content is available yet.
```

## Backend validation

Command:

```text
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

Result:

```text
tests 88
pass 88
fail 0
cancelled 0
skipped 0
todo 0
```

Duration reported:

```text
3096.902 ms
```

## New tests passed

```text
wiki file pages do not use AI summaries as source-backed document body
wiki file pages populate document body from extracted source text when available
```

## Related passing tests

```text
wiki source chunks include page numbers when extraction metadata provides a page map
persists durable wiki pages, sections, sources, chunks, relations, and rebuild records
durable wiki evidence routes expose pages, evidence, and source chunks
```

## Status

PASS.

Content-controlled Wiki generation is now validated in the local MVP baseline.
