# EAI-TASK-021: Improve indexing and extraction progress visibility

## Final status

PASS

## Files changed

- `apps/everything-ai-ui/src/user/ExploreView.tsx`
- `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`
- `LOGS/EAI-TASK-021-terminal.log`
- `REPORTS/EAI-TASK-021-INDEXING-EXTRACTION-PROGRESS-VISIBILITY.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_021_INDEXING_EXTRACTION_PROGRESS_VISIBILITY.json`

## Progress visibility behavior implemented

- The user Explore view now shows an indexing/extraction progress snapshot derived from the latest file records.
- The file list now labels rows as complete, awaiting extraction, failed, unsupported, trashed, or indexing.
- The selected file details now surface the current progress state, index status, extraction status, and reported issues when present.
- The admin Explorer view now shows workspace-wide progress counts and clearer per-file status labels for scan/extraction state.
- Progress text remains read-only and is inferred from existing file metadata; no destructive actions were introduced.

## Behavior preserved

- Existing indexing still works.
- Existing extraction still works.
- Existing file search, filters, and preview behavior remain compatible.
- Existing document context and knowledge-base workflows remain available.
- Client Workspace remains safe for read-only monitoring and inspection.
- Admin Explorer still loads selected file previews and tags.

## Validation results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note

- Risk: the new labels infer progress from persisted file metadata, so items with incomplete metadata will appear as waiting or indexing rather than having a live percentage.
- Mitigation: the UI only reads existing metadata and does not mutate scanner or extractor behavior.
- Rollback: revert `apps/everything-ai-ui/src/user/ExploreView.tsx` and `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`.

## Recommended next task

- Continue with the next `pm:ready` + `hermes:ready` EverythingAI issue when it appears.

## Artifact commit SHA

- `PENDING_COMMIT_SHA`
