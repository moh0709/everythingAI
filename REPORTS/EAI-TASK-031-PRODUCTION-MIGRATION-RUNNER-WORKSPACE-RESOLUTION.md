# EAI-TASK-031: Add explicit production migration runner and persisted workspace resolution plan

## Final status
PASS

## Evidence reviewed
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/migrationLoader.js`
- `services/api/src/db/production/migrationRunner.js`
- `services/api/src/db/production/identityRepository.js`
- `services/api/src/db/production/001_identity_workspace_schema.sql`
- `services/api/src/middleware/workspaceContext.js`
- `services/api/test/productionMigrationRunner.test.js`
- `services/api/test/productionMigrationLoader.test.js`
- `services/api/test/workspaceContext.test.js`
- `LOGS/EAI-TASK-031-terminal.log`
- `node scripts/framework-doctor.mjs` output
- `npm run typecheck` output
- `npm run build` output
- `npm test` output

## Files changed
- `LOGS/EAI-TASK-031-terminal.log`
- `REPORTS/EAI-TASK-031-PRODUCTION-MIGRATION-RUNNER-WORKSPACE-RESOLUTION.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_MIGRATION_RUNNER_WORKSPACE_RESOLUTION.json`
- `.hermes/state.json`

## Migration runner behavior
- The production migration runner already exists under `services/api/src/db/production/migrationRunner.js`.
- It is disabled by default for execution.
- `plan`, `list`, and `dry-run` modes only summarize the catalog and mark migrations as planned.
- `apply` requires both `EAI_ALLOW_PRODUCTION_MIGRATIONS` and `confirmExecution: true`.
- The direct CLI entrypoint also requires `--apply` plus `--confirm-production-migrations` before any execution path is attempted.
- In this scaffolding build, the CLI apply path still throws before SQL execution, so no production SQL can run accidentally.

## Proof that the runner does not auto-run
- The runner exposes explicit `plan`, `list`, `dryRun`, and `apply` methods only.
- The default `runProductionMigrationRunner()` path resolves to planning, not execution.
- The execution guard throws unless the environment gate and explicit confirmation are both present.
- The test suite verifies that safe modes do not call SQL execution and that `apply` rejects without the guard.

## Dry-run / list / plan behavior
- `plan`, `list`, and `dry-run` all return catalog summaries built from discovered `.sql` files.
- The catalog includes `autoRun: false`, `requiresExplicitExecution: true`, and `executionEnabled: false` in safe modes.
- The tests confirm that the discovered migration IDs are ordered and that no execution callback is invoked during safe planning.

## Persisted tenant/workspace resolution plan
- `services/api/src/middleware/workspaceContext.js` already separates read-only request-context derivation from an explicit production-resolution path.
- The production path is injected through an identity repository abstraction rather than hard-coded database access.
- `services/api/src/db/production/identityRepository.js` provides tenant/workspace lookup hooks that can later be wired to real persistence.
- The workspace context can resolve tenant and workspace records by stable ID or slug, scoped by tenant, and falls back to unresolved states for missing or ambiguous records.
- The current local path remains read-only and request-context-based unless production resolution is explicitly enabled.

## How local MVP runtime behavior was preserved
- No SQLite runtime was replaced.
- No PostgreSQL connection is required for local startup.
- No login wall was introduced.
- The client workspace and admin dashboard behavior were not changed.
- Provider/connector admin-only boundaries remain intact.
- All work stayed within production scaffolding, tests, and task artifacts.

## Tests and validation
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`127 passed, 1 skipped, 0 failed`)

## Risks and rollback note
- Risk: the production runner scaffolding is intentionally inert and does not yet execute SQL in this build.
- Risk: production workspace resolution still depends on an injected repository and is not wired to live production storage.
- Rollback is simple: keep the environment gate disabled and leave the existing request-context-only runtime path unchanged.

## Immediate next implementation task
- Wire the production identity repository and workspace context scaffolding to a real production persistence adapter once PM approves production database connectivity.

## Artifact commit SHA
- 18b6516865129d2412b93dd0964983658b0102d4

## Validation command results
- All required validation commands passed.

## Handover notes
- No product code was modified for this task.
- The repository already contained the requested runner and workspace-scoping scaffolding, so the task completed as a validation/reporting pass.
