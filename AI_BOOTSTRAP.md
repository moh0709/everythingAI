# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-25  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); bounded Product Depth milestones accepted through #190 recovery outcome interpretation/safe next-step guidance  
Current gate: issue #192 canonical synchronization and next bounded decision preparation

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current decision gate.
4. Inspect recent commits, open issues, open PRs, and relevant CI state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a source lookup fails, exhaust repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted evidence

- Phase 2 release: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Trustworthy-search release: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Governed-action lifecycle release: #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.
- Knowledge evidence/freshness guidance: #166 / PR #167 merge `9b41167f41b89ff6ae5a8deb7064c817bfb205fb`, CI #574.
- Search refinement/filtering: #170 / PR #171 merge `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce`, CI #579.
- Search refinement lifecycle/query-context clarity: #174 / PR #175 merge `6ba75a928b5d126a893ed7089d9c7a391b75ee02`, CI #584.
- Lifecycle-status refinement/processing-state clarity: #178 / PR #179 merge `48531f7d1ff843c6a23180b5331f3c05fd2df1da`, CI #595.
- Selected-source lifecycle next-step clarity: #182 / PR #183 merge `2c4b5596230b498a8fa20977bdf1790b13ff4955`, CI #600.
- Source-root recovery context/safe guidance: #186 / PR #187 merge `3f7c4a4f7ec6560b9b588d22a1e22a658d4bec49`, CI #604.
- Canonical synchronization: #188 / PR #189 merge `037a38f362b5619aa2706e16b22e7f91a7f59cd6`, CI #606.
- Recovery outcome interpretation/safe next-step guidance: #190 / PR #191 merge `da4fa079927f3d38dc6a3c444db5d93bbeca40c6`, unchanged head `e8a6e705cde81bf804cdaa45e5572860ee784eaa`, CI Smoke #611, final PM diff review clean.

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
- explainable unified-search acceptance;
- contextual-snippet acceptance;
- Knowledge Base search-navigation acceptance;
- source-inspection-navigation acceptance;
- trust-diagnostics-navigation acceptance;
- planning-selection-clarity acceptance;
- planning-preview-decision-clarity acceptance;
- execution/audit/undo outcome-clarity acceptance;
- knowledge-evidence/freshness-guidance acceptance;
- search-refinement/filtering acceptance;
- search-refinement lifecycle/query-context acceptance;
- lifecycle-status refinement/processing-state acceptance;
- selected-source lifecycle guidance acceptance;
- source-root recovery-context acceptance from #186;
- recovery-outcome guidance acceptance from #190;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent diff review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Historical green evidence never substitutes for validating a new candidate. CI wiring for accepted focused gates is part of the baseline.

## Product Depth safety boundaries

Current Product Depth work may improve existing local-first Client comprehension and inspection, but must preserve:

- backend-returned search order and existing match facts;
- source provenance and citation evidence;
- no presentation of ranking signals as calibrated confidence;
- no frontend invention of progress, completion, freshness, trust, retry, recovery success, or mutation facts;
- existing lifecycle semantics for indexing/extraction state;
- selected-source guidance derived only from accepted persisted lifecycle facts;
- source-root recovery as the only currently exposed recovery path for supported failure states;
- recovery-context inspection as read-only until the user explicitly invokes an existing control;
- persisted `indexed`, `skipped`, and `failed` scan outcomes remain semantically distinct;
- watcher state is monitoring evidence only, never recovery/extraction/Knowledge Base success;
- evidence must remain scoped to the root path it actually records;
- no per-file retry;
- governed planning, approval, audit, undo, and filesystem safety boundaries.

No authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd, automatic mutation/recovery/rebuild, or material connector/runtime expansion is authorized.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Current gate

Issue #192 is the sole active Product Depth governance task. It synchronizes accepted #190 evidence and must pass the full inherited matrix on one unchanged documentation candidate plus final documentation diff review before merge.

If #192 is accepted, the recommended next bounded milestone is **Recovery Evidence Scope Alignment & Context Clarity**, defined in `docs/PRODUCT_DEPTH_RECOVERY_EVIDENCE_SCOPE_ALIGNMENT_DECISION_GATE_2026-08-25.md`.

That recommendation is frontend/read-only and may compare only already available persisted root identities: configured recovery root, `scanReport.rootPath`, and watcher `rootPath`. When evidence is for a different root, the UI may explain the mismatch but must not reinterpret those counts/statuses as evidence for the active root. It must not infer freshness, health, progress, success, root cause, repair completion, or retry state; automatically scan/extract/rebuild/recover; redesign backend lifecycle/recovery; alter planning/mutation behavior; or expand Enterprise Platform/privileged-host scope.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. #192 is documentation-only and can be reverted independently from product/runtime code.
