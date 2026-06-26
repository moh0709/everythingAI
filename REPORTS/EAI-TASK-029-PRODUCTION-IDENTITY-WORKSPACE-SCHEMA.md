# EAI-TASK-029: Add production identity workspace schema foundation

## Final status

PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `248a15b`
- **Pre-commit artifact SHA placeholder:** `PENDING_COMMIT_SHA`
- **Artifact commit SHA:** `PENDING_COMMIT_SHA`
- **Final SHA source of truth:** GitHub issue comment after post-commit sync

## Evidence reviewed

Reviewed source evidence from the task brief plus repository documentation and runtime code:

- `REPORTS/EAI-TASK-028-AUTH-TENANT-WORKSPACE-MODEL.md`
- `docs/HANDOVER_2026-06-26_AUTH_TENANT_WORKSPACE_MODEL.json`
- `REPORTS/EAI-TASK-027-PRODUCTION-ARCHITECTURE-PLAN.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_ARCHITECTURE_PLAN.json`
- `services/api/src/db/schema.sql`
- `services/api/src/middleware/auth.js`
- `services/api/src/server.js`
- `services/api/src/routes/providerSettings.routes.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/db/production/001_identity_workspace_schema.sql`
- `services/api/src/middleware/requestContext.js`
- `services/api/test/productionIdentityWorkspaceSchema.test.js`

Unavailable or mismatched source evidence:

- `services/api/src/db/schema.js` was listed in the issue brief, but the repository snapshot contains `services/api/src/db/schema.sql` instead.

## Validation summary

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`116 tests, 0 failures, 1 skipped`)

## Schema/scaffolding added

### 1) PostgreSQL production schema draft

Added `services/api/src/db/production/001_identity_workspace_schema.sql` as a non-invasive draft for the first production identity/workspace migration layer.

The draft covers:

- `users`
- `auth_identities`
- `tenants`
- `tenant_memberships`
- `workspaces`
- `workspace_memberships`
- `roles`
- `role_permissions`
- `permission_grants`
- `service_principals`
- `service_principal_permissions`
- `audit_events`
- `workspace_sources`
- `workspace_documents`
- `workspace_jobs`
- `workspace_job_events`
- `workspace_connector_links`
- `secrets_metadata`

It also includes PostgreSQL-oriented extensions, UUID defaults, indexes, uniqueness constraints, and status checks.

### 2) Request-context scaffolding

Added `services/api/src/middleware/requestContext.js` as a pure scaffolding module that normalizes actor, tenant, workspace, and request headers.

It is intentionally not wired into the live API yet, so the current local MVP runtime remains unchanged.

### 3) Validation coverage

Added `services/api/test/productionIdentityWorkspaceSchema.test.js` to statically validate:

- the draft schema file exists,
- the expected production foundation tables are present,
- the schema is clearly PostgreSQL-oriented,
- the request-context scaffolding normalizes headers as expected.

## How local MVP runtime behavior was preserved

- No existing SQLite persistence path was removed or replaced.
- No server routes were switched to PostgreSQL.
- No login requirement was introduced.
- No admin/client UI behavior was changed.
- The new request-context module is isolated scaffolding only.
- The new schema file is a draft artifact and is not invoked by runtime startup.

## Risks and rollback note

### Risks

- The PostgreSQL schema draft is intentionally broader than the current MVP and may need refinement once route-by-route authorization is implemented.
- The RBAC and service-principal tables are foundational, but they are not yet wired into live authorization checks.

### Rollback

If any future integration causes regression, rollback is straightforward:

- remove the new production draft files,
- keep the existing SQLite schema and runtime untouched,
- leave the current API startup path unchanged.

## Immediate next implementation task

Refactor the highest-risk route groups to consume the new request-context shape and begin enforcing tenant/workspace-aware authorization boundaries, starting with admin-only provider settings and agent bridge routes.

## Files changed

- `LOGS/EAI-TASK-029-terminal.log`
- `REPORTS/EAI-TASK-029-PRODUCTION-IDENTITY-WORKSPACE-SCHEMA.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_IDENTITY_WORKSPACE_SCHEMA.json`
- `services/api/src/db/production/001_identity_workspace_schema.sql`
- `services/api/src/middleware/requestContext.js`
- `services/api/test/productionIdentityWorkspaceSchema.test.js`

## Artifact commit SHA

`PENDING_COMMIT_SHA`

## Final note

This task establishes the first production identity/workspace foundation without altering the accepted local MVP runtime. The repository now has a concrete schema draft, a request-context scaffold, and validation coverage for both.
