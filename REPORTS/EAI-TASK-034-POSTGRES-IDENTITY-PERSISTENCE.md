# EAI-TASK-034: Connect guarded production identity adapter to PostgreSQL persistence

## Final status
PASS

## Evidence reviewed
- `REPORTS/EAI-TASK-033-PRODUCTION-IDENTITY-PERSISTENCE-ADAPTER.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_IDENTITY_PERSISTENCE_ADAPTER.json`
- `docs/PRODUCTION_WORKSPACE_RESOLUTION_PLAN.md`
- `services/api/src/db/production/001_identity_workspace_schema.sql`
- `services/api/src/db/production/identityPersistenceAdapter.js`
- `services/api/src/db/production/identityRepository.js`
- `services/api/src/db/production/index.js`
- `services/api/src/db/production/postgresIdentityPersistenceAdapter.js`
- `services/api/src/middleware/requestContext.js`
- `services/api/src/middleware/workspaceContext.js`
- `services/api/src/server.js`
- `services/api/test/productionIdentityRepository.test.js`
- `services/api/test/workspaceContext.test.js`
- `LOGS/EAI-TASK-034-terminal.log`

## Files changed
- `services/api/src/db/production/postgresIdentityPersistenceAdapter.js`
- `services/api/src/db/production/identityRepository.js`
- `services/api/src/db/production/index.js`
- `services/api/test/productionIdentityRepository.test.js`
- `LOGS/EAI-TASK-034-terminal.log`
- `REPORTS/EAI-TASK-034-POSTGRES-IDENTITY-PERSISTENCE.md`
- `docs/HANDOVER_2026-06-27_POSTGRES_IDENTITY_PERSISTENCE.json`

## PostgreSQL identity persistence behavior
- Added `createProductionIdentityPostgresAdapter()` as an explicit, injectable PostgreSQL-oriented adapter.
- The adapter supports the existing lookup methods:
  - `findTenantByStableId`
  - `findTenantBySlug`
  - `findWorkspaceByStableId`
  - `findWorkspaceBySlug`
- Workspace queries are tenant-scoped in SQL.
- Missing rows return `missing`.
- Duplicate rows return `ambiguous`.

## Repository/adapter integration behavior
- `createProductionIdentityRepository()` still defaults to the local in-memory fallback path when `productionMode` is disabled.
- Production adapter creation is explicit and gated behind `productionMode: true`.
- The repository can use an injected production adapter factory for PostgreSQL-backed resolution.
- Local workspace-context behavior remains unchanged when production resolution is disabled.

## Proof no PostgreSQL connection is used during default local MVP startup
- The default repository path does not create or call the PostgreSQL adapter factory.
- The workspace context tests still show the request-context-only path remains read-only when production resolution is disabled.
- No automatic PostgreSQL startup or migration path was added.

## Proof local MVP behavior is unchanged when guard is disabled
- Default `createProductionIdentityRepository()` still resolves from local fixtures only.
- `workspaceContext` default tests still pass for request-context-only behavior.
- No login wall was introduced.
- Client Workspace and Admin Dashboard behavior were not modified.
- Provider/connector admin-only boundaries were not modified.

## Tests or validation added
- Extended `services/api/test/productionIdentityRepository.test.js`
- Existing `services/api/test/workspaceContext.test.js` continues to cover the request-context-only default path.

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS

## Risks and rollback note
- Risk: production resolution remains explicitly opt-in, so deployment wiring still needs an intentional adapter injection.
- Risk: the PostgreSQL adapter is an explicit SQL/query contract; it still needs a live PostgreSQL client or pool supplied by the production integration layer.
- Rollback is straightforward: keep `productionMode` disabled and remove the explicit adapter injection path if needed.

## Immediate next implementation task
- Connect the guarded production adapter to the live PostgreSQL client/pool wiring in the production deployment layer when that integration is ready.

## Artifact commit SHA
- 074a390

## Final pushed commit SHA
- 074a390
