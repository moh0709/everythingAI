# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-09-18  
Current accepted state: Phase 9 AI Metadata Enrichment Controls Foundation dispatched (`PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS`).

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

Phase 9 AI Metadata Enrichment Controls Foundation is accepted through:

- parent issue #389;
- closure issue #398 / PR #399;
- unchanged closure candidate `14e32cbbb5cd154301a52f4bc86dcdd4e71ce331`;
- closure merge `d8cf36b3959d97efdd2b7689923cb94239a38e48`;
- `docs/PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_RELEASE_DECISION_2026-09-18.md`;
- `docs/HANDOVER_2026-09-18_PHASE9_AI_METADATA_ENRICHMENT_CONTROLS.json`.

Final closure evidence: 20/20 triggered workflows passed, including EverythingAI Phase 9 AI Metadata Enrichment Controls Closure Qualification #1 and CI Smoke #970. Final review had no review submissions or review threads.

## Phase 9 capability boundary

Accepted design Stage 8 capability includes:

- provider-neutral metadata enrichment policy and normalization;
- explicit profile-level enrichment enable/disable;
- bounded `summary`, `classification`, and `tags` fields;
- required field-level generator/evidence provenance;
- deterministic preview-plan enrichment identity;
- sidecar AI provenance and user-edit replacement provenance;
- Admin enrichment preference and provenance visibility.

The accepted Phase 9 foundation does not directly invoke an AI provider/model and adds no filesystem mutation, automatic approval/execution, overwrite, source mutation, or watcher-execution authority.

Design Stage 9 advanced document intelligence remains separately governed.

## Accepted Phase 8 authority

Phase 8 Watcher Integration & Stale Archive Preview Foundation remains accepted as `PHASE8_WATCHER_STALE_PREVIEW_PASS` through closure merge `c2398c9c5e4007fd7fbdc2f31561365cf93e5d58` and canonical synchronization merge `01f56476d76d8002793347d6868fe9f1e5ae0854`. Its watcher review/preview-only and no-execution boundaries remain inherited by Phase 9.

## Accepted Phase 7 authority

Phase 7 AI Organization Workspace Foundation remains accepted as `PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS` through closure merge `60a16f58321f599ed5f13b0319fbd712ba3e986a`. Its copy-first, no-overwrite, source-preserving and explicit-approval boundaries remain inherited by Phase 9.

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
- watcher-driven archive execution or automatic approval;
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

Historical green evidence never substitutes for revalidating a changed candidate. Preserve the complete applicable inherited matrix. Work affecting accepted Phase 9 enrichment contracts must run `EverythingAI Phase 9 AI Metadata Enrichment Controls Closure Qualification`. Phase 8 watcher-affecting work preserves `EverythingAI Phase 8 Watcher Stale Preview Closure Qualification`; Phase 7 foundation-affecting work preserves `EverythingAI Phase 7 Foundation Closure Qualification`; and Phase 6-affecting work preserves `EverythingAI Phase 6 Closure Qualification` unless explicitly superseded.

## Current next-step rule

Phase 9 is closed through design Stage 8. Design Stage 9 advanced document intelligence remains a separately governed dependency. Select subsequent work from synchronized repository priorities while preserving provider-neutral enrichment provenance/disable semantics, watcher review/preview-only behavior, explicit approval, copy-first/no-overwrite behavior, Client Workspace/Admin separation, and all production/governance safety boundaries above.
