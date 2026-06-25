# EAI-TASK-020: Improve extracted document preview readability

## Final status

PASS

## Files changed

- `apps/everything-ai-ui/src/shared/ExtractedTextPreview.ts`
- `apps/everything-ai-ui/src/shared/ExtractedTextPreviewImpl.tsx`
- `apps/everything-ai-ui/src/shared/extractedTextPreview.css`
- `apps/everything-ai-ui/src/shared/extractedTextPreviewStyle.ts`
- `apps/everything-ai-ui/src/shared/selectExtractedPreviewText.ts`
- `LOGS/EAI-TASK-020-terminal.log`
- `REPORTS/EAI-TASK-020-EXTRACTED-DOCUMENT-PREVIEW-READABILITY.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_020_EXTRACTED_DOCUMENT_PREVIEW_READABILITY.json`

## Preview/readability behavior implemented

- Preview selection now ignores whitespace-only extracted preview values before falling back to richer extracted text sources.
- The extracted text preview now renders structured blocks instead of a single raw preformatted blob.
- Headings, paragraphs, list items, and table-like rows are visually separated to make long documents easier to scan.
- Long previews are capped for readability, with a note that explains when the preview was truncated.
- Sparse or low-confidence extraction is called out so the user can tell when the source text itself is thin.

## Behavior preserved

- User Explore preview still works.
- Admin Explorer preview still works.
- Existing file preview endpoint compatibility was not changed.
- Existing extracted text storage was not changed.
- No destructive file actions were introduced.
- Client Workspace remains read-only for inspection.

## Validation results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note

- Risk: heading/list/table heuristics may occasionally over-classify unusual prose or OCR output.
- Risk: the preview cap may hide content beyond the readability window for very long files.
- Rollback: revert the shared preview files and the component-specific preview CSS if the new formatting needs to be removed.

## Recommended next task

- Review the next `pm:ready` / `hermes:ready` issue when it appears; no additional runnable issue was selected in this pass.

## Artifact commit SHA

- `d6fe236d4758b8b148071d38feefb6e5ec3434d2`
