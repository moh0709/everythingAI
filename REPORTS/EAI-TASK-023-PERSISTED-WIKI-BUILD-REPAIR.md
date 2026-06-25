# EAI-TASK-023: Repair persisted wiki build on disposable QA data

## Final status

PASS

## Files changed

- `services/api/src/db/wikiRepository.js`
- `services/api/test/wikiRepository.test.js`
- `LOGS/EAI-TASK-023-terminal.log`
- `REPORTS/EAI-TASK-023-PERSISTED-WIKI-BUILD-REPAIR.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_023_PERSISTED_WIKI_BUILD_REPAIR.json`

## What was fixed

The persisted wiki build path was failing on fresh disposable QA data because wiki relations were inserted while pages were still being persisted one at a time. If a page referenced a later page in the same batch, SQLite enforced the foreign key immediately and the build failed.

I fixed the persistence ordering by queuing wiki relations during page insertion and writing them only after all pages, sections, sources, and chunks were present.

## Regression coverage added

- Added a focused repository regression test that persists a wiki batch where a page points to a later page in the same batch.
- The regression confirms the relation is stored successfully and no foreign key error is raised.

## Behavior preserved

- Existing durable wiki page, section, source, chunk, and rebuild persistence still works.
- Existing wiki evidence and validation-preview routes still work.
- Existing wiki build, no-op rebuild, and selective rebuild tests still pass.
- Client Workspace and Admin boundaries were not changed.
- No secrets or environment values were exposed.

## Validation results

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`114 tests, 0 failures, 1 skipped`)
- Focused regression: `node --test services/api/test/wikiRepository.test.js services/api/test/wikiRoutes.test.js` — PASS (`8/8 tests`)
- Disposable QA repro replay: a manual persisted-wiki batch with a forward relation now succeeds and returns the expected relation target.

## Risks and rollback note

- Risk: relations are now written after the page batch is fully present, so any future code that assumes immediate relation insertion during the page loop should be updated to use the queued behavior.
- Rollback: revert `services/api/src/db/wikiRepository.js` and `services/api/test/wikiRepository.test.js`.

## Recommended next task

Re-run the disposable QA wiki build flow against a fresh disposable dataset that exercises multiple categories/topics so the persisted build and follow-up evidence/validation routes can be exercised end-to-end.

## Artifact commit SHA

PENDING_COMMIT_SHA
