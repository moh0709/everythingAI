# EverythingAI Local MVP Status

Date: 2026-05-21

## Current baseline

EverythingAI local MVP is currently green at:

```text
Backend tests: 88/88 PASS
Frontend typecheck: PASS from latest frontend validation cycle
Frontend build: PASS from latest frontend validation cycle
Windows local UI smoke: PASS from latest local UI smoke validation
```

The latest full backend validation is recorded in:

```text
docs/VALIDATION_2026-05-21_WIKI_CONTENT_CONTROL.md
```

The latest full handover is recorded in:

```text
docs/HANDOVER_2026-05-21_EVERYTHINGAI_LOCAL_MVP_88_TEST_BASELINE.json
```

## Product identity at this baseline

EverythingAI is now a local-first, source-backed AI knowledge workspace that can:

```text
index local folders
extract supported document text
search indexed and extracted content
run semantic-style local search
generate controlled source-backed Wiki pages
show citations and source chunks
track evidence and source metadata
watch folders for changes
skip unchanged scans/extractions/embeddings
show scanner and watcher status in the UI
prepare safe file-organization actions
require preview and approval before move/rename
support undo, recovery snapshots, trash/restore, and audit logs
```

## Completed MVP phases

### Phase 1 — Stabilization

Status: complete / validated.

Key outcomes:

```text
route modularization
request validation helpers
schema drift repair
startup schema repair
Windows smoke validation
```

### Phase 2 — Scanner optimization

Status: complete / validated.

Key outcomes:

```text
configurable file limits/excludes
skipped reasons
progress callback support
persisted unchanged-file skip strategy
Start screen scan report
```

### Phase 3 — Watcher optimization

Status: complete / validated.

Key outcomes:

```text
debounce
overlap prevention
queued pending rerun handling
correct DB path use
rapid-change watcher stress test
watcher runtime status route
Start screen watcher status panel
```

### Phase 4 — Extraction and embedding optimization

Status: complete / validated.

Key outcomes:

```text
skip unchanged extractions
skip unchanged embeddings
future embedding provider interface
PDF/page metadata support for Wiki source chunks
content-controlled Wiki generation
```

### Phase 5 — Safety hardening

Status: complete / validated.

Key outcomes:

```text
delete disabled
move/rename behind preview and approval
failed execution audit
nested undo
recovery snapshots
trash/restore visibility protection
source reveal route
```

## Content-controlled Wiki rule

The current Wiki generation rule is strict:

```text
Document body content must come from extracted source text.
AI summaries must not be used as fake source-backed document body content.
```

If extracted source text is missing, the page must clearly show:

```text
No source-backed extracted document content is available yet.
```

This is validated by:

```text
services/api/test/wikiContentControl.test.js
```

## Important future track

The future AI organization/archive feature is captured separately:

```text
docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md
GitHub issue #21 — Future Track: AI Organization Workspace / Managed Knowledge Archive
```

This future track should remain separate from the current local MVP finalization unless explicitly selected as the next product priority.

## Remaining work

### Phase 6 — Controlled UI modularization

Remaining, but should be handled carefully.

Recommended rule:

```text
Only split small, isolated UserApp responsibilities.
Do not combine UI redesign and workflow extraction in the same commit.
Do not do broad refactoring while the 88/88 backend baseline is green.
```

### Phase 7 — Documentation finalization

Mostly complete, but README and ticket comments may still be updated to point to the 88-test baseline.

## PM recommendation

The safest next step is:

```text
Preserve the green baseline.
Avoid new runtime features immediately.
Update GitHub ticket comments and README references.
Only perform docs-only or very small isolated cleanup next.
```

## Do not do next

```text
Do not start enterprise governance tickets as MVP work.
Do not implement AI Organization Workspace yet unless explicitly selected.
Do not perform broad UserApp refactoring.
Do not allow AI summaries to populate source-backed document body content.
Do not add destructive file actions.
```
