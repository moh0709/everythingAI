# Validation — Phase 8.3B Wiki Chunk Citation Highlighting

Date: 2026-06-14
Phase: 8.3B release hardening
Batch: citation/source highlighting polish

## Files changed

```text
apps/everything-ai-ui/src/user/wikiMarkdown.tsx
docs/VALIDATION_2026-06-14_PHASE8_3B_WIKI_CHUNK_CITATION_HIGHLIGHTING.md
```

## Scope

This batch performs a narrow Client Workspace citation-highlighting improvement.

It preserves chunk-level citation references when opening source previews from rendered Knowledge Base markdown.

## Issue fixed

Inline source references already support source citations and source chunk citations.

Before this batch, a source chunk citation such as `S1:C2` was reduced to only `S1` before the click handler received it.

That allowed the source preview to open, but prevented the preview drawer from receiving the exact chunk reference for chunk scrolling and highlighting.

## Implementation

Updated:

```text
apps/everything-ai-ui/src/user/wikiMarkdown.tsx
```

The citation normalization now removes only the surrounding citation brackets and preserves the chunk suffix.

Expected behavior:

```text
[S1]    becomes S1
[S1:C2] becomes S1:C2
```

`WikiView.tsx` already splits a chunk citation into source ref and chunk ref before opening `WikiSourcePreviewDrawer`, so this patch restores the intended chunk-level preview flow without changing backend contracts.

## Safety boundaries preserved

- Client Workspace still does not expose provider selection.
- Client Workspace still does not expose API keys.
- Client Workspace still does not expose Agent Connectors.
- No admin components were imported into Client Workspace.
- No agent bridge execution was enabled.
- No agent chat execution was enabled.
- No arbitrary browser shell execution was enabled.
- No trust-score, quality-score, human-validation, diagnostics, artifact, evidence, or source-provenance logic was changed.
- No backend schema or API contract was changed.

## Validation status

Implementation was committed directly to `main`.

Local validation has not yet been executed for this batch.

Required validation command for the local Windows repo:

```bat
cd C:\temp\EverythingAI\apps\everything-ai-ui
git pull
.\scripts\clean-and-smoke.bat
```

Expected result before declaring this batch green:

```text
GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS
```

## Current result

Status: implementation committed; local validation pending.
