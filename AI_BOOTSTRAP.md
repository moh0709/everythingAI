# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-25  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity dispatched (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`)  
Current gate: issue #220 canonical synchronization and next five-track governance decision

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current decision gate.
4. Inspect recent commits, open issues, open PRs, and relevant CI state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a source lookup fails, exhaust repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted release authority

- Phase 2 release: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Trustworthy Search release: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Governed-Action Lifecycle release: #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.
- Evidence/Search/Lifecycle/Recovery Comprehension release: #198 / PR #199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90`, status `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity release: #218 / PR #219 merge `6cbb3c15de8cb5e9624c5fb164a2781790336298`, status `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.

Cross-Surface release validation:

- fresh unchanged candidate `aa735fca42a4c64411188c6b41b69efb44adcb12` — CI Smoke #652 PASS;
- Source Recovery Return Context run #19 PASS;
- Multi-hop Return Context run #12 PASS;
- Return Context Provenance run #8 PASS;
- final decision head `ad821eac4bf1b61aa932c2bed7e00ca018977398` — CI Smoke #654 PASS;
- Source Recovery Return Context run #21 PASS;
- Multi-hop Return Context run #14 PASS;
- Return Context Provenance run #10 PASS;
- final release review clean: no unresolved Critical or Important findings.

Current release authority documents:

- `docs/CROSS_SURFACE_CONTEXT_CONTINUITY_RELEASE_DECISION_2026-08-25.md`
- `docs/HANDOVER_2026-08-25_CROSS_SURFACE_CONTEXT_CONTINUITY_RELEASE.json`

Current governance decision package:

- `docs/NEXT_FIVE_TRACK_GOVERNANCE_OPTIONS_2026-08-25.md`

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
- previously accepted focused browser gates remain wired into CI unless explicitly superseded by an accepted decision.

## Mandatory inherited product regression baseline

For subsequent product/release work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth gates:

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
- contextual-search-snippet acceptance;
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
- source-root recovery-context acceptance;
- recovery-outcome guidance acceptance including exact-root, mismatched-root, no-configured-root, and missing-evidence scenarios;
- cross-surface context-continuity acceptance;
- focused `EverythingAI Source Recovery Return Context` acceptance;
- focused `EverythingAI Multi-hop Return Context` acceptance;
- focused `EverythingAI Return Context Provenance` acceptance;
- complete inherited CI matrix validation on the required unchanged candidate together with the focused gates;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent final review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Historical green evidence never substitutes for validating a new candidate. CI wiring for accepted focused gates is part of the baseline.

## Accepted safety boundaries

Product Depth remains local-first and bounded:

- backend-returned search order and existing match facts are preserved;
- source provenance and citation evidence remain authoritative;
- ranking signals are not presented as calibrated confidence;
- frontend does not invent progress, completion, freshness, trust, retry, recovery success, or mutation facts;
- lifecycle semantics remain based on persisted indexing/extraction state;
- recovery remains source-root scoped and uses only configured Folder Path plus persisted scan/watcher evidence under exact-root rules;
- no per-file retry is introduced;
- governed planning, approval, execution, audit, undo, and filesystem safety boundaries remain unchanged.

Cross-Surface Context Continuity additionally preserves:

- only genuine Knowledge Base/source/recovery provenance is remembered;
- current query is retained only where actually recorded;
- direct navigation does not fabricate return history;
- stale source IDs never select a substitute source;
- missing/stale page/source/history remains unknown or unavailable;
- selected source is navigation provenance only, never recovery scope;
- recovery remains source-root scoped;
- explicit context clearing changes client navigation memory only and triggers no backend, file, recovery, Knowledge Base, governed action, or filesystem mutation;
- existing Client Workspace identifiers/state are used;
- no new routing architecture or backend intelligence was introduced by the dispatched tranche.

## Current governance gate

Issue #220 is the sole active governance task. It synchronizes `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS` into canonical startup/roadmap state and prepares the next five-track decision without authorizing implementation merely by synchronization.

Preferred bounded local-first Product & UX option after #220 acceptance:

**Workspace Context Summary & Safe Return Map** — a read-only summary of genuinely recorded current query, valid selected source, recorded originating Knowledge Base page, recovery-root identity, and available explicit return targets, using existing Client Workspace state only.

This recommendation is not implementation authorization. A separate issue must define exact behavior, acceptance, unchanged-head validation, and rollback before code changes begin.

Knowledge & Safe Action alternative: evidence-to-action traceability review using existing provenance only, without changing policy, confidence, approval, execution, undo, or mutation semantics.

Governance alternative: release-evidence automation hardening that improves evidence collection/detection without weakening gates or changing runtime behavior.

CEO-gated directions remain:

- authentication or tenancy;
- cloud deployment;
- database migration or object storage;
- privileged-host/systemd work;
- production-platform architecture execution;
- new routing architecture;
- automatic action/recovery/rebuild behavior;
- material connector/runtime expansion;
- new semantic/provider architecture with material runtime, cost, or trust implications.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. #220 is documentation-only and can be reverted independently from product/runtime code. All earlier milestone rollback evidence remains valid.
