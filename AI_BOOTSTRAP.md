# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-09-14  
Current accepted state: Phase 6 Production Identity, Tenancy & Authorization Foundation dispatched (`PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS`)  
Current canonical synchronization: Phase 6 finalization under #338

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read `docs/ROADMAP.md` and `docs/IMPLEMENTATION_ROADMAP.md`.
4. Read the newest accepted release decision/handover relevant to the active phase.
5. Inspect current GitHub commits, open issues/PRs and relevant CI state.
6. Confirm the next work is dependency-satisfied and within approved authority.
7. Define acceptance criteria, evidence, validation and rollback before implementation.

Repository state, exact SHAs, issue/PR state, workflow evidence and canonical authority files are source of truth.

## Current release authority

Phase 6 is accepted through:

- final unchanged closure candidate `6eef85c405a020feb30d239b4c55b26d747f0ccb`;
- closure issue #338 / PR #339;
- closure merge `71fd3627b783284bccf37f7628b86a8a78fb3c07`;
- `docs/PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_RELEASE_DECISION_2026-09-14.md`;
- `docs/HANDOVER_2026-09-14_PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION.json`.

Final candidate evidence: 20/20 triggered workflows passed, including Phase 6 Closure Qualification #2, CI Smoke #906, triggered focused Product/Governed-Action workflows and applicable enterprise isolation/storage/migration gates. Final review had no review submissions or review threads.

## Accepted Phase 6 foundation

The accepted production-oriented foundation includes authenticated-principal verification contracts, tenant/workspace membership authorization, roles/permissions, exact resource-scope isolation, representative `documents.read` enforcement, optional scope-bound device identity, trusted authorization-derived audit attribution and integrated fail-closed qualification.

## Production authority boundary

- No production secrets or real IdP/device credentials.
- No certificate/key provisioning.
- No privileged host/root/sudo/SSH/systemd authority.
- No destructive production database/object-store migration or cutover.
- No provider lock-in.
- No external certification/compliance claim.
- No production load/SLA/SLO claim.
- No broad route-by-route authorization rollout.
- No broad automatic action/recovery/governance authority expansion.
- Phase 5 governance remains L0 Advisory / Shadow Only.

## Accepted predecessor authority

- Phase 5 Governance Foundation — `PHASE5_GOVERNANCE_FOUNDATION_PASS`.
- Phase 5.1 Governance Continuity — merge `2f8285c140936185bbe75b943b1dcf1acf28e16b`.
- Phase 4 Pre-production Recovery Qualification — `PHASE4_PREPRODUCTION_RECOVERY_QUALIFICATION_PASS`.
- Phase 3 Enterprise Readiness Foundation — `ENTERPRISE_READINESS_FOUNDATION_PASS`.
- Phase 2 and accepted Product Depth/Product & UX trust milestones remain historical authority.

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
- **Forge/Hermes:** optional bounded executors only when explicitly released.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

## Execution lifecycle

`inspect → acceptance matrix → implement narrowly → test/CI → evaluate → fix → retest → independent review → accept/reject → merge/close → canonical verification → next dependency`

Rules:

- smallest coherent reversible change;
- preserve unrelated changes and historical evidence;
- no broad refactor without approved scope;
- no PASS while CI is pending;
- every final release decision refers to one unchanged candidate head;
- no unresolved Critical/Important findings or review threads at merge;
- truthful BLOCKED/REJECTED outcomes are valid;
- preserve explicit rollback boundaries.

## Mandatory inherited validation

Every changed product/release candidate must preserve the complete applicable inherited matrix. Phase 6-affecting candidates additionally run the focused Phase 6 qualification stack and dedicated Phase 6 Closure Qualification. Historical green evidence never substitutes for validating a changed candidate.

## Current next-step rule

Phase 6 is closed. Inspect current open repository dependencies and the synchronized five-track roadmap before releasing the next bounded milestone. Do not infer Phase 7 authority solely from numbering or conversation title.

Material production-platform execution, secrets, privileged-host changes, destructive production cutover, external certification/load commitments, commercial SLA/SLO commitments or material authority expansion remain separately CEO-gated.
