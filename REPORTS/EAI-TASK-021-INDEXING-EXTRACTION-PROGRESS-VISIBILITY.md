# EAI-TASK-021: Improve indexing and extraction progress visibility

## Final status

PASS

## Files changed

- `apps/everything-ai-ui/src/user/ExploreView.tsx`
- `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`
- `apps/everything-ai-ui/src/user/WikiRebuildPanel.tsx`
- `LOGS/EAI-TASK-021-terminal.log`
- `REPORTS/EAI-TASK-021-INDEXING-EXTRACTION-PROGRESS-VISIBILITY.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_021_INDEXING_EXTRACTION_PROGRESS_VISIBILITY.json`

## Progress visibility behavior implemented

- The user Explore view now shows a clearer indexing/extraction progress snapshot derived from existing file metadata.
- The user file details now surface progress state, index status, extraction status, and reported issues when present.
- The admin Explorer view now mirrors the same clearer file-progress summary for workspace monitoring.
- The Wiki rebuild panel now shows queued, running, completed, and failed job counts so long-running workflow status is easier to understand.
- Progress text remains read-only and is inferred from existing metadata; no destructive actions were introduced.

## Behavior preserved

- Existing indexing still works.
- Existing extraction still works.
- Existing file search, filters, and preview behavior remain compatible.
- Existing document context, diagnostics, and knowledge-base workflows remain available.
- Client Workspace remains safe for read-only monitoring and inspection.
- Admin Explorer still loads selected file previews and tags.

## Validation results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note

- Risk: the new labels infer progress from persisted metadata, so incomplete records may appear as waiting rather than having a live percentage.
- Mitigation: the UI only reads existing metadata and does not mutate scanner, extractor, or job behavior.
- Rollback: revert `apps/everything-ai-ui/src/user/ExploreView.tsx`, `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`, and `apps/everything-ai-ui/src/user/WikiRebuildPanel.tsx`.

## Recommended next task

- Continue with the next `pm:ready` + `hermes:ready` EverythingAI issue when it appears.

## Artifact commit SHA

- `ec7ee67e2bd429ad20436c970780230dc50d112a`
