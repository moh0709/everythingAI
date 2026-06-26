# EAI-TASK-031: Explicit production migration runner and persisted workspace resolution plan

## Final status
PASS

## Evidence reviewed
- `REPORTS/EAI-TASK-030-PRODUCTION-MIGRATION-LOADER-WORKSPACE-CONTEXT.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_LOADER_WORKSPACE_CONTEXT.json`
- `docs/PM_ACCEPTANCE_2026-06-26_EAI_TASK_030_ACCEPTED.md`
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/migrationLoader.js`
- `services/api/src/db/production/migrationRunner.js`
- `services/api/src/middleware/requestContext.js`
- `services/api/src/middleware/workspaceContext.js`
- `services/api/src/server.js`
- `services/api/test/productionMigrationLoader.test.js`
- `services/api/test/productionMigrationRunner.test.js`
- `services/api/test/workspaceContext.test.js`
- `docs/PRODUCTION_WORKSPACE_RESOLUTION_PLAN.md`
- `LOGS/EAI-TASK-031-terminal.log`

## Files changed
- `docs/PRODUCTION_WORKSPACE_RESOLUTION_PLAN.md`
- `REPORTS/EAI-TASK-031-PRODUCTION-MIGRATION-RUNNER-WORKSPACE-RESOLUTION.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_RUNNER_WORKSPACE_RESOLUTION.json`
- `.hermes/state.json`
- `LOGS/EAI-TASK-031-terminal.log`

## Migration runner behavior
- The repository already contains an explicit production migration runner scaffold in `services/api/src/db/production/migrationRunner.js`.
- The runner is disabled by default: `plan`, `list`, and `dry-run` only summarize the catalog.
- `apply` requires both `EAI_ALLOW_PRODUCTION_MIGRATIONS` and `confirmExecution: true`, plus an `executeSql` function.
- The CLI path is only reached when the module is run directly; normal imports do not auto-execute migrations.

## Proof that the runner does not auto-run
- `createProductionMigrationRunner()` returns a lazy runner object; it does not execute SQL at construction time.
- `runProductionMigrationRunner()` defaults to planning behavior unless an explicit mode is passed.
- The direct-execution entry point is guarded by `isDirectExecution`, so importing the module does not trigger the CLI.
- The test suite confirms `plan`, `list`, and `dry-run` do not execute SQL and that `apply` is rejected without explicit execution guards.

## Dry-run/list/plan behavior
- `plan` returns a catalog summary with planned migrations and counts.
- `list` exposes the same migration catalog in a human-readable planning shape.
- `dry-run` mirrors the catalog without mutating any schema.
- All three modes remain read-only and safe for local MVP validation.

## Persisted tenant/workspace resolution plan
- `docs/PRODUCTION_WORKSPACE_RESOLUTION_PLAN.md` records the intended production lookup path.
- `requestContext` continues to normalize header-scoped actor, tenant, workspace, and request data.
- `workspaceContext` stays read-only for now and will later resolve tenant/workspace rows from production persistence by stable ID first, then tenant-scoped slug fallback.
- The plan explicitly preserves unresolved/scoped fallbacks instead of guessing when persistence is absent or ambiguous.

## How local MVP runtime behavior was preserved
- SQLite local persistence was not changed.
- No production database connection was required for startup or validation.
- No login wall was added.
- Client Workspace and Admin Dashboard behavior were not modified.
- Provider/connector admin-only boundaries remained intact.

## Tests or validation added
- `services/api/test/productionMigrationRunner.test.js`
- Existing production migration loader and workspace context tests continue to cover the catalog loader and read-only context scaffolding.

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note
- Risk: production migration execution remains intentionally disabled unless both the environment guard and explicit confirmation are present.
- Risk: workspace resolution is still a design/plan rather than a live production persistence lookup.
- Rollback is straightforward: remove the runner/doc artifacts and keep the current local MVP runtime unchanged.

## Immediate next implementation task
- Implement the production identity repository and wire `workspaceContext` to tenant/workspace persistence lookup under an explicit production-mode guard.

## Artifact commit SHA
- pending commit of task artifacts

## Final pushed commit SHA
- pending push of task artifacts
