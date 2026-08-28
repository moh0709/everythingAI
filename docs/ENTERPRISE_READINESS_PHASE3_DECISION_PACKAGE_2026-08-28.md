# EverythingAI — Phase 3 Enterprise Readiness Decision Package

Date: 2026-08-28  
Governance issue: #290  
Status: **PROPOSED — CEO architecture decisions required before runtime implementation**

## 1. Purpose

This package converts the accepted five-track gate into a concrete Enterprise Readiness plan while preserving the shipped local-first product, all accepted Phase 1/Phase 2/Product Depth behavior, the fifteen mandatory focused workflows, rollback evidence, and issue #69 as immutable historical evidence.

This document authorizes planning only. It does not authorize production migration, privileged-host work, cloud deployment, identity-provider integration, automatic actions, connector/runtime expansion, or destructive data changes.

## 2. Current-state inventory

Repository inspection shows that EverythingAI already contains meaningful enterprise foundations rather than starting from zero.

### Reusable foundations

- `services/api/src/db/production/001_identity_workspace_schema.sql` already defines PostgreSQL-oriented users, external auth identities, tenants, tenant memberships, workspaces, workspace memberships, roles, permissions, service principals, audit events, workspace-scoped sources/documents/jobs and connector links.
- `services/api/src/db/production/identityPersistenceAdapter.js` provides a production-only identity persistence abstraction with stable tenant/workspace lookup semantics.
- `services/api/src/db/production/postgresIdentityPersistenceAdapter.js` provides PostgreSQL-specific production identity persistence plumbing.
- `services/api/src/db/production/migrationLoader.js` and `migrationRunner.js` provide an initial migration mechanism.
- `services/api/src/db/production/workspaceContextMiddleware.js` provides a bounded workspace-context integration point.
- Existing governed-action, audit, undo, evidence, provenance, unknown-state and safe-return contracts provide a strong trust layer that must remain authoritative.
- Existing CI and focused workflow gates already provide unusually strong regression discipline for enterprise evolution.

### Current limitations / gaps

- Production identity foundations are draft/foundation code and are not yet the authoritative runtime identity system.
- No accepted end-to-end authentication flow is established for OIDC/SAML/SSO.
- Authorization invariants are not yet proven across every API/resource path.
- Tenant isolation has not yet been demonstrated through adversarial cross-tenant tests.
- SQLite/local runtime remains the accepted default; production PostgreSQL is not yet an accepted runtime migration.
- Object/file storage architecture is not yet accepted.
- Encryption-at-rest/key-management, backup/restore and disaster-recovery contracts are not yet accepted.
- Central observability, production SLOs and capacity/load evidence are incomplete.
- Security hardening and supply-chain controls are not yet release-gated as a complete enterprise security baseline.

## 3. Architecture options evaluated

### Option A — Keep local-only architecture

**Advantages**
- Lowest operational complexity.
- Maximum preservation of current behavior.
- Minimal migration risk.

**Disadvantages**
- Does not satisfy multi-user enterprise identity, tenant isolation, centralized policy, SSO or managed operations requirements.

**Decision:** Reject as the enterprise target, preserve as a supported deployment mode.

### Option B — Cloud-first SaaS rewrite

**Advantages**
- Clean centralized deployment model.
- Easier standardization of identity, storage and observability.

**Disadvantages**
- High migration and rewrite risk.
- Violates the accepted local-first product boundary if used as the only mode.
- Creates unnecessary architecture churn and operational cost before enterprise requirements are proven.

**Decision:** Reject as the default direction.

### Option C — Dual-mode local-first + enterprise server architecture

Local mode preserves current SQLite/filesystem behavior. Enterprise mode adds a production server control/data plane using PostgreSQL, workspace/tenant authorization, enterprise identity federation, managed storage abstractions and centralized operations.

