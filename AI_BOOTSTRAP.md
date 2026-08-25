# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-25  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); bounded Product Depth trustworthy-search, governed-action lifecycle, knowledge evidence/freshness guidance, search refinement/filtering, search refinement lifecycle, and lifecycle-status refinement accepted  
Current gate: issue #180 canonical synchronization and next bounded decision preparation

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current decision gate.
4. Inspect recent commits, open issues, open PRs, and relevant CI state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a source lookup fails, use available repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted evidence

- Phase 2 release: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Product Depth trustworthy-search release: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Product Depth governed-action lifecycle release: #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final unchanged-head CI #568.
- Knowledge evidence/freshness guidance: #166 / PR #167 merge `9b41167f41b89ff6ae5a8deb7064c817bfb205fb`, CI #574.
- Search refinement/filtering: #170 / PR #171 merge `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce`, CI #579.
- Search refinement lifecycle/query-context clarity: #174 / PR #175 merge `6ba75a928b5d126a893ed7089d9c7a391b75ee02`, final unchanged-head CI #584 on `4bdc4823917f9249eb9bb23528741e2a2e9faa43`.
- Canonical synchronization #176 / PR #177 merge `1b103e614ba117cdf8b5e2e08cd39eebc5bdeb2e`, final unchanged-head CI #590.
- Lifecycle-status refinement/processing-state clarity: #178 / PR #179 merge `48531f7d1ff843c6a23180b5331f3c05fd2df1da`, final unchanged head `0fd7b5638b142cddd1ce5f4f1795839d50eb583a`, final CI Smoke #595. The final candidate restored and passed the inherited #174 lifecycle browser gate before acceptance.

## Program tracks

Maintain five separately named tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently treat Enterprise Platform or privileged-host work as authorized by Product Depth progress.

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
- every accepted milestone records exact commit/merge, validation, risks, and rollback;
- previously accepted focused browser gates must remain wired into CI unless explicitly superseded by an accepted decision.

## Mandatory inherited product regression baseline

For subsequent product work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth gates:

- root regression;
- backend tests;
- frontend typecheck;
- frontend production build;
- Client/Admin Playwright smoke;
- rich-citation/source-highlighting acceptance;
- long-form/table rendering acceptance;
- grouped-planning/bulk-selection acceptance;
- API-key lifecycle acceptance;
- Product Depth explainable unified-search acceptance;
- Product Depth contextual-snippet acceptance;
- Product Depth Knowledge Base search-navigation acceptance;
- Product Depth source-inspection-navigation acceptance;
- Product Depth trust-diagnostics-navigation acceptance;
- Product Depth planning-selection-clarity acceptance;
- Product Depth planning-preview-decision-clarity acceptance;
- Product Depth execution/audit/undo outcome-clarity acceptance;
- Product Depth knowledge-evidence/freshness-guidance acceptance;
- Product Depth search-refinement/filtering acceptance;
- Product Depth search-refinement lifecycle/query-context acceptance;
- Product Depth lifecycle-status refinement/processing-state acceptance;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent diff review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Historical green evidence never substitutes for validating a new candidate.

## Product Depth safety boundaries

Current Product Depth work may improve existing local-first Client comprehension and inspection, but must preserve:

- backend-returned search order and existing match facts;
- source provenance and citation evidence;
- no presentation of ranking signals as calibrated confidence;
- no frontend invention of progress, completion, freshness, trust, retry, recovery, or mutation facts;
- existing `deriveSourceLifecycle` semantics for indexing/extraction state;
- source-root recovery as the only recovery path currently exposed when that derived lifecycle explicitly allows it;
- governed planning, approval, audit, undo, and filesystem safety boundaries.

No authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd, automatic mutation/recovery/rebuild, or material connector/runtime expansion is authorized.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Current gate

Issue #180 is the sole active Product Depth governance task. It synchronizes the accepted #178 state and must pass the full inherited matrix on one unchanged documentation candidate plus final documentation diff review before merge.

If #180 is accepted, the recommended next bounded milestone is **Selected-Source Lifecycle Next-Step Clarity**, defined in `docs/PRODUCT_DEPTH_SELECTED_SOURCE_LIFECYCLE_DECISION_GATE_2026-08-25.md`.

That recommendation is frontend/read-only except for reusing already accepted source-root recovery navigation. It does not authorize per-file retry, automatic scanning/extraction/recovery, backend lifecycle redesign, search-ranking changes, new confidence/freshness/provenance calculations, Enterprise Platform work, or privileged-host operations.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. Governance/documentation synchronization is reverted independently from product/runtime code. Preserve exact CI and final-head evidence before claiming acceptance.
