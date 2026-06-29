# Production Workspace Resolution Plan

## Status

Current state after EAI-TASK-034:

```text
Production identity/workspace persistence foundation is implemented as a guarded, opt-in foundation.
Local SQLite MVP runtime remains unchanged.
Live production PostgreSQL client/pool wiring is not connected yet.
```

Latest accepted task:

```text
EAI-TASK-034 / GitHub issue #56
Accepted: PASS
Artifact commit SHA: 074a39006d5d420d4a5147a0a02366f2450e29d7
Final pushed commit SHA: cc5310795ce738e5a1a9a6cf47d7a6c047d81441
Metadata correction commit SHA: 6dcfd263cab3c1670093fcee466bb9fc029f403d
```

Latest accepted artifacts:

```text
REPORTS/EAI-TASK-034-POSTGRES-IDENTITY-PERSISTENCE.md
docs/HANDOVER_2026-06-27_POSTGRES_IDENTITY_PERSISTENCE.json
```

---

## Current production identity foundation

The following production identity/workspace foundation files are now present:

```text
services/api/src/db/production/001_identity_workspace_schema.sql
services/api/src/db/production/migrationLoader.js
services/api/src/db/production/migrationRunner.js
services/api/src/db/production/identityPersistenceAdapter.js
services/api/src/db/production/postgresIdentityPersistenceAdapter.js
services/api/src/db/production/identityRepository.js
services/api/src/db/production/index.js
services/api/src/middleware/requestContext.js
services/api/src/middleware/workspaceContext.js
```

Current behavior:

```text
requestContext derives request-scoped actor, tenant, workspace, and request metadata from headers.
workspaceContext consumes requestContext and remains read-only by default.
production migration loading/running is explicit and guarded.
production identity repository exists.
production identity persistence adapter exists.
PostgreSQL-oriented identity adapter exists.
PostgreSQL adapter is explicit/injectable and not used by default.
workspace lookups are tenant-scoped.
missing or ambiguous persistence results return safe unresolved outcomes.
```

---

## Current default runtime rule

The default local MVP runtime must remain unchanged:

```text
No PostgreSQL connection during normal local MVP startup.
No automatic production migration execution.
No login wall for current Client Workspace/Admin Dashboard flows.
No provider or connector settings exposed in Client Workspace.
No weakening of admin-only provider/API-key/connector boundaries.
```

The production identity repository must only use production persistence when explicitly configured with `productionMode: true` and an injected adapter/query/client/pool.

---

## Intended production resolution flow

The target flow remains:

```text
HTTP request
  -> requestContext
  -> workspaceContext
  -> explicit production identity repository
  -> explicit PostgreSQL-backed adapter
  -> tenant/workspace lookup
  -> safe resolved/unresolved workspace context
```

Resolution rules:

```text
1. Tenant lookup should prefer stable tenant IDs when present.
2. Tenant slug lookup is fallback only when stable ID is unavailable.
3. Workspace lookup must always be scoped by tenant.
4. Workspace slug lookup must never resolve outside its owning tenant.
5. Missing rows must return missing/unresolved status.
6. Duplicate rows must return ambiguous/unresolved status.
7. Middleware must not guess when persistence is unavailable or ambiguous.
```

---

## Completed implementation steps

```text
EAI-TASK-027: Production architecture and release hardening plan accepted.
EAI-TASK-028: Auth/users/tenants/workspaces model accepted.
EAI-TASK-029: Production identity/workspace schema foundation accepted.
EAI-TASK-030: Guarded production migration loader and read-only workspace context accepted.
EAI-TASK-031: Explicit production migration runner and workspace resolution plan accepted.
EAI-TASK-032: Production identity repository and guarded workspace persistence resolution accepted.
EAI-TASK-033: Guarded production identity persistence adapter accepted.
EAI-TASK-034: PostgreSQL-backed identity persistence adapter accepted.
```

---

## Next approved implementation step

Recommended next task:

```text
EAI-TASK-035:
Wire live PostgreSQL client/pool injection for guarded production identity resolution.
```

The next task should do only the production deployment-layer wiring. It must not introduce login, switch local MVP persistence, run migrations automatically, or require PostgreSQL for default local startup.

---

## Safety constraints for EAI-TASK-035

The next AI agent must preserve:

```text
- Work directly on main unless explicitly told otherwise.
- Use GitHub issue queue, not ad-hoc local webhook payload files.
- Do not confuse GitHub issue numbers with EAI-TASK numbers.
- Do not process issues already marked hermes:done or pm:review.
- Do not use PostgreSQL by default in local MVP startup.
- Do not execute migrations automatically.
- Do not introduce a login wall yet.
- Do not change Client Workspace/Admin Dashboard behavior.
- Do not expose provider/API-key/Agent Connector settings in Client Workspace.
- Do not commit secrets.
- Do not perform broad refactors.
```

---

## Validation expectations

Every follow-up production identity task must run or delegate these validations:

```bash
git pull --ff-only
node scripts/framework-doctor.mjs

cd apps/everything-ai-ui
npm run typecheck
npm run build

cd ../../services/api
npm test
```

No task is accepted without report, handover, validation evidence, changed-file list, artifact commit SHA, and final pushed commit SHA.