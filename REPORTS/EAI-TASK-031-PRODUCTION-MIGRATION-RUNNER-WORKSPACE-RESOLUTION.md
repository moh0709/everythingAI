# EAI-TASK-031: Production Migration Runner / Persisted Workspace Resolution Plan

## Final status
PASS

## Evidence reviewed
- `REPORTS/EAI-TASK-030-PRODUCTION-MIGRATION-LOADER-WORKSPACE-CONTEXT.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_LOADER_WORKSPACE_CONTEXT.json`
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/migrationLoader.js`
- `services/api/src/db/production/migrationRunner.js`
- `services/api/src/db/production/identityRepository.js`
- `services/api/src/middleware/requestContext.js`
- `services/api/src/middleware/workspaceContext.js`
- `services/api/test/productionMigrationRunner.test.js`
- `services/api/test/workspaceContext.test.js`
- Repo-wide validation output captured in `LOGS/EAI-TASK-031-terminal.log`

## Files changed
- `LOGS/EAI-TASK-031-terminal.log`
- `REPORTS/EAI-TASK-031-PRODUCTION-MIGRATION-RUNNER-WORKSPACE-RESOLUTION.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_RUNNER_WORKSPACE_RESOLUTION.json`

## Migration runner behavior
- A production migration runner scaffold already exists in `services/api/src/db/production/migrationRunner.js` and is exported from `services/api/src/db/production/index.js`.
- The runner exposes explicit `plan`, `list`, `dryRun`, and `apply` entry points.
- Plan/list/dry-run paths only summarize the migration catalog and mark migrations as planned.
- Execution remains disabled by default.
- `apply` requires both `confirmExecution: true` and `EAI_ALLOW_PRODUCTION_MIGRATIONS=1`-style opt-in before any SQL execution path is even attempted.
- The CLI entry path also keeps the runner in plan/list/dry-run mode unless an explicit `--apply` flag is provided.

## Proof that runner does not auto-run
- `services/api/test/productionMigrationRunner.test.js` verifies plan/list/dry-run summaries do not execute SQL.
- The same test file verifies `apply` rejects execution without the explicit guard.
- `loadProductionMigrationCatalog()` reports `autoRun: false`.
- The runner module does not trigger execution on import or server startup.

## Dry-run/list/plan behavior
- `plan`, `list`, and `dryRun` return catalog metadata only.
- The returned steps are labeled `planned`.
- Summary fields report total and planned migration counts with `appliedMigrations: 0`.
- The catalog loader recursively discovers `.sql` files without executing them.

## Persisted tenant/workspace resolution plan
- `services/api/src/middleware/workspaceContext.js` already contains the explicit production-resolution scaffold.
- The current local MVP path remains read-only and derives scope from request context only.
- The production-resolution path is gated behind `productionResolution: true` and an injected `identityRepository`.
- Resolution flow:
  1. derive request context,
  2. resolve tenant by stable ID or slug,
  3. resolve workspace scoped to the resolved tenant by stable ID or slug,
  4. expose `resolvedTenant` and `resolvedWorkspace` only when both lookups succeed.
- `services/api/src/db/production/identityRepository.js` provides the lookup shape the future production persistence layer can implement.
- The plan keeps tenant/workspace lookup tenant-scoped and read-only, so later production persistence can be attached without changing local MVP request handling.

## How local MVP runtime behavior was preserved
- SQLite/local MVP persistence remains unchanged.
- No PostgreSQL connection is required for startup.
- No login wall was introduced.
- Client Workspace and Admin Dashboard behavior remain unchanged.
- Provider/connector admin-only boundaries remain intact.
- The runner and production resolution logic stay opt-in and do not change normal API boot behavior.

## Tests or validation added
- Existing test coverage already exercises the task’s required behaviors:
  - `services/api/test/productionMigrationRunner.test.js`
  - `services/api/test/workspaceContext.test.js`
- Repo-wide validation was executed successfully:
  - `git pull --ff-only`
  - `node scripts/framework-doctor.mjs`
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
  - `cd services/api && npm test`

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note
- Risk: production execution remains intentionally blocked until an explicit opt-in is supplied.
- Risk: the workspace-resolution path is still a scaffold and depends on a future production identity persistence adapter.
- Rollback is straightforward because the local MVP runtime did not change; removing the opt-in runner and production-resolution wiring would not affect current SQLite behavior.

## Immediate next implementation task
- Attach the runner to a real production migration execution backend and wire `identityRepository` to actual persisted tenant/workspace records in the production environment.

## Artifact commit SHA
72f7ece9389f6d96412b458344c6e710d9d5d4f5

## Final pushed commit SHA
72f7ece9389f6d96412b458344c6e710d9d5d4f5
