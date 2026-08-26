# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-26  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity dispatched (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`); Workspace Context Trust & Provenance dispatched (`WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`)  
Current gate: issue #232 post-dispatch canonical synchronization and next five-track decision package

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

- Phase 2: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Trustworthy Search: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Governed-Action Lifecycle: #162/#163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.
- Evidence/Search/Lifecycle/Recovery Comprehension: #198/#199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90`, `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity: #218/#219 merge `6cbb3c15de8cb5e9624c5fb164a2781790336298`, `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.
- Workspace Context Trust & Provenance: #230/#231 merge `dac62d9503d0b159d0997c224258e9bdb03a2473`, `WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`.

Workspace Context final release evidence:

- fresh candidate `209ad11c2a0a7602c14fb3313931ddd1f9de38c8`: CI #666; Workspace Context Provenance #5; Workspace Context Summary #9; Source Recovery Return Context #33; Multi-hop Return Context #26; Return Context Provenance #22 — all PASS;
- changed final decision head `ba96c37c9e4b4e45a7c21138b095c1add4fde53e`: CI #669; Workspace Context Provenance #8; Workspace Context Summary #12; Source Recovery Return Context #36; Multi-hop Return Context #29; Return Context Provenance #25 — all PASS;
- final independent review clean.

Current release authority documents:

- `docs/WORKSPACE_CONTEXT_TRUST_PROVENANCE_RELEASE_DECISION_2026-08-26.md`
- `docs/HANDOVER_2026-08-26_WORKSPACE_CONTEXT_TRUST_PROVENANCE_RELEASE.json`

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
- accepted focused workflows remain wired into the inherited baseline unless explicitly superseded.

## Mandatory inherited product regression baseline

For subsequent product/release work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth/Product & UX gates:

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
- focused `EverythingAI Workspace Context Provenance` acceptance;
- complete inherited CI matrix validation on the required unchanged candidate together with all applicable focused gates;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent final review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Historical green evidence never substitutes for validating a changed candidate. CI/focused-workflow wiring is part of the accepted baseline.

## Accepted safety boundaries

- backend-returned search order and match facts are preserved;
- source provenance and citation evidence remain authoritative;
- ranking signals are not calibrated confidence;
- frontend does not invent progress, completion, freshness, trust, retry, recovery success, or mutation facts;
- recovery remains source-root scoped under exact configured-root rules;
- selected source is navigation provenance only, never recovery or action scope;
- genuine query/page/source/return provenance is retained only where actually recorded;
- stale source IDs never select a substitute source;
- missing/stale page/source/history remains unknown or unavailable;
- direct navigation never fabricates history;
- explicit context clearing changes client navigation memory only and triggers no backend/file/recovery/Knowledge Base/governed-action/filesystem mutation;
- Workspace Context remains read-only and reports only genuinely known facts/provenance;
- governed planning, approval, execution, audit, undo, and filesystem safety boundaries remain unchanged.

## Current governance gate

Issue #232 is the sole active governance task. It records accepted `WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS` dispatch evidence in canonical state and prepares the next five-track decision package.

#232 does not authorize another product/runtime feature. It must remain documentation-only, preserve all accepted baseline workflows and rollback evidence, pass full inherited CI plus all five focused context workflows, and receive final documentation review before merge.

If accepted, release exactly one next bounded issue only after selecting a direction from the five-track package. The preferred safe continuation is **Context-Aware Task Resumption**, subject to separate inspection, exact acceptance criteria, and issue release.

## CEO-gated directions

Explicit CEO approval remains required before authentication/tenancy, cloud deployment, DB migration/object storage, privileged-host/systemd work, production-platform architecture execution, new routing architecture, automatic action/recovery/rebuild behavior, material connector/runtime expansion, or new semantic/provider architecture with material runtime/cost/trust implications.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. #232 is documentation-only and can be reverted independently from product/runtime code. All earlier accepted rollback evidence remains valid.
