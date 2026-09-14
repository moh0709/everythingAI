# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-09-14  
Current accepted state: Phase 5 Governance Foundation dispatched (`PHASE5_GOVERNANCE_FOUNDATION_PASS`)  
Current canonical synchronization: #319

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

Phase 5 Governance Foundation is accepted through:

- final unchanged candidate `4050a2814f23e75adb6f31ebf2779dd0e4e6878d`;
- #317 / PR #318;
- merge `ddb9ed95422ca9bd4be9641a51fa16502aadd80e`;
- `docs/PHASE5_GOVERNANCE_FOUNDATION_RELEASE_DECISION_2026-09-14.md`;
- `docs/HANDOVER_2026-09-14_PHASE5_GOVERNANCE_FOUNDATION.json`.

Final candidate evidence: 23/23 applicable workflows passed, including Phase 5 Closure Qualification #9, CI Smoke #879, all fifteen inherited focused Product/Governed-Action workflows and all six applicable enterprise workflows. Final review had no unresolved Critical/Important findings or review threads.

## Phase 5 authority boundary

- Enforcement Level: L0.
- Mode: Advisory / Shadow Only.
- No new runtime mutation authority.
- No production runtime blocking.
- No automatic governance freeze or recovery activation.
- No automatic approval, execution, retry or undo.
- No privileged infrastructure/root/sudo/SSH/systemd authority.
- No production-secret or IdP provisioning authority.
- No destructive production database/object-store cutover authority.
- No provider lock-in.
- No external certification claim.
- No production load/SLA claim.

Controlled-enforcement artifacts remain governance foundations and are not production enforcement activation.

## Accepted predecessor authority

- Phase 5.1 Governance Continuity — merge `2f8285c140936185bbe75b943b1dcf1acf28e16b`, ADR-005-013 Accepted.
- Phase 4 Pre-production Recovery Qualification — `PHASE4_PREPRODUCTION_RECOVERY_QUALIFICATION_PASS`, merge `9f67ef1a58f9c3886d594bcd426d67fc6b4ebda1`.
- Phase 3 Enterprise Readiness Foundation — `ENTERPRISE_READINESS_FOUNDATION_PASS`.
- Phase 2 and all later accepted Product Depth/Product & UX trust milestones remain accepted historical authority.

The exact pre-closure canonical baseline and detailed historical authority remain pinned by `docs/PHASE5_CANONICAL_HISTORY_PRESERVATION_2026-09-14.md`; issue #69 remains untouched.

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

## Mandatory inherited product baseline

The fifteen accepted focused Product/Governed-Action workflows remain mandatory unless explicitly superseded. Historical green evidence never substitutes for revalidating a changed candidate.

Phase 3/4/5-affecting candidates additionally preserve applicable enterprise isolation, object storage, metadata migration planning, runtime health, backup/restore, capacity/security, dependency-security, recovery, Governance Continuity and Phase 5 Closure Qualification gates.

## Current next-step rule

Phase 5 is closed. Inspect the synchronized five-track roadmap and current repository issues before releasing the next bounded dependency. Do not infer a Phase 6 implementation scope solely from numbering or conversation title.

Material production-platform execution, authority expansion, secrets, privileged-host changes, destructive production cutover, external certification/load commitments or commercial SLA/SLO commitments remain separately CEO-gated.
