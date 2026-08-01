# EAI-TASK-020: Extracted Document Preview Readability

- Issue: #42
- Final status: PASS
- Artifact commit SHA: pending until the focused artifact commit is created and pushed; the final issue comment records the pushed SHA.

## Summary
The extracted document preview renderer now keeps its parsing rules in a testable preview model and improves section recognition for common long-document structures. Numbered report sections such as `1. Executive Summary` render as headings instead of list items, common section labels such as `Findings` are recognized, unicode bullet lists are grouped cleanly, and table-like rows remain grouped for scanability.

## Files changed
- `apps/everything-ai-ui/src/shared/ExtractedTextPreviewImpl.tsx`
- `apps/everything-ai-ui/src/shared/extractedTextPreviewModel.ts`
- `apps/everything-ai-ui/src/shared/extractedTextPreviewModel.test.mjs`
- `LOGS/EAI-TASK-020-terminal.log`
- `REPORTS/EAI-TASK-020-EXTRACTED-DOCUMENT-PREVIEW-READABILITY.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_020_EXTRACTED_DOCUMENT_PREVIEW_READABILITY.json`

## Preview/readability behavior implemented or reviewed
- Preserves the shared extracted text source selection path.
- Preserves User Explore and Admin Explorer usage of the shared preview component.
- Extracts preview parsing into `buildExtractedTextPreviewModel` for focused regression coverage.
- Recognizes numbered report/book section headings before numeric list-item handling.
- Recognizes common section labels including summary, overview, findings, recommendations, and table of contents.
- Groups unicode bullet lists and table-like rows into structured preview blocks.
- Preserves paragraph grouping, line-ending normalization, non-breaking-space normalization, truncation guidance, and sparse/low-confidence guidance.

## Behavior preserved
- Existing file preview endpoint compatibility remains unchanged.
- Existing extracted text storage remains unchanged.
- No destructive file actions were introduced.
- Client Workspace behavior remains read-only for inspection.

## Validation command results
- `git pull --ff-only`: PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs`: PASS
- `node --test apps/everything-ai-ui/src/shared/extractedTextPreviewModel.test.mjs`: PASS, 2/2 tests
- `cd apps/everything-ai-ui && npm run typecheck`: PASS
- `cd apps/everything-ai-ui && npm run build`: PASS
- `cd services/api && npm test`: PASS, 173/173 tests

## Risks and rollback note
- Risk: heuristic text parsing can misclassify rare plain-text lines that resemble numbered headings or section labels.
- Mitigation: the parsing rules are isolated in `extractedTextPreviewModel.ts` and covered by focused regression tests.
- Rollback: revert the focused preview model extraction commit to restore the prior inline parser.

## Recommended next task
Improve indexing and extraction progress visibility for MVP testing.
