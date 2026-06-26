# EAI-TASK-028: Design production auth users tenants and workspace model

## Final status

PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `248a15b`
- **Pre-commit artifact SHA placeholder:** `ad4d8a8`
- **Artifact commit SHA:** `ad4d8a8`
- **Final SHA source of truth:** GitHub issue comment after post-commit sync

## Evidence reviewed

Reviewed source evidence from the task brief plus repository documentation and runtime code:

- `REPORTS/EAI-TASK-027-PRODUCTION-ARCHITECTURE-PLAN.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_ARCHITECTURE_PLAN.json`
- `REPORTS/EAI-TASK-026-FINAL-LOCAL-MVP-ACCEPTANCE.md`
- `docs/HANDOVER_2026-06-26_FINAL_LOCAL_MVP_ACCEPTANCE.json`
- `docs/ROADMAP.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `services/api/src/db/schema.sql`
- `services/api/src/server.js`
- `services/api/src/routes/files.routes.js`
- `services/api/src/routes/search.routes.js`
- `services/api/src/routes/wiki.routes.js`
- `services/api/src/routes/intelligence.routes.js`
- `services/api/src/routes/watch.routes.js`
- `services/api/src/routes/actions.routes.js`
- `services/api/src/routes/recovery.routes.js`
- `services/api/src/routes/integrations.routes.js`
- `services/api/src/routes/system.routes.js`
- `services/api/src/routes/sourcePaths.routes.js`
- `services/api/src/routes/providerSettings.routes.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/routes/jobs.routes.js`
- `services/api/src/routes/planning.routes.js`
- `services/api/src/routes/executionBatches.routes.js`
- `services/api/src/middleware/auth.js`

Unavailable or mismatched source evidence:

- `services/api/src/db/schema.js` was listed in the issue brief, but the repository snapshot contains `services/api/src/db/schema.sql` instead.

## Validation summary

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`114 tests, 0 failures, 1 skipped`)

## Proposed identity / tenant / workspace model

### 1) User identity model

Use a single canonical `users` table for all people who sign in to the production platform.

Recommended identity fields:

- `id` — UUID primary key
- `email` — unique login identifier where email auth is used
- `display_name`
- `status` — `invited | active | suspended | deleted`
- `primary_role` — convenience field for the user’s top-level role
- `created_at`, `updated_at`, `last_login_at`

Auth should be provider-backed, but the platform should keep its own user record so workspace membership and audit trails remain stable even if the external identity provider changes.

### 2) Tenant / organization model

Use `tenants` as the top-level business container.

Recommended tenant fields:

- `id`
- `name`
- `slug`
- `status` — `active | suspended | deleted`
- `plan_tier`
- `created_at`, `updated_at`

Each user can belong to zero or more tenants through `tenant_memberships`.

### 3) Workspace model

Use `workspaces` as the operational boundary inside a tenant.

Recommended workspace fields:

- `id`
- `tenant_id`
- `name`
- `slug`
- `workspace_type` — `client | admin_shared | service`
- `status`
- `created_at`, `updated_at`

A workspace is the unit that scopes files, sources, search results, jobs, plans, and execution history.

### 4) Role and permission model

Use role-based access control with scoped permissions.

Recommended roles:

- `platform_admin`
- `tenant_admin`
- `workspace_admin`
- `workspace_editor`
- `workspace_viewer`
- `agent_service`
- `connector_runtime`

Recommended permission families:

- `manage_platform`
- `manage_tenants`
- `manage_workspaces`
- `manage_memberships`
- `read_workspace_data`
- `manage_sources`
- `manage_plans`
- `approve_actions`
- `execute_actions`
- `manage_connectors`
- `read_audit`
- `manage_integrations`

The implementation should prefer explicit permission checks over role-name heuristics wherever practical.

### 5) Admin vs client user boundaries

Admin and client boundaries should remain explicit in both data and routes.

- Platform admin users can access global admin controls and platform configuration.
- Tenant admins can manage users, workspaces, and policies inside their tenant.
- Client users should only see workspaces they are members of.
- Client users must not see provider secrets, connector registration internals, or system-level deployment controls.
- Admin-only controls should remain on separate route groups and separate UI surfaces.

### 6) Agent / connector permission boundaries

Agents and connectors should be treated as service principals, not as full human users.

Recommended rules:

- Agents may read only the workspace context they are explicitly granted.
- Agents may propose suggestions, summaries, or draft actions.
- Agents may not directly mutate platform state outside approved workflows.
- Agents may not read tenant-wide secrets by default.
- Connector execution must be explicitly enabled and scoped.
- Any filesystem or command execution must remain approval-gated and auditable.

### 7) Local client-agent permission relationship

For the local client-agent bridge, keep the current safety model and make it workspace-scoped in production terms.

Rules:

- The browser UI never gets raw shell or filesystem access.
- The client-agent bridge is a separate locally trusted component.
- The bridge should require a workspace-scoped, time-limited authorization token.
- The bridge may only act on approved actions.
- The bridge should expose narrow operations: read context, list files, collect local evidence, perform approved file mutations.
- The bridge should never become a general-purpose server-side privilege escalation path.

### 8) First PostgreSQL schema outline

Initial production PostgreSQL schema should introduce identity and tenancy before moving the rest of the app.

Core tables:

- `users`
- `auth_identities`
- `tenants`
- `tenant_memberships`
- `workspaces`
- `workspace_memberships`
- `roles`
- `role_permissions`
- `permission_grants`
- `audit_events`
- `service_principals`
- `service_principal_permissions`
- `workspace_sources`
- `workspace_documents`
- `workspace_jobs`
- `workspace_job_events`
- `workspace_connector_links`
- `secrets_metadata` or a tenant-scoped secret reference table

Suggested early columns for the core identity tables:

```text
users(id, email, display_name, status, primary_role, created_at, updated_at, last_login_at)
tenants(id, name, slug, status, plan_tier, created_at, updated_at)
workspaces(id, tenant_id, name, slug, workspace_type, status, created_at, updated_at)
tenant_memberships(id, tenant_id, user_id, role, status, invited_by, invited_at, accepted_at)
workspace_memberships(id, workspace_id, user_id, role, status, created_at)
auth_identities(id, user_id, provider, provider_subject, email, created_at, updated_at)
audit_events(id, tenant_id, workspace_id, actor_type, actor_id, event_type, payload_json, created_at)
```

The current local SQLite tables should not be copy-pasted blindly. They should be normalized into workspace-scoped equivalents when the production schema arrives.

### 9) SQLite-to-PostgreSQL migration approach

Keep the local SQLite MVP intact while introducing a separate production migration path.

Recommended migration path:

1. Add PostgreSQL as the production source of truth.
2. Add schema versioning and forward-only migrations.
3. Create a default tenant and default workspace for existing single-user/local data.
4. Backfill current local rows into workspace-scoped production tables.
5. Keep SQLite for local MVP/dev workflows until production parity is mature.
6. Migrate document, source, and audit tables after identity and workspace ownership are stable.
7. Add restore verification and migration dry-runs before production rollout.

Important distinction:

- SQLite remains the local MVP persistence layer.
- PostgreSQL becomes the production multi-tenant source of truth.
- Migration work should not weaken the local MVP’s current validation path.

### 10) Route / API boundary impact map

Current route groups in `services/api/src/server.js` should evolve as follows:

- `auth` / identity routes — new production login, logout, session, invite, and membership endpoints
- `admin` routes — platform configuration, provider settings, integration setup, and operator controls
- `tenants` routes — tenant membership, role assignment, policy management
- `workspaces` routes — workspace creation, membership, source selection, and workspace-scoped settings
- `workspace data` routes — files, search, wiki, intelligence, planning, execution, recovery, jobs
- `connector` routes — bridge detection, probe, and approval-gated execution controls

Current route impact by area:

- `services/api/src/routes/providerSettings.routes.js` — should become admin/tenant-admin only and tenant-aware
- `services/api/src/routes/agentBridge.routes.js` — should become workspace-scoped and permission-gated
- `services/api/src/routes/files.routes.js` — should require workspace context
- `services/api/src/routes/search.routes.js` — should require workspace context and membership checks
- `services/api/src/routes/wiki.routes.js` — should require workspace context
- `services/api/src/routes/intelligence.routes.js` — should require workspace context
- `services/api/src/routes/watch.routes.js` — should be limited to approved workspace sources
- `services/api/src/routes/actions.routes.js` — should enforce workspace and approval boundaries
- `services/api/src/routes/recovery.routes.js` — should be workspace-scoped and auditable
- `services/api/src/routes/jobs.routes.js` — should carry tenant/workspace ownership metadata
- `services/api/src/routes/planning.routes.js` — should be workspace-scoped and role-checked
- `services/api/src/routes/executionBatches.routes.js` — should require explicit approval and workspace ownership
- `services/api/src/routes/system.routes.js` — should be admin-only and reduced to health/status plus platform metadata
- `services/api/src/routes/sourcePaths.routes.js` — should become workspace source management rather than global local-only source state

### 11) Phased implementation plan

#### Phase 1 — Identity foundation
- Add users, auth identities, tenants, memberships, and sessions.
- Introduce request context for actor, tenant, and workspace.
- Preserve current local MVP auth behavior until migration is ready.

#### Phase 2 — Workspace RBAC
- Add workspace membership and role checks.
- Split admin and client route groups.
- Enforce workspace-scoped read/write boundaries.

#### Phase 3 — PostgreSQL schema and migrations
- Move the production source of truth to PostgreSQL.
- Add migrations, schema versioning, and backfill tooling.
- Map SQLite-backed local entities into workspace-scoped production tables.

#### Phase 4 — API refactor
- Propagate tenant/workspace context through files, search, wiki, planning, actions, recovery, and jobs routes.
- Convert provider and connector routes to admin-only or tenant-admin-only paths.

#### Phase 5 — Connector and agent security
- Add service principal records for connectors and agents.
- Enforce approval-gated execution and narrow bridge permissions.
- Add auditable permission grants and revocation.

#### Phase 6 — Production readiness hardening
- Add monitoring, audits, backups, restore drills, and deployment gates.
- Validate operational flows in a production-like environment.

## Immediate next implementation task

Implement PostgreSQL-backed identity, tenant, workspace, and membership tables plus request-context middleware, then refactor the highest-risk admin-only route groups to consume workspace-scoped authorization.

## Files changed

- `LOGS/EAI-TASK-028-terminal.log`
- `REPORTS/EAI-TASK-028-AUTH-TENANT-WORKSPACE-MODEL.md`
- `docs/HANDOVER_2026-06-26_AUTH_TENANT_WORKSPACE_MODEL.json`

## Artifact commit SHA

`ad4d8a8`

## Final note

This is a design-and-schema planning task only. No runtime auth changes were implemented in this pass.
