# Phase 3 — Enterprise Architecture Authority

Date: 2026-08-28
Authority: CEO-approved architecture direction

## Approved decisions

- ER-1 — Self-hosted enterprise server first.
- ER-2 — OIDC-first identity federation with provider-neutral boundaries.
- ER-3 — PostgreSQL as the production data platform.
- ER-4 — Shared database with explicit tenant/workspace scoping and PostgreSQL row-level security.
- ER-5 — S3-compatible object-storage abstraction.

These decisions authorize bounded, dependency-satisfied Enterprise Platform implementation. They do not authorize destructive migration, production secret provisioning, cloud-provider lock-in, automatic actions, privileged-host changes, or unrelated connector/runtime expansion.

## Implementation order

1. Identity, tenant/workspace authorization and PostgreSQL isolation foundation — accepted through #292/#293.
2. Provider-neutral S3-compatible object-storage abstraction with local filesystem compatibility.
3. Durable production document/object metadata integration and migration/rollback tooling.
4. Self-hosted enterprise deployment topology, secret boundaries and operational health.
5. Backup/restore and disaster-recovery validation.
6. Enterprise load/capacity and security release gates.

Each milestone inherits the complete applicable accepted regression baseline and requires independently reviewable validation on the unchanged final candidate.

## Current boundary

The local-first runtime remains a supported product mode. Enterprise Platform additions must be explicit/opt-in until a separately accepted migration/release gate authorizes otherwise.