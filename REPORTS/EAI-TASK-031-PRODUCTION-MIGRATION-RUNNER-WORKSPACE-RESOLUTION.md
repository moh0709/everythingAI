# EAI-TASK-031: Production migration runner and persisted workspace resolution plan

## Final status
PASS

## Evidence reviewed
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/migrationLoader.js`
- `services/api/src/db/production/migrationRunner.js`
- `services/api/src/middleware/workspaceContext.js`
- `docs/PRODUCTION_WORKSPACE_RESOLUTION_PLAN.md`
- `services/api/test/productionMigrationLoader.test.js`
- `services/api/test/productionMigrationRunner.test.js`
- `services/api/test/productionIdentityWorkspaceSchema.test.js`
- `services/api/test/workspaceContext.test.js`
- `LOGS/EAI-TASK-053-terminal.log`

## Files changed
- `.hermes/state.json`
- `REPORTS/EAI-TASK-031-PRODUCTION-MIGRATION-RUNNER-WORKSPACE-RESOLUTION.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_RUNNER_WORKSPACE_RESOLUTION.json`

## Migration runner behavior
- `services/api/src/db/production/migrationRunner.js` provides explicit `plan`, `list`, `dry-run`, and `apply` entry points.
- The runner is disabled by default: catalog summaries always report `autoRunDisabled: true` and `requiresExplicitExecution: true`.
- `apply` is gated by both `EAI_ALLOW_PRODUCTION_MIGRATIONS` and `confirmExecution: true`, and requires an `executeSql` function.
- The direct CLI path defaults to plan/list/dry-run behavior and does not execute SQL automatically.

## Proof the runner does not auto-run
- The runner tests verify safe `plan`, `list`, and `dry-run` summaries without executing SQL.
- The runner tests also verify `apply` rejects execution when the explicit guard is missing.
- The direct CLI dry-run output reported `executionEnabled: false` and `summary.appliedMigrations: 0`.

## Dry-run/list/plan behavior
- `plan`, `list`, and `dry-run` all return a catalog summary instead of mutating production state.
- Dry-run output includes the discovered SQL migration catalog and planned steps only.
- The catalog discovery code reads `.sql` files recursively and ignores non-SQL files.

## Persisted tenant/workspace resolution plan
- `docs/PRODUCTION_WORKSPACE_RESOLUTION_PLAN.md` documents the intended future flow for production persistence-backed tenant/workspace resolution.
- `workspaceContext` remains read-only by default and continues to derive context from request headers.
- The future production mode is described as an explicit opt-in that resolves tenant/workspace data from persisted identity records, with tenant-scoped workspace lookup and unresolved fallback states when records are missing or ambiguous.

## How local MVP runtime behavior was preserved
- The local MVP remains on the existing SQLite-backed runtime.
- No PostgreSQL connection was introduced into normal startup.
- No login wall was added for the current client/admin flows.
- Client Workspace and Admin Dashboard behavior were not changed.
- Provider and connector admin-only boundaries were not changed.

## Tests or validation added
- Existing tests already cover the guarded migration runner and the workspace-context scaffolding.
- Validation also confirmed the production migration runner can safely emit a dry-run plan for the local production catalog.

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS
- `node src/db/production/migrationRunner.js --dry-run --root-dir src/db/production` — PASS

## Risks and rollback note
- Risk: production migration execution remains intentionally disabled unless the explicit environment and function guard are both provided.
- Risk: the persistence-backed workspace resolution plan is still documentation/scaffolding; it is not a live PostgreSQL adapter yet.
- Rollback is simple: keep the explicit guard disabled and retain the existing SQLite local MVP path.

## Immediate next implementation task
- Add the first explicit production persistence adapter for tenant/workspace resolution behind the same guarded production-mode boundary.

## Artifact commit SHA
- 9c278840888455722b91748a3188ba31d2066dd3

## Final pushed commit SHA
- 9c278840888455722b91748a3188ba31d2066dd3
