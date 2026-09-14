# Phase 7 — AI Organization Workspace Foundation

Date: 2026-09-14
Status: ACTIVE — bounded foundation only

## Objective

Advance EverythingAI from the accepted Phase 6 identity/tenancy/authorization foundation into the first bounded implementation stages of the already-designed AI Organization Workspace workflow.

Phase 7 is intentionally limited to non-destructive foundation work. It does not authorize archive execution, watcher-driven archive writes, movement or renaming of originals, production infrastructure activation, production secrets, destructive migrations, broad authorization rollout, external certification, production load qualification, commercial SLA/SLO commitments, or material automatic enforcement authority.

## Authoritative design dependency

`docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md` defines the staged organization-workspace contract. This phase begins with Stage 2: Archive Profile Model.

## Phase 7.1 — Archive Profile Model

Bounded scope:

- define the archive-profile domain model;
- enforce copy-first defaults;
- require source and archive destination separation;
- require explicit acknowledgement when archive destination is nested inside a source;
- require explicit warning acknowledgement for full-drive sources;
- preserve manual approval and no-overwrite policies;
- persist validated archive profiles in local SQLite-compatible storage;
- provide deterministic focused tests for validation and persistence.

Explicitly excluded:

- no filesystem mutation;
- no archive copy executor;
- no source move/rename;
- no watcher-triggered archive writes;
- no automatic approval;
- no production credential/provider provisioning;
- no privileged host changes.

Implementation paths:

- `services/api/src/archive/archiveProfileModel.js`
- `services/api/src/db/archiveProfileRepository.js`
- `services/api/test/archiveProfileModel.test.js`

## Acceptance

Phase 7.1 is accepted only when one unchanged candidate head passes:

1. the focused archive-profile qualification tests;
2. all applicable inherited CI/test gates, including Phase 6 Closure Qualification where triggered;
3. clean review state with no unresolved Critical/Important findings or review threads.

## Rollback

Phase 7.1 is isolated on its own branch/PR and can be reverted independently. It creates no archive files, moves no source files, activates no watcher archive behavior, provisions no production infrastructure, and does not change Phase 5 governance authority from L0 Advisory / Shadow Only.

## Next dependency

Only after Phase 7.1 acceptance may the project evaluate the next design stage: preview-only archive planning. Copy-only archive execution remains a separate later stage and requires its own explicit acceptance gate before any runtime archive mutation is enabled.
