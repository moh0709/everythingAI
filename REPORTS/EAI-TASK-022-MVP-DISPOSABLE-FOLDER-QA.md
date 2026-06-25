# EAI-TASK-022: MVP Disposable-Folder QA Drill

## Final status

**BLOCKED**

## Environment used

- Repository: `/root/.hermes/projects/everythingAI`
- Branch: `main`
- Server API: `http://127.0.0.1:4100`
- Disposable test folder: `/tmp/eai-task-022/disposable-alpha`
- Temp database: `/tmp/eai-task-022/everythingai.sqlite`
- Validation token: default local development bearer token from repo middleware

## Disposable test-folder approach

I created a disposable local folder outside the repository with two non-sensitive sample files:

- `alpha.txt`
- `subdir/beta.md`

The folder was used only for local MVP indexing/extraction/search/wiki validation. No real user or business files were involved.

## Workflow steps validated

### Repository and baseline validation

- `git pull --ff-only` — already up to date
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS, 113 tests passed, 0 failed, 1 skipped

### Disposable-folder MVP flow

Validated through the local API server using the disposable folder:

1. Indexed the disposable folder via `POST /api/index`
2. Confirmed indexed files via `GET /api/files`
3. Inspected extracted document previews via `GET /api/files/:id/preview`
4. Searched indexed content via `GET /api/search`
5. Loaded generated Knowledge Base/wiki content via `GET /api/wiki`
6. Checked system status via `GET /api/status`
7. Loaded diagnostics via `GET /api/wiki/diagnostics`

## Workflow steps not fully validated and why

- **Persisted wiki build / source-evidence routes** were not fully validated.
- `POST /api/wiki/build` failed with HTTP 500 and the message: `FOREIGN KEY constraint failed`.
- Because the build did not persist successfully, the persisted wiki page/evidence endpoints were not available for confirmation.

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
- Backend tests: PASS (`113 passed / 0 failed / 1 skipped`)
- API runtime drill: partial PASS
- Wiki build persistence: FAIL (`FOREIGN KEY constraint failed`)

## Risks and blockers

- The wiki persistence path appears to have an integrity problem when building persisted wiki pages from the disposable dataset.
- This blocks a complete end-to-end verification of persisted wiki/evidence routes.

## Recommended next task

Investigate and fix the `FOREIGN KEY constraint failed` error in `POST /api/wiki/build`, ideally using a fresh disposable database and a minimal wiki persistence repro.

## Artifact commit SHA

f498171cc4e29ab148cf6b57532b68ec47e8123f
