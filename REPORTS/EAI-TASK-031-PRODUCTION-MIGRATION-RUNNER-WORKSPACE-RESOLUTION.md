# EAI-TASK-031: Explicit Production Migration Runner / Persisted Workspace Resolution Plan

## Final status
PASS

## Evidence reviewed
- `REPORTS/EAI-TASK-030-PRODUCTION-MIGRATION-LOADER-WORKSPACE-CONTEXT.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_LOADER_WORKSPACE_CONTEXT.json`
- `docs/PM_ACCEPTANCE_2026-06-26_EAI_TASK_030_ACCEPTED.md`
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/migrationLoader.js`
- `services/api/src/db/production/001_identity_workspace_schema.sql`
- `services/api/src/db/production/migrationRunner.js`
- `services/api/src/middleware/requestContext.js`
- `services/api/src/middleware/workspaceContext.js`
- `services/api/src/server.js`
- `services/api/test/productionMigrationLoader.test.js`
- `services/api/test/productionMigrationRunner.test.js`
- `services/api/test/workspaceContext.test.js`

## Files changed
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/migrationRunner.js`
- `services/api/test/productionMigrationRunner.test.js`
- `LOGS/EAI-TASK-031-terminal.log`
- `REPORTS/EAI-TASK-031-PRODUCTION-MIGRATION-RUNNER-WORKSPACE-RESOLUTION.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_RUNNER_WORKSPACE_RESOLUTION.json`

## Migration runner behavior
- Added `services/api/src/db/production/migrationRunner.js` as explicit production-only runner scaffolding.
- The runner is disabled by default and does not run automatically on import or startup.
- Safe modes available: `plan`, `list`, and `dry-run`.
- These modes return the catalog and a planned step summary without executing SQL.
- `apply` remains explicitly gated by both `EAI_ALLOW_PRODUCTION_MIGRATIONS=true` and `confirmExecution: true`, plus an `executeSql` function.
- The current scaffolding keeps execution blocked unless an explicit caller opts in.

## Proof that the runner does not auto-run
- The module only exposes callable runner methods; no startup hook was added.
- Tests confirm the plan/list/dry-run paths only read catalog metadata.
- Tests also confirm `apply` is rejected without an explicit execution guard and no SQL executor is invoked.

## Dry-run / list / plan behavior
- `plan()` returns a catalog summary with `mode: 'plan'`.
- `list()` returns the same catalog summary with `mode: 'list'`.
- `dryRun()` returns the same catalog summary with `mode: 'dry-run'`.
- Each response includes ordered migration steps, total count, and planned-only execution state.

## Persisted tenant/workspace resolution plan
- Current runtime remains request-context-driven and read-only.
- The next persistence-backed resolution layer should resolve tenant/workspace hints in this order:
  1. request headers populate `req.requestContext`;
  2. workspace middleware consumes request context and retains a read-only shape;
  3. future production persistence should look up canonical tenant records by stable ID first, then slug fallback;
  4. workspace records should be resolved within the tenant boundary using the same stable-ID-first, slug-fallback strategy;
  5. the resolved canonical IDs should be attached to workspace context without mutating the request source data;
  6. when persistence exists, unresolved tenant/workspace hints should remain safe and non-fatal for the local MVP.
- This preserves the current local MVP while defining the path to production-backed identity resolution.

## How local MVP runtime behavior was preserved
- SQLite runtime behavior was not changed.
- No PostgreSQL dependency was introduced for local startup.
- No automatic production migration execution was enabled.
- No login wall was added.
- Client Workspace and Admin Dashboard behavior remain unchanged.
- Provider/connector admin-only boundaries remain intact.

## Tests or validation added
- `services/api/test/productionMigrationRunner.test.js`
- Existing `productionMigrationLoader` and `workspaceContext` tests continue to validate the surrounding scaffolding.

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note
- Risk: execution remains scaffolding-only until a dedicated production executor is implemented.
- Risk: workspace resolution is still a design plan, not a production persistence lookup.
- Rollback is straightforward: remove the new runner module, its re-export, and the new test file; local MVP behavior stays intact.

## Immediate next implementation task
- Introduce a production persistence adapter that resolves tenant/workspace records from durable storage and wires those canonical identities into the request/workspace context path.

## Artifact commit SHA
33afe26

## Final pushed commit SHA
33afe26
