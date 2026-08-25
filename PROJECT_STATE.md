# EverythingAI — Canonical Project State

Date: 2026-08-25  
Authority: current accepted repository state after Cross-Surface Context Continuity dispatch  
Current governance issue: #220

## Current program stage

**Phase 2 — Product Intelligence & Knowledge Experience is COMPLETE AND DISPATCHED (`PHASE2_PASS`).**

**Product Depth — Evidence, Search, Lifecycle & Recovery Comprehension is COMPLETE AND DISPATCHED (`PRODUCT_DEPTH_COMPREHENSION_PASS`).**

**Cross-Surface Context Continuity is COMPLETE AND DISPATCHED (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`).**

Accepted Cross-Surface Context Continuity release merge: `6cbb3c15de8cb5e9624c5fb164a2781790336298` through #218 / PR #219.

Fresh release evidence:

- fresh unchanged release candidate `aa735fca42a4c64411188c6b41b69efb44adcb12` — CI Smoke #652 PASS;
- on that same candidate: `EverythingAI Source Recovery Return Context` run #19 PASS;
- `EverythingAI Multi-hop Return Context` run #12 PASS;
- `EverythingAI Return Context Provenance` run #8 PASS;
- final release-decision head `ad821eac4bf1b61aa932c2bed7e00ca018977398` — CI Smoke #654 PASS;
- on that final decision head: Source Recovery Return Context run #21 PASS, Multi-hop Return Context run #14 PASS, Return Context Provenance run #10 PASS;
- final release review — no unresolved Critical or Important findings;
- release decision: `docs/CROSS_SURFACE_CONTEXT_CONTINUITY_RELEASE_DECISION_2026-08-25.md`;
- handover: `docs/HANDOVER_2026-08-25_CROSS_SURFACE_CONTEXT_CONTINUITY_RELEASE.json`.

Issue #220 is documentation-only canonical synchronization and preparation of the next five-track governance decision. It does not authorize another product feature or any material architecture expansion.

## Authority order

1. Explicit Product Owner / CEO decisions.
2. Accepted PM/release decisions and GitHub acceptance evidence.
3. This `PROJECT_STATE.md`.
4. `AI_BOOTSTRAP.md`.
5. Current roadmaps and accepted architecture/runbooks.
6. Accepted handovers, reports, logs, tests, commits, and runtime evidence.
7. Unaccepted implementation artifacts.

Implementation completion alone is never acceptance.

## Program tracks

| Track | Accepted position | Current gate |
|---|---|---|
| Product and UX | Local MVP release-hardened; Phase 2, Product Depth comprehension, and Cross-Surface Context Continuity dispatched | #220 five-track decision package; preferred bounded option is Workspace Context Summary & Safe Return Map, but implementation requires a separate released issue |
| Knowledge and Safe Action | Source-backed reading, explainable search, lifecycle/recovery guidance, governed planning/execution/audit/undo, and truthful navigation provenance accepted | Preserve evidence and action-scope semantics; any next traceability improvement requires a separate issue |
| Enterprise Platform | Architecture remains future scope | CEO approval required before auth, tenancy, cloud deployment, DB migration, object storage, or production-platform implementation |
| Engineering Operations | Reliability/host work remains separate | Explicit business priority plus required privileged-host authority before live infrastructure work |
| Governance and Autonomous Delivery | Dependency-ordered issue → implementation → CI → review → merge loop proven | Preserve exact unchanged-head evidence, inherited CI wiring, rollback, and truthful blocker discipline |

Next-direction decision package: `docs/NEXT_FIVE_TRACK_GOVERNANCE_OPTIONS_2026-08-25.md`.

## Accepted release chain

- Phase 2 — `PHASE2_PASS` — merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`.
- Trustworthy Search Experience — #142 — merge `d8fad2df21454aa7dce0101abe208fd24b91a883` — final CI #535.
- Governed-Action Lifecycle — #162 — merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2` — final CI #568.
- Evidence, Search, Lifecycle & Recovery Comprehension — #198/#199 — merge `e32f3a1db5b1c5447031842cd59bda59afadce90` — release candidate CI #624 and final decision CI #625 — `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity — #218/#219 — merge `6cbb3c15de8cb5e9624c5fb164a2781790336298` — fresh candidate CI #652 and final decision CI #654 plus all focused return-context workflows — `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.

Accepted Cross-Surface Context Continuity milestone merges remain independently reversible:

- #202 / PR #203 — `698d07aea66d00fbdf65c94eeacc1f15240fd4c2`, CI #629.
- #206 / PR #207 — `21325da2ffb41899047b200d8e71877d022033b0`, CI #634 plus Source Recovery Return Context.
- #210 / PR #211 — `a4cc1fd89ea34a397d8537a8050ff68f56423d35`, CI #641 plus Source Recovery Return Context and Multi-hop Return Context.
- #214 / PR #215 — `a92803adaf5b15a3c5990efb01e4e469a5938311`, CI #645 plus all three focused return-context workflows.
- #216 / PR #217 synchronization/release-gate preparation — `1af6d5be2198e7a6656ce401c451d5042452339d`, CI #650 plus all three focused workflows.

## Accepted Product Depth safety contract

Product Depth remains local-first and bounded. It preserves backend-returned search order, source provenance, truthful match-basis labeling, and the rule that ranking signals are not calibrated confidence. Lifecycle guidance uses only persisted indexing/extraction state. Recovery guidance uses only configured source-root identity, persisted scan report, persisted watcher status, and existing explicit controls.

Recovery semantics remain exact:

1. Configured recovery-root identity comes only from the persisted/current Folder Path.
2. `scanReport.rootPath` and watcher `rootPath` are evidence identities only.
3. Scan evidence is current-root evidence only on exact root match.
4. Mismatched scan evidence may remain visible only when explicitly scoped to its recorded root.
5. Watcher evidence is applicable only on exact configured-root match.
6. If no Folder Path is configured, configured-root identity remains unknown even when persisted evidence exists.
7. `indexed`, `skipped`, and `failed` remain distinct persisted outcomes; watcher state remains monitoring evidence only.
8. No freshness, health, success, root-cause, retry, repair-completion, or mutation fact is inferred.
9. Opening recovery guidance is read-only and triggers no scan, extraction, Knowledge Base rebuild, watcher change, retry, recovery mutation, or filesystem mutation.
10. There is no per-file retry in the accepted client flow.

Governed planning preserves backend policy, approval, audit, undo, and the global one-filesystem-mutation-per-file guard.

Cross-Surface Context Continuity semantics remain exact:

1. Knowledge Base → Source Inspection may preserve only genuine originating knowledge-page identity.
2. The current search query may be retained only where genuinely recorded.
3. Explicit return navigation targets recorded origin context, never an inferred page.
4. Direct Sources & Files navigation does not fabricate Knowledge Base return context.
5. Source-to-Recovery navigation may remember only the genuine selected source and current query.
6. Selected source is navigation provenance only, never recovery scope; recovery remains source-root scoped.
7. Return restores the same source only if it still exists; no substitute source is inferred or selected.
8. Direct Home/recovery navigation does not fabricate prior source-origin context.
9. Multi-hop continuity carries only genuine recorded origins across Knowledge Base → Source Inspection → Recovery → Source Inspection → Knowledge Base.
10. Stale selected-source IDs never fall back to another file; stale document context is cleared when refresh proves the source no longer exists.
11. Missing/stale page, source, query, or history context remains unavailable/unknown rather than inferred.
12. UI-visible return-context provenance is navigation context only and is clearly distinguished from recovery/action scope.
13. Explicit context clearing changes only client navigation memory and triggers no backend, file, recovery, Knowledge Base, governed action, or filesystem mutation.
14. Existing Client Workspace identifiers/state are used; no new routing architecture or backend intelligence was introduced by the dispatched tranche.

## Mandatory inherited regression baseline

Any subsequent product/release candidate must preserve the complete applicable Phase 1 + Phase 2 + Product Depth matrix on one unchanged candidate, including:

1. root regression;
2. backend tests;
3. frontend TypeScript typecheck;
4. frontend production build;
5. Client/Admin Playwright smoke;
6. rich-citation/source-highlighting acceptance;
7. long-form/table rendering acceptance;
8. grouped-planning/bulk-selection acceptance;
9. API-key lifecycle acceptance;
10. explainable unified-search acceptance;
11. contextual-search-snippet acceptance;
12. Knowledge Base search-navigation acceptance;
13. source-inspection-navigation acceptance;
14. trust-diagnostics-navigation acceptance;
15. planning-selection-clarity acceptance;
16. planning-preview-decision-clarity acceptance;
17. execution/audit/undo outcome-clarity acceptance;
18. knowledge-evidence/freshness-guidance acceptance;
19. search-refinement/filtering acceptance;
20. search-refinement lifecycle/query-context acceptance;
21. lifecycle-status refinement/processing-state acceptance;
22. selected-source lifecycle guidance acceptance;
23. source-root recovery-context acceptance;
24. recovery-outcome guidance acceptance including exact-root, mismatched-root, no-configured-root, and missing-evidence cases;
25. cross-surface context-continuity acceptance;
26. focused `EverythingAI Source Recovery Return Context` acceptance;
27. focused `EverythingAI Multi-hop Return Context` acceptance;
28. focused `EverythingAI Return Context Provenance` acceptance;
29. complete inherited CI matrix validation on the required unchanged candidate together with the focused gates;
30. disposable-folder RC acceptance;
31. UI-governed planning → preview → approval → execution → audit → undo acceptance;
32. independent final review with no unresolved Critical or Important findings;
33. milestone-scoped rollback evidence.

Historical green evidence is not a substitute for validating a new candidate. Previously accepted focused gates must remain wired into CI unless explicitly superseded by an accepted decision.

## Current next action

Complete #220 canonical synchronization, validate its documentation-only PR with the full CI matrix and all three focused return-context workflows, and perform final documentation review. After #220 acceptance, choose the next direction through a separate governance issue.

Preferred bounded local-first option: **Workspace Context Summary & Safe Return Map** using existing Client Workspace state only. This is a recommendation, not implementation authorization.

CEO-gated material expansion remains:

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

## Rollback

#220 is documentation-only. Revert only its canonical synchronization merge and decision-package documentation if required. Product/runtime/data behavior is unaffected. All earlier milestone rollback evidence remains valid and independently scoped.
