# EAI-TASK-043: Improve indexing and extraction progress visibility

## Final status

PASS

## Summary

I improved the file progress UX in both the Client and Admin file explorers so operators can see:

- whether a file is in flight, running, waiting, complete, partial, failed, trashed, or has no progress data,
- the current stage in plain language,
- the next recommended step,
- clearer per-file status chips in the table view,
- explicit "no progress data" counts in the summary panels.

The changes were intentionally limited to UI-facing progress visibility helpers and the two explorer views.

## Files changed

- `apps/everything-ai-ui/src/shared/fileProgress.ts`
- `apps/everything-ai-ui/src/user/ExploreView.tsx`
- `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`
- `LOGS/EAI-TASK-043-terminal.log`
- `REPORTS/EAI-TASK-043-INDEXING-EXTRACTION-PROGRESS-VISIBILITY.md`
- `docs/HANDOVER_2026-06-26_EAI_TASK_043_INDEXING_EXTRACTION_PROGRESS_VISIBILITY.json`

## Progress visibility behavior implemented

### Shared progress helper

Added `apps/everything-ai-ui/src/shared/fileProgress.ts` to centralize file progress classification and summary counts.

It now provides:

- a shared file-progress description,
- a shared progress summary reducer,
- explicit handling for files with no progress data,
- a consistent next-step recommendation for each state.

### Client explorer improvements

`ExploreView` now shows:

- an "In flight" summary card,
- explicit counts for running / waiting / complete / partial / failures / no progress data,
- a clearer next-step message,
- stage and next-step text in the selected-file detail panel,
- a stage chip in the file list.

### Admin explorer improvements

`ExplorerView` now shows the same:

- summary counts,
- per-file stage chip,
- stage and next-step detail for the selected file.

## Behavior preserved

- Existing indexing behavior remains unchanged.
- Existing extraction behavior remains unchanged.
- Existing API behavior remains unchanged.
- Client Workspace remains read-only for file progress inspection.
- Admin-only boundary for the admin explorer remains unchanged.
- No destructive file actions were introduced.

## Validation command results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`114 tests passed, 0 failed, 1 skipped`)

## Risks and rollback note

Risk is low: the change is confined to shared UI progress classification and presentation.

Rollback is straightforward:

- revert `apps/everything-ai-ui/src/shared/fileProgress.ts`
- revert the two explorer view updates

That restores the previous progress wording and summary layout without affecting backend behavior.

## Recommended next task

If more visibility is desired, the next safe follow-up is to extend the same shared progress wording into any remaining file-status panels or diagnostics cards that still present raw status fields.

## Artifact commit SHA

6d7c324