**Advantages**
- Preserves the accepted product.
- Reuses existing production identity/workspace foundations.
- Allows self-hosted enterprise deployment first, with cloud hosting remaining an optional later topology.
- Enables staged migration and rollback instead of a rewrite.

**Disadvantages**
- Requires strict boundary discipline between local and enterprise adapters.
- Requires compatibility testing across two deployment modes.

**Decision:** **Recommended target architecture.**

## 4. Recommended target architecture

### 4.1 Identity and access

Use a provider-neutral federation boundary:

`Browser/client -> EverythingAI session boundary -> OIDC identity provider -> mapped user -> tenant membership -> workspace membership -> permission evaluation`

Recommended strategy:

- OIDC as the primary federation protocol.
- SAML support through an enterprise identity broker/provider when required rather than building a custom SAML stack in the application core.
- No local password storage in the first enterprise milestone unless separately approved.
- Stable internal `user.id` remains independent from provider subject identifiers.
- External identities map through `(provider, provider_subject)`.
- Session and authorization logic must fail closed.
- Service principals remain separate from human users.

### 4.2 Authorization model

Adopt scoped RBAC with explicit tenant/workspace boundaries:

- system scope;
- tenant scope;
- workspace scope.

Core invariants:

1. Every enterprise request resolves an authenticated principal.
2. Every resource-bearing request resolves a tenant/workspace scope before repository access.
3. Membership and permission checks happen before data lookup or mutation.
4. No resource identifier alone may authorize access.
5. Cross-tenant references are rejected even if identifiers are valid.
6. Service principals receive least-privilege permissions and cannot inherit human privileges implicitly.
7. Authorization failures must not leak whether a foreign-tenant resource exists.
8. Governed-action approval/audit/undo semantics remain unchanged and authoritative.

### 4.3 Tenancy and isolation

Recommended data model: shared PostgreSQL cluster/database with mandatory `tenant_id` / `workspace_id` scoping in the first enterprise release, enforced at both application repository boundaries and PostgreSQL Row Level Security where practical.

Why:

- lower operational complexity than database-per-tenant;
- easier migration and backup management;
- sufficient enterprise isolation when layered with application authorization, RLS, tests and audit evidence;
- preserves a path to dedicated database deployment for customers with stronger isolation requirements later.

Mandatory isolation controls:

- scoped repositories;
- tenant/workspace context middleware;
- RLS policies for tenant-owned production tables where feasible;
- no unscoped administrative queries in ordinary request paths;
- adversarial tenant-isolation test suite;
- audit events carrying actor, tenant, workspace, request and operation identity.

### 4.4 Data platform

Recommended enterprise database: **PostgreSQL**.

Reasons:

- existing repository foundations already target PostgreSQL;
- transactional integrity;
- mature RLS, indexing, backup and replication ecosystem;
- JSONB support for existing flexible metadata patterns;
- minimal architecture divergence from current draft production code.

Local mode continues using its accepted local persistence path. Enterprise PostgreSQL must be introduced through adapters rather than replacing local behavior in-place.

### 4.5 Object and file storage

Introduce a storage abstraction before selecting a production object backend.

Required interface capabilities:

- put/read/delete by workspace-scoped object key;
- content metadata and integrity checksum;
- immutable/version-aware writes where required;
- encryption-at-rest delegated to the backend/platform;
- signed/authorized retrieval rather than public object URLs;
- tenant/workspace path/key isolation;
- lifecycle/retention policy hooks.

Preferred enterprise target: S3-compatible object storage because it supports AWS S3, MinIO and many self-hosted/managed providers without coupling EverythingAI to one cloud.

No object-storage migration is authorized by this document.

### 4.6 Deployment topology

Recommended first enterprise topology: **self-hosted enterprise server**.

Logical services:

- web/client application;
- API service;
- background job/worker process where currently required;
- PostgreSQL;
- S3-compatible object store when introduced;
- identity provider external to EverythingAI;
- centralized logs/metrics/traces collector.

