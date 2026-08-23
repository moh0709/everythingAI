# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-23  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`)  
Current gate: issue #134 canonical reconciliation

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover.
4. Inspect recent commits, open issues, open PRs, and relevant CI state.
5. Confirm the next work is dependency-satisfied and within already approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a source lookup fails, use available repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current program model

Maintain five separately named tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not infer the active program state from an old phase label. The accepted current product state is Phase 2 complete and dispatched at merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`.

## Roles

- **CEO / Product Owner:** final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing decisions.
- **ChatGPT:** PM/release authority; architecture/dependency ordering; acceptance/rejection; authorized direct implementation of bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

Implementation and acceptance evidence must remain distinguishable. No executor may invent or self-certify missing evidence.

## Execution lifecycle

Use this loop:

`inspect → acceptance matrix → implement narrowly → test/CI → evaluate → improve → retest → independent diff review → accept/reject → merge/close → release next dependency`

Rules:

- exactly one dependency-satisfied implementation task per queue;
- smallest coherent reversible change;
- no destructive Git operations or history rewriting;
- preserve unrelated changes;
- no broad refactor without approved scope;
- no PASS without independently reviewable evidence;
- truthful BLOCKED outcomes are valid;
- every accepted milestone records exact commit/merge, validation, risks, and rollback.

## Mandatory inherited product regression baseline

For subsequent product work, preserve all applicable accepted Phase 1 + Phase 2 gates:

- root regression;
- backend tests;
- frontend typecheck;
- frontend production build;
- Client/Admin Playwright smoke;
- rich-citation/source-highlighting acceptance;
- long-form/table rendering acceptance;
- grouped-planning/bulk-selection acceptance;
- API-key lifecycle acceptance;
- disposable-folder release-candidate acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent diff review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Tests passing on an older commit do not prove a new candidate.

## Current scope gates

No new major implementation phase is authorized by Phase 2 completion alone.

The following require explicit CEO approval before implementation release because they materially expand scope or operational authority:

- authentication/identity architecture;
- tenancy/workspaces as production infrastructure;
- cloud deployment;
- database migration to a production platform;
- object storage;
- production infrastructure rollout;
- privileged-host/systemd operations;
- other material architecture or commercial-scope changes.

Documentation reconciliation, issue triage, bounded QA, evidence synchronization, and similarly reversible governance work may proceed autonomously.

## Issue #69

Issue #69 is closed completed historical evidence. Read it when relevant, but do not rewrite its historical acceptance record unless a newly discovered factual inconsistency requires explicit CEO review.

## Current task

Issue #134 is the sole active reconciliation task. It is documentation-only and must not change product/runtime behavior. Finish it with a clean diff review, merge, close, then prepare the next-phase decision gate without silently starting the next major implementation phase.

## Evidence authority

Current Phase 2 release evidence:

- `docs/PHASE2_RELEASE_DECISION_2026-08-23.md`
- `docs/HANDOVER_2026-08-23_PHASE2_RELEASE_DECISION.json`
- merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`

Historical pre-reconciliation bootstrap is preserved exactly at:

`docs/archive/2026-08-23-pre-phase2-reconciliation/AI_BOOTSTRAP.md`

The archive remains evidence, not current operating authority.
