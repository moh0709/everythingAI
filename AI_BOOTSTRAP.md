# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-09-14  
Current accepted state: Phase 6 Production Identity, Tenancy & Authorization Foundation dispatched (`PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS`)  
Latest accepted canonical state evidence synchronization reflected here: Phase 6.14 (#363 / PR #364), merge `5b9e10096b56db7b1546d9347474436dbd50dc46`

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

Phase 6 Production Identity, Tenancy & Authorization Foundation is accepted through:

- final unchanged closure candidate `6eef85c405a020feb30d239b4c55b26d747f0ccb`;
- #338 / PR #339;
- closure merge `71fd3627b783284bccf37f7628b86a8a78fb3c07`;
- `docs/PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_RELEASE_DECISION_2026-09-14.md`;
- `docs/HANDOVER_2026-09-14_PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION.json`.

Final closure evidence: 20/20 triggered workflows passed, including Phase 6 Closure Qualification #2 and CI Smoke #906. Final review had no review submissions or review threads.

Post-closure canonical evidence is synchronized through Phase 6.14 (#363 / PR #364). Its unchanged documentation-only candidate `7e7c7663a1a0e4253365e2f3513cba8639aa5b54` passed 22/22 triggered workflows, including CI Smoke #928, with zero review submissions and zero inline review comments, and merged as `5b9e10096b56db7b1546d9347474436dbd50dc46`.

Post-closure evidence corrections do not reopen Phase 6 for new runtime or product scope and do not expand production authority.

## Phase 6 capability boundary

Accepted foundations include:

- provider-neutral production authenticated-principal middleware boundary;
- tenant/workspace membership authorization;
- normalized roles and permission contracts;
- exact tenant/workspace resource-scope isolation;
- representative `documents.read` production permission/resource enforcement;
- optional tenant/workspace-bound device identity;
- trusted authorization-derived audit attribution;
- trusted audit propagation into representative action execution and undo evidence;
- integrated cross-tenant/cross-workspace denial, ambiguity/degraded-state, anti-spoofing and local-compatibility qualification.

## Production and governance authority boundary

Phase 6 does not authorize or perform:

- production IdP/device credential or secret provisioning;
- certificates/key material provisioning;
- privileged root/sudo/SSH/systemd operations;
- destructive production database/object-store migration or cutover;
- broad route-by-route authorization rollout beyond accepted representative enforcement;
- external certification/compliance commitments;
- production load qualification or commercial SLA/SLO commitments;
- provider lock-in;
- material automatic action/recovery/governance authority expansion.

Phase 5 remains **L0 Advisory / Shadow Only**. Phase 6 production-oriented authorization contracts do not silently activate Phase 5 governance enforcement.

## Accepted predecessor authority

- Phase 5 Governance Foundation — `PHASE5_GOVERNANCE_FOUNDATION_PASS`, merge `ddb9ed95422ca9bd4be9641a51fa16502aadd80e`.
- Phase 5.1 Governance Continuity — merge `2f8285c140936185bbe75b943b1dcf1acf28e16b`.
- Phase 4 Pre-production Recovery Qualification — `PHASE4_PREPRODUCTION_RECOVERY_QUALIFICATION_PASS`, merge `9f67ef1a58f9c3886d594bcd426d67fc6b4ebda1`.
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

Historical green evidence never substitutes for revalidating a changed candidate. Preserve the complete applicable inherited matrix. Phase 6-affecting work additionally runs `EverythingAI Phase 6 Closure Qualification` unless an accepted later decision explicitly supersedes it.

## Current next-step rule

Phase 6 is closed and must not be reopened for new product/runtime scope. Continue only bounded evidence-consistency corrections that preserve the accepted Phase 6 authority boundary. Post-Phase-6 product work belongs to its separately governed phase.

Material production-platform execution, secrets, privileged-host changes, destructive production cutover, external certification/load commitments, commercial SLA/SLO commitments, broad authorization rollout, or material automatic authority expansion remain separately CEO-gated.
