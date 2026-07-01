# EAI-TASK-035: Wire live PostgreSQL client/pool injection for guarded production identity resolution

## Final status
PASS

## Summary
Implemented a guarded production workspace-resolution helper that can accept an explicitly injected PostgreSQL client, pool, or existing repository and convert it into the production workspace-context middleware only when production mode is enabled.

## Files changed
- `services/api/src/db/production/workspaceContextMiddleware.js`
- `services/api/src/db/production/index.js`
- `services/api/test/productionWorkspaceContextMiddleware.test.js`

## Behavior added
- Default startup remains unchanged when production mode is disabled.
- No PostgreSQL client/pool/repository is created by default.
- Explicit `postgresClient.query` injection is supported.
- Explicit `pool.query` injection is supported.
- Explicit repository injection is supported.
- The resulting workspace context middleware uses the existing guarded production identity repository path.

## Validation
- `node --test services/api/test/productionWorkspaceContextMiddleware.test.js` — PASS
- `node --test services/api/test/*.test.js` — PASS
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS

## Notes
- No real PostgreSQL server was required.
- No automatic migration behavior was introduced.
- Local SQLite MVP behavior remains unchanged.

## Follow-up
The helper is now available for the production deployment layer to opt into guarded PostgreSQL-backed workspace resolution with explicit client/pool injection.
