# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-26  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity dispatched (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`); Workspace Context Summary #222 accepted  
Current gate: issue #224 canonical synchronization and next bounded governance gate

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current governance issue.
4. Inspect recent commits, open issues, open PRs, and relevant CI/workflow state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a lookup fails, exhaust repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted release authority

- Phase 2 release: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Trustworthy Search: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Governed-Action Lifecycle: #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.
- Evidence/Search/Lifecycle/Recovery Comprehension: #198 / PR #199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90`, `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity: #218 / PR #219 merge `6cbb3c15de8cb5e9624c5fb164a2781790336298`, `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.
- Post-dispatch canonical sync: #220 / PR #221 merge `dcffd7e9648e37784b91db9852f628e09bed3ee4`, CI #656 plus all three focused return-context workflows.
- Workspace Context Summary & Safe Return Map: #222 / PR #223 merge `17195747cb4fed58202992a0907816696b3ca3e1`; unchanged head `598bbd007547644380c18b880513f695fd49f147`; CI #658 PASS; Workspace Context Summary #1 PASS; Source Recovery Return Context #25 PASS; Multi-hop Return Context #18 PASS; Return Context Provenance #14 PASS; final independent review clean.

Current release authority documents:

- `docs/CROSS_SURFACE_CONTEXT_CONTINUITY_RELEASE_DECISION_2026-08-25.md`
- `docs/HANDOVER_2026-08-25_CROSS_SURFACE_CONTEXT_CONTINUITY_RELEASE.json`

## Program tracks

Maintain five separate tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently treat Enterprise Platform, privileged-host work, or material runtime expansion as authorized by Product Depth progress.

## Roles

- **CEO / Product Owner:** final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing authority.
- **ChatGPT:** PM/release authority; architecture/dependency ordering; acceptance/rejection; authorized direct implementation of bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

Implementation and acceptance evidence remain distinct. No executor may invent or self-certify missing evidence.

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
- previously accepted focused workflows remain wired into the inherited baseline unless explicitly superseded.

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
- focused `EverythingAI Workspace Context Summary` acceptance;
- complete inherited CI matrix validation on the required unchanged candidate together with all applicable focused gates;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent final review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Historical green evidence never substitutes for validating a changed candidate. CI/focused-workflow wiring is part of the accepted baseline.

## Accepted safety boundaries

Product Depth and Product & UX remain local-first and bounded:

- backend-returned search order and match facts are preserved;
- source provenance and citation evidence remain authoritative;
- ranking signals are not presented as calibrated confidence;
- frontend does not invent progress, completion, freshness, trust, retry, recovery success, or mutation facts;
- lifecycle semantics remain based on persisted indexing/extraction state;
- recovery remains source-root scoped and uses configured Folder Path plus persisted scan/watcher evidence under exact-root rules;
- no per-file retry is introduced;
- selected source is navigation provenance only, never recovery scope;
- genuine query/page/source/return provenance is retained only where actually recorded;
- direct navigation never fabricates history;
- stale source IDs never select a substitute source;
- missing/stale page/source/history remains unknown or unavailable;
- explicit context clearing changes client navigation memory only and triggers no backend/file/recovery/Knowledge Base/governed-action/filesystem mutation;
- governed planning, approval, execution, audit, undo, and filesystem safety boundaries remain unchanged.

Workspace Context Summary #222 additionally guarantees:

- summary is read-only;
- only genuinely known query, valid selected source, recorded Knowledge Base origin, configured source root, and genuine safe-return target are shown;
- stale selected-source state is unavailable rather than substituted;
- missing context stays unknown/unavailable rather than inferred;
- summary display triggers no backend or mutation action;
- existing Client Workspace identifiers/state are used; no backend or routing architecture was added.

## Current governance gate

Issue #224 is the sole active governance task. It synchronizes accepted #222 evidence into canonical startup/roadmap state and adds `EverythingAI Workspace Context Summary` to the mandatory focused regression baseline.

After #224 acceptance, exactly one bounded option is recommended:

**Workspace Context Provenance & Unknown-State Explanations** — enhance the existing read-only Workspace Context Summary so each displayed fact identifies its genuine client-side origin and unavailable facts explain why they are unknown, using existing Client Workspace state only.

This recommendation is not implementation authorization. A separate issue must define exact behavior, acceptance, unchanged-head validation, focused workflow coverage, and rollback before code changes begin.

## CEO-gated directions

Explicit CEO approval remains required before:

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

Every accepted milestone remains independently reversible by its recorded merge. #224 is documentation-only and can be reverted independently from product/runtime code. All earlier accepted rollback evidence remains valid.