Containerization is preferred for reproducibility, but privileged-host/systemd or production orchestration implementation remains separately gated.

Cloud-hosted deployment may reuse the same interfaces later and must not become a prerequisite for enterprise mode.

## 5. Security model

### Trust boundaries

- browser/client is untrusted;
- network input is untrusted;
- external identity claims are trusted only after signature/issuer/audience/nonce validation;
- connector output is untrusted until validated by existing safe-action/evidence contracts;
- tenant/workspace identifiers from requests are never authorization proof;
- database and object-store credentials are server-only secrets.

### Required controls

- TLS for all production network paths;
- short-lived authenticated sessions/tokens;
- secure, HttpOnly, SameSite cookies when browser sessions are used;
- CSRF protection for cookie-authenticated state-changing requests;
- strict CORS policy;
- structured authorization checks at route/repository boundaries;
- secret injection through environment/secret manager, never repository content;
- encryption at rest for production DB/object storage;
- auditable administrative operations;
- least-privilege database/service credentials;
- dependency lockfiles, vulnerability scanning and provenance-aware build/release process;
- no secrets or sensitive tokens in logs;
- rate limits and abuse controls on authentication and high-cost AI/API endpoints.

## 6. Operations and resilience

### Observability

Enterprise mode must expose:

- structured application logs with request/tenant/workspace correlation identifiers without leaking protected content;
- service health/readiness endpoints;
- metrics for request latency/error rate, worker/job state, DB pool saturation, storage errors and AI/provider failures;
- distributed trace correlation where practical;
- alert thresholds tied to defined SLOs.

### Backup and disaster recovery

Before production acceptance:

- automated PostgreSQL backups;
- object-store backup/versioning policy where applicable;
- documented restore procedure;
- periodic restore test into an isolated environment;
- RPO/RTO values explicitly accepted before production launch;
- migration rollback procedure for every schema change;
- no destructive migration without verified backup and rollback evidence.

## 7. Enterprise acceptance matrix

| Gate | Required evidence |
|---|---|
| Identity | valid OIDC login, invalid issuer/audience rejection, disabled-user rejection, session expiry |
| Authorization | role/permission allow and deny cases on every protected resource class |
| Tenant isolation | adversarial cross-tenant read/write/search/action attempts all denied without existence leakage |
| Workspace isolation | cross-workspace access denied unless explicit authorized shared scope exists |
| Service principals | least-privilege tests and revocation tests |
| Database migration | forward migration, compatibility checks, rollback/restore evidence |
| Storage | tenant-key isolation, integrity checksum, unauthorized retrieval denial |
| Audit | actor/tenant/workspace/request correlation and immutable accepted semantics |
| Backup/restore | successful isolated restore from production-format backup |
| Security | dependency scan, secret scan, authorization regression, HTTP security configuration review |
| Performance | agreed concurrency/latency/load targets met without authorization or data-isolation degradation |
| Regression | root regression + backend + frontend + client/admin smoke + all accepted Product Depth gates + all 15 mandatory focused workflows |
| Review | independent diff/security review with no unresolved Critical/Important findings |
| Rollback | milestone-scoped rollback documented and practically verifiable |

Historical green results never substitute for unchanged-head validation of changed candidates.

## 8. Staged implementation order

### Phase 3A — Identity boundary and authorization kernel

First implementation milestone after CEO decisions:

- formalize provider-neutral authenticated principal contract;
- formalize tenant/workspace authorization context;
- enforce fail-closed authorization in a deliberately bounded enterprise-only API slice;
- add tenant-isolation and authorization acceptance tests;
- preserve local mode untouched.

No full production migration yet.

### Phase 3B — PostgreSQL enterprise persistence

- validate existing migration/repository foundations;
- add scoped repository interfaces and RLS where appropriate;
- migrate only bounded enterprise tables first;
- prove migration/restore/rollback.

### Phase 3C — Enterprise storage abstraction

