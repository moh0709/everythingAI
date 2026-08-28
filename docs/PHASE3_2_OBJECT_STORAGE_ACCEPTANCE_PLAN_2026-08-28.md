# Phase 3.2 — S3-Compatible Object Storage Acceptance Plan

Date: 2026-08-28
Track: Enterprise Platform
Dependency: accepted Phase 3.1 enterprise isolation foundation (#292/#293)

## Objective

Introduce a provider-neutral object-storage boundary for enterprise deployments while preserving the existing local filesystem path as the default/local-first behavior.

## Required behavior

1. A storage adapter contract supports object put/get/head/delete semantics without embedding a specific S3 vendor in product code.
2. A local filesystem adapter preserves current local-first behavior and remains usable without enterprise configuration.
3. An S3-compatible adapter is explicitly opt-in and receives endpoint/bucket/region/credential material only through configuration boundaries; credentials are never persisted in repository data or logs.
4. Production object keys are derived from trusted tenant/workspace scope plus an opaque object identifier; callers cannot escape or override the authorized tenant/workspace namespace.
5. Missing, invalid or ambiguous production tenant/workspace scope fails closed before storage access.
6. Storage metadata may record provider-neutral URI/object identity, size, checksum/content type and timestamps, but existing document bytes are not migrated by this milestone.
7. Delete is an explicit storage operation only; no automatic deletion, retention or lifecycle behavior is introduced.
8. Local and S3 implementations expose consistent not-found/error semantics sufficient for callers to avoid inferring success.

## Focused acceptance

Strict RED→GREEN where feasible for:

- valid tenant/workspace-scoped object key generation;
- cross-tenant namespace denial;
- cross-workspace namespace denial;
- traversal/absolute-path style identifier denial;
- missing/ambiguous production scope denial;
- local adapter round-trip without enterprise configuration;
- S3 adapter configuration remains provider-neutral and does not log/expose credentials;
- no existing document migration occurs.

## Inherited validation

Every changed final candidate must pass EverythingAI CI Smoke, all fifteen mandatory inherited focused workflows, the accepted Enterprise Isolation focused workflow, and the new Object Storage focused workflow on the same unchanged head. Independent final diff/security review must have no unresolved Critical or Important findings or review threads.

## Rollback

The milestone must be independently reversible. Local filesystem behavior must remain available after rollback. No irreversible data migration is permitted in Phase 3.2.

## Explicit non-goals

- migrating existing local files or document bytes;
- selecting a mandatory S3 vendor;
- provisioning buckets, IAM users, credentials or TLS certificates;
- privileged-host/systemd work;
- cloud deployment;
- retention/lifecycle automation;
- new connector/runtime behavior;
- modifications to historical issue #69.