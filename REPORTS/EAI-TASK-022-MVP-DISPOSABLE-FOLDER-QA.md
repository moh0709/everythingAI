# EAI-TASK-022: MVP Disposable-Folder QA Drill

## Final status

**BLOCKED**

## Environment used

- Repository: `/root/.hermes/projects/everythingAI`
- Branch: `main`
- Server API: `http://127.0.0.1:4100`
- Server DB: `/tmp/eai-task-022/everythingai.sqlite`
- Disposable test folder: `/tmp/eai-task-022/disposable-alpha`
- Authorization token: local development bearer token from repo middleware (`replace-with-your-local-development-token`)

## Disposable test-folder approach

I created a disposable local folder outside the repository with two non-sensitive sample files:

- `alpha.txt`
- `subdir/beta.md`

The folder was used only for local MVP indexing, extraction, search, preview, and wiki/diagnostics validation. No real user or business files were involved.

## Workflow steps validated

### Repo / build validation

- `git pull --ff-only` — already up to date
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS, `112 passed / 0 failed / 1 skipped`

### Runtime disposable-folder smoke validation

Validated against the local API server with the disposable folder:

1. `GET /health` — PASS
2. `POST /api/index` with `auto: false` — PASS, indexed 2 files
3. `POST /api/extract` — PASS, extracted 2 files
4. `GET /api/files` — PASS, 2 indexed files returned
5. `GET /api/files/:fileId/preview` — PASS, preview text and source reference returned
6. `GET /api/search?q=Supplier` — PASS, searchable result returned from the disposable data
7. `GET /api/status` — PASS, status and provider panel data returned
8. `GET /api/wiki` — PASS, generated wiki content returned
9. `GET /api/wiki/diagnostics` — PASS, diagnostics/trust data returned
10. `GET /api/wiki/pages/:pageId/evidence` — not available because persisted wiki build failed
11. `POST /api/wiki/pages/:pageId/validation-preview` — not available because persisted wiki build failed

## Workflow steps not fully validated and why

- **Persisted wiki build / source-evidence routes** were not fully validated.
- `POST /api/wiki/build` failed with HTTP 500 and the message: `FOREIGN KEY constraint failed`.
- Because the persisted build failed, source evidence and validation-preview endpoints were not available for confirmation.

## File changes

No core application code was changed.

Artifacts created:

- `LOGS/EAI-TASK-022-terminal.log`
- `REPORTS/EAI-TASK-022-MVP-DISPOSABLE-FOLDER-QA.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_022_MVP_DISPOSABLE_FOLDER_QA.json`

## Validation command results

- Framework doctor: PASS
- Frontend typecheck: PASS
- Frontend build: PASS
- Backend tests: PASS (`112 passed / 0 failed / 1 skipped`)
- Runtime smoke: partial PASS
- Persisted wiki build: FAIL (`FOREIGN KEY constraint failed`)

## Risks and blockers

- The wiki persistence path appears to have an integrity problem when building persisted wiki pages from the disposable dataset.
- This blocks a complete end-to-end verification of persisted wiki/evidence routes.
- The issue is reproducible against the disposable local database used for this drill.

## Recommended next task

Investigate and fix the `FOREIGN KEY constraint failed` error in `POST /api/wiki/build`, ideally with a fresh disposable database and a minimal wiki persistence repro.

## Artifact commit SHA

06495b6b227e1f7b1f4f352de0a8f8b0c532f6e9