- introduce S3-compatible storage adapter behind an interface;
- preserve local filesystem adapter;
- prove authorization, integrity and rollback.

### Phase 3D — Enterprise operations

- health/readiness;
- structured logs/metrics/traces;
- backup/restore automation;
- documented SLO/RPO/RTO;
- load validation.

### Phase 3E — Enterprise release gate

- complete security and tenant-isolation review;
- full inherited regression matrix;
- fresh release candidate;
- independent final review;
- explicit `ENTERPRISE_READINESS_PASS` only after all required evidence exists.

## 9. CEO decisions required before Phase 3A runtime implementation

### Decision ER-1 — Enterprise deployment model

**Recommendation:** self-hosted enterprise server first; cloud-hosted deployment later using the same interfaces.

Options:
- A. Self-hosted first **(recommended)**
- B. Managed cloud first
- C. Both simultaneously

### Decision ER-2 — Identity strategy

**Recommendation:** OIDC-first provider-neutral application contract; SAML via external identity broker/provider where required; no custom password system in Phase 3A.

Options:
- A. OIDC-first federation **(recommended)**
- B. Application-managed local accounts/passwords first
- C. Both from first milestone

### Decision ER-3 — Enterprise database

**Recommendation:** PostgreSQL, reusing the existing production foundation.

Options:
- A. PostgreSQL **(recommended)**
- B. Another production database (requires new architecture review)

### Decision ER-4 — Tenant isolation model

**Recommendation:** shared PostgreSQL with mandatory tenant/workspace scoping + application authorization + RLS where practical; retain future option for dedicated deployments.

Options:
- A. Shared DB + scoped rows/RLS **(recommended)**
- B. Schema per tenant
- C. Database per tenant

### Decision ER-5 — Object storage direction

**Recommendation:** S3-compatible abstraction; do not lock to a specific cloud vendor.

Options:
- A. S3-compatible abstraction **(recommended)**
- B. Local/network filesystem only
- C. Vendor-specific cloud object store

## 10. Cost and operational implications

The recommended architecture minimizes forced cost by keeping local mode intact and making enterprise services deployment-dependent.

Enterprise operating cost will primarily come from:

- PostgreSQL hosting/operations;
- object storage capacity and requests;
- identity provider licensing where applicable;
- observability retention;
- backup storage;
- compute for API/workers/AI providers;
- security and support operations.

Self-hosted-first avoids coupling product viability to one cloud bill and is compatible with managed infrastructure later.

## 11. Migration and rollback strategy

- local mode remains an accepted deployment mode throughout Phase 3;
- enterprise functionality enters through explicit adapters and enterprise-only configuration;
- no big-bang replacement of SQLite/filesystem behavior;
- every schema migration is versioned and independently rollback/restore tested;
- data migration is performed only after preflight validation and backup evidence;
- release rollback means reverting the milestone plus restoring/migrating data according to that milestone's recorded rollback procedure;
- historical accepted merges and issue #69 remain unchanged.

## 12. Proposed first implementation issue after CEO decisions

**Phase 3A — Enterprise Identity & Authorization Kernel**

Bounded scope:

1. define authenticated-principal and authorization-context contracts;
2. adapt existing production identity/workspace foundations without changing local runtime defaults;
3. implement one enterprise-only protected API slice;
4. prove same-tenant allowed, cross-tenant denied, cross-workspace denied, missing-context denied and service-principal least privilege;
5. add focused CI acceptance workflow;
6. run complete inherited regression baseline plus all fifteen focused workflows;
7. independent security/diff review;
8. record exact rollback.

This implementation issue must not be released until ER-1 through ER-5 are explicitly accepted or changed by the CEO.

## 13. Decision status

Architecture recommendation: **DUAL-MODE LOCAL-FIRST + ENTERPRISE SERVER**.

Implementation status: **CEO-GATED**.

Required next action: obtain ER-1 through ER-5 decisions. No material enterprise runtime implementation is authorized before those decisions are recorded.