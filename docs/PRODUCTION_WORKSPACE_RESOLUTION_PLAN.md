# Production workspace resolution plan

This note captures the next-stage plan for resolving tenant/workspace records from production persistence without changing the current local MVP runtime.

## Current state
- `services/api/src/middleware/requestContext.js` derives request-scoped identity from headers.
- `services/api/src/middleware/workspaceContext.js` consumes that request context and remains read-only by default.
- `services/api/src/db/production/migrationLoader.js`, `services/api/src/db/production/migrationRunner.js`, and `services/api/src/db/production/identityRepository.js` provide catalog, runner, and repository scaffolding only.
- Local MVP persistence stays on SQLite.

## Intended production resolution flow
1. `requestContext` continues to normalize request headers into actor, tenant, workspace, and request metadata.
2. `workspaceContext` becomes a thin resolver that first checks request headers, then resolves tenant/workspace rows from production persistence when the runtime explicitly enables production mode.
3. Tenant lookup should prefer stable IDs when present and fall back to slug-based lookup only when the ID is unavailable.
4. Workspace lookup should be scoped by tenant so a workspace slug cannot resolve outside its owning tenant.
5. The resolved workspace payload should remain read-only for request middleware; write paths stay in the future production service layer.
6. If persistence is unavailable or the request is ambiguous, the middleware should return an unresolved/scoped status rather than guessing.

## Safety constraints
- Do not connect local MVP startup to PostgreSQL.
- Do not execute production migrations automatically.
- Do not introduce a login wall for current client/admin flows.
- Do not relax provider or connector admin-only boundaries.

## Follow-up implementation shape
- Expand the production identity repository to a real production adapter when the persistence layer is ready.
- Keep the middleware guard explicit so production persistence is never used unless the runtime opts in.
- Continue adding resolution tests for exact ID lookup, tenant-scoped slug lookup, workspace scoping, and unresolved fallbacks.
