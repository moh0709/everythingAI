# EAI-TASK-027: Production architecture and release-hardening plan

## Final status

PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `4eda30a`
- **Pre-commit artifact SHA placeholder:** `PENDING_COMMIT_SHA`
- **Artifact commit SHA:** `PENDING_COMMIT_SHA`
- **Final SHA source of truth:** GitHub issue comment after post-commit sync

## Evidence reviewed

Reviewed source evidence from the task brief plus repository documentation:

- `docs/HANDOVER_2026-06-26_FINAL_LOCAL_MVP_ACCEPTANCE.json`
- `REPORTS/EAI-TASK-026-FINAL-LOCAL-MVP-ACCEPTANCE.md`
- `docs/ROADMAP.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/NEXT_IMPLEMENTATION_BACKLOG_2026-06-24.md`
- `docs/AGENT_ACCESS_CONTROL_MODEL.md`
- `docs/AI_AGENT_PROJECT_PLAN.md`
- `docs/AI_ORGANIZATION_ENGINE.md`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `services/api/src/agents/localAgentBridge.js`
- `services/api/src/scripts/detectAgentConnectors.js`
- `services/api/src/scripts/probeAgentVersions.js`

Unavailable source evidence:

- `docs/PRODUCTION_HARDENING.md` was listed in the issue but is not present in this repository snapshot.

## Validation summary

- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`114 tests, 0 failures, 1 skipped`)

## Production target architecture

The production target should separate the current local MVP from a later server-centric platform.

### Target shape

```text
Client browser UI
  -> authenticated API gateway
  -> tenant/workspace authorization layer
  -> central application services
  -> PostgreSQL + search/index storage
  -> object/file storage for durable documents and uploads
  -> async job/worker queue
  -> audit/logging/metrics/backup subsystems
  -> optional client agent for approved local filesystem access
```

### Key principles

- Server-owned authentication, authorization, and tenant isolation.
- No direct agent access to databases or storage layers outside controlled APIs.
- Local filesystem access remains client-agent mediated and approval-gated.
- Admin-only controls stay separate from the client workspace.
- Release-hardening should be treated as a distinct phase from MVP acceptance.

## Local MVP vs production gap analysis

### Local MVP state accepted now

The repo already demonstrates a validated local MVP with:

- separated Client Workspace and Admin surfaces,
- local backend/API flows for indexing, extraction, search, preview, persistence, and diagnostics,
- durable wiki/knowledge-base storage paths,
- governed planning preview and execution flows,
- safe agent connector detection/version probes,
- browser-validated smoke coverage,
- CI-aligned validation commands that pass.

### Remaining production gaps

The local MVP is not yet a production platform because it still lacks:

- production authentication and user identity management,
- multi-tenant / workspace authorization model,
- production database strategy and migrations beyond local SQLite usage,
- object storage / upload durability for production scale,
- production-grade secrets and credential handling,
- queue-based background processing and retry semantics,
- backups, restore drills, and retention policy enforcement,
- structured observability and production incident visibility,
- release gates and deployment automation for production rollout.

## Security and credential plan

### Security model

Use controlled APIs and workflow checks as the only default path for state-changing operations.

- Backend services own authorization decisions.
- Agents may read and suggest through APIs, but not bypass permission checks.
- The client-agent path is the only route for approved local filesystem operations.
- The browser UI must never expose raw credentials or shell execution.

### Credential handling

- Store secrets server-side only in a dedicated secret manager or equivalent encrypted store.
- Keep API keys masked in UI and logs.
- Do not place credentials in client-side state, logs, or issue comments.
- Maintain distinct admin-only controls for provider and connector setup.
- Require explicit approval for any execution path that could modify files or invoke external tooling.

### Connector safety boundary

The current connector model already reinforces a safe boundary:

- detection is path-based,
- probe actions are limited to safe version/help checks,
- bridge execution is opt-in via explicit local flags,
- chat execution remains disabled unless separately approved,
- arbitrary shell execution is blocked.

## Database and storage migration plan

### Current state

The repo is validated locally and includes local persistence paths suitable for MVP use.

### Production path

1. Introduce PostgreSQL as the production source of truth.
2. Add a migration system and explicit schema versioning.
3. Move durable uploads and large document artifacts to object storage.
4. Keep search/index artifacts in controlled services or managed search infrastructure.
5. Add backup/restore and retention policies before production rollout.

### Migration approach

- Start with a clearly defined schema for users, workspaces, files, sources, jobs, and audit events.
- Add forward-only migrations and restore verification.
- Plan a staged migration path from local SQLite artifacts to production PostgreSQL/object storage.
- Avoid mixing production migration concerns into the current local MVP unless the issue explicitly requires it.

## Client-agent and file-access strategy

- Client filesystem access should remain local and approved.
- The server should request actions through explicit workflows, not direct filesystem control.
- The agent should only execute commands that are pre-approved and safety-checked.
- All move/rename/delete actions should remain previewable and undoable where supported.
- Local client agent behavior should stay separated from browser-only user interactions.

## Deployment, observability, backups, and migrations

### Deployment strategy

- Containerize server components and deploy them separately from the client UI.
- Use environment-specific configuration for secrets and infrastructure endpoints.
- Keep production deployment independent from local MVP smoke flows.
- Require health checks and rollback paths for each deployable unit.

### Observability

- Structured logs for API requests, background jobs, connector probes, and file operations.
- Metrics for queue latency, indexing throughput, error rates, and storage health.
- Audit logs for all sensitive actions and approval transitions.
- Traceability across UI actions, backend jobs, and storage mutations.

### Backups and migrations

- Define backup frequency, retention, and restore procedures before production rollout.
- Validate migration and restore procedures in a non-production environment.
- Treat backup/restore verification as a release gate, not a later enhancement.

## Release gates and validation strategy

Recommended release gates for the production track:

1. Framework doctor / repository baseline check.
2. UI typecheck and production build.
3. API test suite.
4. Security review for credential handling and authorization boundaries.
5. Migration dry-run and restore verification.
6. Deployment smoke test in the target environment.
7. Connector and local-agent safety checks where applicable.
8. Post-deploy health and observability confirmation.

## Recommended phased implementation sequence

1. Auth, users, tenants, and workspace model.
2. PostgreSQL schema and migration framework.
3. Object/file storage and durable upload handling.
4. Background job queue and retry semantics.
5. Observability, logging, and audit pipeline.
6. Backups, retention, and restore drills.
7. Deployment automation and environment configuration.
8. Production release gates and preflight validation.
9. Only after the above, broaden into production rollout and scale-hardening.

## Immediate next implementation task

Create a follow-up Hermes task focused on **auth, users, tenants, and workspace model design** for the production path, including the first PostgreSQL schema and migration outline.

That is the clearest prerequisite for any later production deployment or storage-hardening work.

## Files changed

- `LOGS/EAI-TASK-027-terminal.log`
- `REPORTS/EAI-TASK-027-PRODUCTION-ARCHITECTURE-PLAN.md`
- `docs/HANDOVER_2026-06-26_PRODUCTION_ARCHITECTURE_PLAN.json`

## Artifact commit SHA

`PENDING_COMMIT_SHA`

## Final note

The local MVP acceptance remains valid, but it should not be confused with production readiness. The current repo now has an explicit production-gap map and an implementation sequence for the next phase.
