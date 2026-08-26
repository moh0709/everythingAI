# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-26  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity dispatched (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`); Workspace Context Trust & Provenance dispatched (`WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`); Governed-Action Trust & Evidence release decision justified as `GOVERNED_ACTION_TRUST_EVIDENCE_PASS` pending changed-final-head validation and merge  
Current gate: issue #246 final release-decision validation

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current governance issue.
4. Inspect recent commits, open issues, open PRs, and relevant CI/workflow state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a lookup fails, exhaust repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted authority

- Phase 2: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Trustworthy Search: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Governed-Action Lifecycle: #162/#163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.
- Evidence/Search/Lifecycle/Recovery Comprehension: #198/#199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90`, `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity: #218/#219 merge `6cbb3c15de8cb5e9624c5fb164a2781790336298`, `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.
- Workspace Context Trust & Provenance: #230/#231 merge `dac62d9503d0b159d0997c224258e9bdb03a2473`, `WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`.
- Context-Aware Task Resumption: #234/#235 merge `adf1cf0fb494010905396aaa8a63de1a668bf435`; unchanged head `a138af5008283e57806ebea0e782c986d0a75308`; CI #675 plus six focused workflows PASS.
- Governed-Action Preview & Audit Comprehension: #238/#239 merge `cb80bc71ea9e29cd5f1a0ed3d5c5a8b8fb05fefa`; unchanged head `82a2ccca97f7cdf106bd39977a1491f01c2f7869`; strict RED→GREEN; CI #680 plus seven focused workflows PASS.
- Governed-Action Evidence Navigation: #242/#243 merge `e0a1c54bf72204f0a3262ddded7545c8f6c69b33`; strict RED→GREEN; unchanged head `8434bee4f1de4b558ac1643a6c342df6f8f21b95`; CI #685 plus eight focused workflows PASS.
- Governed-Action tranche synchronization: #244/#245 merge `149bf47a2fb43135a426d71de376eb5e5acb4d2f`; CI #689 plus all eight focused workflows PASS; final documentation review clean.

## Current Governed-Action release authority evidence

Fresh unchanged release candidate: `4179b26af624398554166f0256ad6bc2495d4d1b`.

- EverythingAI CI Smoke #691 — PASS;
- Source Recovery Return Context #58 — PASS;
- Multi-hop Return Context #51 — PASS;
- Return Context Provenance #47 — PASS;
- Workspace Context Summary #34 — PASS;
- Workspace Context Provenance #30 — PASS;
- Context-Aware Task Resumption #19 — PASS;
- Governed-Action Comprehension #13 — PASS;
- Governed-Action Evidence Navigation #8 — PASS;
- independent release review — no unresolved Critical or Important findings.

Decision artifacts now present on PR #247:

- `docs/GOVERNED_ACTION_TRUST_EVIDENCE_RELEASE_DECISION_2026-08-26.md`
- `docs/HANDOVER_2026-08-26_GOVERNED_ACTION_TRUST_EVIDENCE_RELEASE.json`

The decision is `GOVERNED_ACTION_TRUST_EVIDENCE_PASS`, but dispatch remains merge-gated. The changed final decision head must itself pass full CI plus all eight focused workflows before merge.

## Program tracks

Maintain five separate tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently treat Enterprise Platform, privileged-host work, or material runtime expansion as authorized by Product & UX progress.

## Roles

- **CEO / Product Owner:** final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing authority.
- **ChatGPT:** PM/release authority; architecture/dependency ordering; acceptance/rejection; authorized direct implementation of bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

Implementation and acceptance evidence remain distinct. No executor may invent or self-certify missing evidence.

## Execution lifecycle

`inspect → acceptance matrix → implement narrowly → test/CI → evaluate → improve → retest → independent diff review → accept/reject → merge/close → release next dependency`

Rules:

- exactly one dependency-satisfied implementation task per queue;
- smallest coherent reversible change;
- no destructive Git operations or history rewriting;
- preserve unrelated changes;
- no broad refactor without approved scope;
- no PASS without independently reviewable evidence;
- truthful BLOCKED outcomes are valid;
- every accepted milestone records exact commit/merge, validation, risks, and rollback;
- accepted focused workflows remain wired into the inherited baseline unless explicitly superseded.

## Mandatory inherited product regression baseline

For subsequent product/release work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth/Product & UX gates: root regression; backend tests; frontend typecheck/build; Client/Admin smoke; all accepted citation/search/navigation/lifecycle/recovery/planning/execution/audit/undo acceptance; disposable-folder RC; UI-governed planning → preview → approval → execution → audit → undo; independent final review; and milestone-scoped rollback evidence.

The focused workflow baseline contains eight mandatory workflows:

1. `EverythingAI Source Recovery Return Context`;
2. `EverythingAI Multi-hop Return Context`;
3. `EverythingAI Return Context Provenance`;
4. `EverythingAI Workspace Context Summary`;
5. `EverythingAI Workspace Context Provenance`;
6. `EverythingAI Context-Aware Task Resumption`;
7. `EverythingAI Governed-Action Comprehension`;
8. `EverythingAI Governed-Action Evidence Navigation`.

Historical green evidence never substitutes for validating a changed candidate. CI/focused-workflow wiring is part of the accepted baseline.

## Accepted safety boundaries

- authoritative backend-returned search, execution, audit, and persisted action states are preserved;
- preview remains proposal-only; ready state requires explicit execution approval; blocked reasons remain backend-authoritative;
- executed, failed, and undone remain distinct persisted states;
- evidence navigation is read-only and may target only genuine matching audit evidence already present in the loaded audit window;
- a missing match is scoped only to the loaded audit window and is never proof that no audit exists elsewhere;
- evidence navigation must not trigger a backend query merely to manufacture a match;
- no new backend/API/schema/persistence/routing architecture, action scope, automatic approval/execution/retry/recovery/undo, or filesystem mutation is authorized;
- existing context, recovery, task-resumption, planning, approval, audit, undo, and filesystem safety boundaries remain unchanged;
- stale/missing context remains unknown or unavailable rather than inferred.

## Current governance gate

Issue #246 has passed its fresh tranche candidate gate and independent release review. The release decision and handover have been written.

The sole next dependency is changed-final-head validation on PR #247. That unchanged final decision head must pass:

1. EverythingAI CI Smoke;
2. Source Recovery Return Context;
3. Multi-hop Return Context;
4. Return Context Provenance;
5. Workspace Context Summary;
6. Workspace Context Provenance;
7. Context-Aware Task Resumption;
8. Governed-Action Comprehension;
9. Governed-Action Evidence Navigation.

If all pass and final documentation review remains clean, merge PR #247, close #246 completed, and dispatch `GOVERNED_ACTION_TRUST_EVIDENCE_PASS`. Do not automatically release another product feature after dispatch.

## CEO-gated directions

Explicit CEO approval remains required before authentication/tenancy, cloud deployment, DB migration/object storage, privileged-host/systemd work, production-platform architecture execution, new routing architecture, automatic action/recovery/rebuild behavior, material connector/runtime expansion, new backend/API/schema/persistence expansion, or new semantic/provider architecture with material runtime/cost/trust implications.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. #246 release-decision/canonical synchronization is documentation-only and can be reverted independently. #242 remains independently reversible through merge `e0a1c54bf72204f0a3262ddded7545c8f6c69b33`; #238 remains independently reversible through merge `cb80bc71ea9e29cd5f1a0ed3d5c5a8b8fb05fefa`; all earlier accepted rollback evidence remains valid.
