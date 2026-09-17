# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-09-17  
Current accepted state: Phase 7 AI Organization Workspace Foundation dispatched (`PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS`).

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read `docs/ROADMAP.md` and `docs/IMPLEMENTATION_ROADMAP.md`.
4. Read the newest accepted release decision/handover relevant to the active phase.
5. Inspect current GitHub commits, open issues/PRs and relevant CI state.
6. Confirm the next work is dependency-satisfied and within approved authority.
7. Define acceptance criteria, evidence, validation and rollback before implementation.

Repository state, exact SHAs, issue/PR state, workflow evidence and canonical authority files are the source of truth. Do not trust a handover blindly.

## Current release authority

Phase 7 AI Organization Workspace Foundation is accepted through:

- parent issue #343;
- closure issue #369 / PR #372;
- unchanged closure candidate `e613143b58a9d2048b5c1291baa68828881c0512`;
- closure merge `60a16f58321f599ed5f13b0319fbd712ba3e986a`;
- `docs/PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_RELEASE_DECISION_2026-09-16.md`;
- `docs/HANDOVER_2026-09-16_PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION.json`.

Final closure evidence: 20/20 triggered workflows passed, including EverythingAI Phase 7 Foundation Closure Qualification #2 and CI Smoke #936. Final review had no review submissions or review threads.

## Phase 7 capability boundary

Accepted foundation through AI Organization Workspace design Stages 2–6 includes:

- validated archive-profile settings and local persistence;
- deterministic preview-only organization planning;
- explicit-approval copy-only archive execution;
- source fingerprint verification and no-overwrite archive creation;
- provenance-rich metadata sidecars with sensitive-field exclusion;
- Admin/operator archive review workspace foundation with conflict visibility, evidence refs and local approval intent only.

Stages 7–9 remain deferred:

- Stage 7 watcher integration;
- Stage 8 AI enrichment improvements;
- Stage 9 advanced document intelligence.

Phase 7 does not authorize watcher-driven archive writes, automatic approval/execution, source delete/move/rename, archive overwrite, direct execution from the Admin review workspace, privileged production infrastructure, real production secrets, destructive production migration/cutover, external certification/load commitments, commercial SLA/SLO commitments, or material automatic governance/action/recovery expansion.

## Accepted Phase 7 chain

- Phase 7.1 — Archive Profile Model — PR #345 merge `c9b654be42b72a5f44b3972c37733802614791bc`.
- Phase 7.2 — Preview-only Archive Planner — PR #349 merge `c53f2cde8692e11bbc9c00542767a8188f5efd10`.
- Phase 7.3 — Copy-only Archive Executor — PR #351 merge `40fc5ac13c6311f78146d0b9e9ab812fd62757ef`.
- Phase 7.4 — Metadata Sidecar Writer — PR #353 merge `3662d8eb48f77bf071b625cf380a378b482cf8c2`.
- Phase 7.5 — Admin Archive Review Workspace — PR #358 merge `01c2901882c36885979e077e584701f28e381ff2`.
- Phase 7.6 — Foundation Closure Qualification — PR #372 merge `60a16f58321f599ed5f13b0319fbd712ba3e986a`.

## Accepted Phase 6 authority

Phase 6 Production Identity, Tenancy & Authorization Foundation remains accepted as `PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS` through closure merge `71fd3627b783284bccf37f7628b86a8a78fb3c07` and accepted post-closure evidence maintenance through Phase 6.15 merge `92d56c501e82050e6de83aa6d70fccc8e62e3f1c`.

Accepted Phase 6 foundations include provider-neutral authenticated principals, tenant/workspace membership, normalized roles/permissions, exact resource-scope isolation, representative `documents.read` enforcement, optional device identity, trusted audit attribution and integrated fail-closed/local compatibility qualification.

## Production and governance authority boundary

The following remain separately CEO-gated:

- production IdP/device credential or secret provisioning;
- certificates/key material provisioning;
- privileged root/sudo/SSH/systemd operations;
- destructive production database/object-store migration or cutover;
- broad route-by-route authorization rollout beyond accepted representative enforcement;
- watcher-driven archive mutation or automatic approval/execution;
- source delete/move/rename or archive overwrite authority;
- external certification/compliance commitments;
- production load qualification or commercial SLA/SLO commitments;
- provider lock-in;
- material automatic action/recovery/governance authority expansion.

Phase 5 remains **L0 Advisory / Shadow Only**. Later accepted phases do not silently activate Phase 5 governance enforcement.

## Accepted predecessor authority

- Phase 6 — `PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS`.
- Phase 5 Governance Foundation — `PHASE5_GOVERNANCE_FOUNDATION_PASS`, merge `ddb9ed95422ca9bd4be9641a51fa16502aadd80e`.
- Phase 5.1 Governance Continuity — merge `2f8285c140936185bbe75b943b1dcf1acf28e16b`.
- Phase 4 Pre-production Recovery Qualification — `PHASE4_PREPRODUCTION_RECOVERY_QUALIFICATION_PASS`.
- Phase 3 Enterprise Readiness Foundation — `ENTERPRISE_READINESS_FOUNDATION_PASS`.
- Phase 2 and later accepted Product Depth/Product & UX trust milestones remain accepted historical authority.

## Program tracks

Maintain five separate tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently convert progress in one track into authority in another.

## Roles

- **CEO / Product Owner:** final authority for material business, strategic, architectural, security/legal and materially scope-changing decisions.
- **ChatGPT:** CTO/PM/release gatekeeper and engineering executor for bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

## Execution lifecycle

`inspect → acceptance matrix → implement narrowly → test/CI → evaluate → fix → retest → independent diff/security/governance review → accept/reject → merge/close → canonical verification → next dependency`

Rules:

- smallest coherent reversible change;
- preserve unrelated changes and historical evidence;
- no broad refactor without approved scope;
- no PASS while CI is pending;
- every final release decision refers to one unchanged candidate head;
- no unresolved Critical/Important findings or review threads at merge;
- truthful BLOCKED/REJECTED outcomes are valid;
- preserve explicit rollback boundaries;
- accepted focused workflows remain inherited unless explicitly superseded.

## Mandatory inherited validation

Historical green evidence never substitutes for revalidating a changed candidate. Preserve the complete applicable inherited matrix. Work affecting accepted Phase 7 foundation contracts must run `EverythingAI Phase 7 Foundation Closure Qualification`. Phase 6-affecting work additionally preserves `EverythingAI Phase 6 Closure Qualification` unless an accepted later decision explicitly supersedes it.

## Current next-step rule

Phase 7 Foundation is closed through Stage 6. Stages 7–9 are future separately governed dependencies, not implied authority. Select subsequent work from synchronized repository priorities and dependency readiness while preserving explicit approval, copy-first/no-overwrite behavior, Client Workspace/Admin separation, and all production/governance safety boundaries above.
