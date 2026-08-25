# EverythingAI — Canonical Project State

Date: 2026-08-25  
Authority: current accepted repository state after Cross-Surface Context Continuity milestone #206  
Current governance issue: #208

## Current program stage

**Phase 2 — Product Intelligence & Knowledge Experience is COMPLETE AND DISPATCHED (`PHASE2_PASS`).**

**Product Depth — Evidence, Search, Lifecycle & Recovery Comprehension is COMPLETE AND DISPATCHED (`PRODUCT_DEPTH_COMPREHENSION_PASS`).**

**Cross-Surface Context Continuity milestones #202 and #206 are ACCEPTED.**

- #202 / PR #203 merged as `698d07aea66d00fbdf65c94eeacc1f15240fd4c2`; unchanged-head CI Smoke #629 passed on `d63cdb84c836e882d3734c6aeade98a5010043fc`; final PM review found no unresolved Critical or Important findings.
- #206 / PR #207 merged as `21325da2ffb41899047b200d8e71877d022033b0`; focused workflow `EverythingAI Source Recovery Return Context` passed on unchanged head `deb06e7055d57cf6feeb49e97222750f838f1a10`; CI Smoke #634 passed the complete inherited matrix on the same unchanged head; final PM review found no unresolved Critical or Important findings.

Accepted comprehension release merge: `e32f3a1db5b1c5447031842cd59bda59afadce90`.

Release evidence:

- comprehension post-synchronization release candidate `de8302a281badff75d8408fdcba1fbc15f9916ca` — CI Smoke #624 PASS;
- comprehension release-decision head `94d303c8e687f01f4f8f1e4216ac2357cea0beb7` — CI Smoke #625 PASS;
- final documentation review — no unresolved Critical or Important findings;
- release decision: `docs/PRODUCT_DEPTH_COMPREHENSION_RELEASE_DECISION_2026-08-25.md`;
- handover: `docs/HANDOVER_2026-08-25_PRODUCT_DEPTH_COMPREHENSION_RELEASE.json`.

Issue #208 is documentation-only synchronization plus the next bounded context-continuity decision gate. It does not itself authorize backend architecture changes, new routing architecture, automatic actions, Enterprise Platform, privileged-host/systemd, or material connector/runtime expansion.

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
| Product and UX | Local MVP release-hardened; Phase 2, trustworthy search, governed-action lifecycle, comprehension tranche, and Cross-Surface Context Continuity through #206 accepted | #208 synchronization and one next bounded continuity decision gate |
| Knowledge and Safe Action | Source provenance, evidence navigation, trustworthy search, lifecycle guidance, exact-root recovery evidence, governed planning/execution/audit/undo accepted | Preserve truthful evidence scope and explicit user control while improving movement between existing surfaces |
| Enterprise Platform | Architecture remains future scope | CEO approval required before auth, tenancy, cloud deployment, DB migration, object storage, or production-platform implementation |
| Engineering Operations | Reliability/host work remains separate | Explicit selection plus required privileged-host authority before live infrastructure work |
| Governance and Autonomous Delivery | Dependency-ordered issue → implementation → CI → review → merge loop proven | Preserve exact evidence, rollback, inherited CI coverage, and truthful blocker handling |

## Accepted Product Depth release chain

- Trustworthy Search Experience — #142 — merge `d8fad2df21454aa7dce0101abe208fd24b91a883` — final CI #535.
- Governed-Action Lifecycle — #162 — merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2` — final CI #568.
- Evidence, Search, Lifecycle & Recovery Comprehension — #198/#199 — merge `e32f3a1db5b1c5447031842cd59bda59afadce90` — release candidate CI #624 and final decision CI #625.
- Cross-Surface Context Continuity #202/#203 — merge `698d07aea66d00fbdf65c94eeacc1f15240fd4c2` — unchanged-head CI #629 on `d63cdb84c836e882d3734c6aeade98a5010043fc` — final PM review clean.
- Source-to-Recovery Return Context #206/#207 — merge `21325da2ffb41899047b200d8e71877d022033b0` — focused workflow PASS and unchanged-head CI #634 on `deb06e7055d57cf6feeb49e97222750f838f1a10` — final PM review clean.

Accepted implementation milestones within the comprehension tranche:

- #166 knowledge evidence quality/safe freshness guidance — `9b41167f41b89ff6ae5a8deb7064c817bfb205fb`, CI #574.
- #170 read-only search refinement/filtering UX — `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce`, CI #579.
- #174 search refinement lifecycle/query-context clarity — `6ba75a928b5d126a893ed7089d9c7a391b75ee02`, CI #584.
- #178 lifecycle-status refinement/processing-state clarity — `48531f7d1ff843c6a23180b5331f3c05fd2df1da`, CI #595.
- #182 selected-source lifecycle next-step clarity — `2c4b5596230b498a8fa20977bdf1790b13ff4955`, CI #600.
- #186 source-root recovery context/safe guidance — `3f7c4a4f7ec6560b9b588d22a1e22a658d4bec49`, CI #604.
- #190 recovery outcome interpretation/safe next-step guidance — `da4fa079927f3d38dc6a3c444db5d93bbeca40c6`, CI #611.
- #194 recovery evidence scope alignment/context clarity — `a869b305457d8fc18bd3b9265990e9d0065d2c6b`, CI #618.

Canonical synchronization milestones are governance evidence and do not add product behavior.

## Product Depth safety contract

Product Depth remains local-first and bounded. It preserves backend-returned search order, source provenance, truthful match-basis labeling, and the rule that ranking signals are not calibrated confidence. Lifecycle guidance uses only persisted indexing/extraction state. Recovery guidance uses only configured source-root identity, persisted scan report, persisted watcher status, and existing explicit controls.

Accepted recovery semantics remain exact:

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

Accepted context-continuity semantics remain exact:

1. Knowledge Base → Source Inspection may preserve the genuine originating knowledge-page identity.
2. The current search query may be retained when opening genuine source context.
3. Explicit return navigation must target the recorded originating context, not an inferred page.
4. Direct Sources & Files navigation must not fabricate a Knowledge Base return context.
5. Sources & Files → source-root Recovery may preserve only the genuine selected-source navigation origin and current search query.
6. The selected file is navigation origin only, never recovery scope; recovery remains source-root scoped.
7. Returning from Recovery restores the same source only when it still exists; a missing source must not cause another source to be inferred or selected.
8. Direct Home/recovery navigation clears source-origin context rather than fabricating one.
9. Context continuity uses existing Client Workspace state/identifiers only and does not change mutation semantics.

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
26. focused source-to-recovery return-context workflow acceptance;
27. source-to-recovery return-context acceptance within the complete CI matrix;
28. disposable-folder RC acceptance;
29. UI-governed planning → preview → approval → execution → audit → undo acceptance;
30. independent final review with no unresolved Critical or Important findings;
31. milestone-scoped rollback evidence.

Historical green evidence is not a substitute for validating a new candidate. Previously accepted focused gates must remain wired into CI unless explicitly superseded by an accepted decision.

## Execution authority and controls

- Product Owner / CEO: final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing authority.
- ChatGPT: PM/release authority and authorized direct executor for bounded, dependency-satisfied, reversible work within approved scope.
- Forge: optional executor only when explicitly released.
- Hermes: explicitly assigned, non-overlapping operational/infrastructure work only.
- Human operator: SSH/root/sudo, secret provisioning, and privileged host actions outside safe automation boundaries.

Exactly one dependency-satisfied implementation task may be released at a time for a given queue. Every material change requires acceptance criteria, evidence, review, and rollback. Do not invent PASS results.

## Issue #69

Issue #69 (`EAI-TASK-046`) is **closed completed** historical Phase 3/Hermes reliability evidence. It is not an open dependency and must not be rewritten merely because older historical text described it as protected or unreleased. Any newly discovered factual inconsistency in its historical acceptance record requires explicit CEO review before modification.

## Current next action

Complete #208 canonical synchronization. After acceptance, release exactly one bounded implementation issue for **multi-hop return-context continuity** across the already-existing Knowledge Base → Source Inspection → Recovery → Source Inspection → Knowledge Base flow. It must preserve only genuine recorded origins, preserve the current query where applicable, clear stale/missing origins rather than infer replacements, and introduce no backend/routing/mutation architecture expansion.

Enterprise Platform and privileged-host work remain CEO/authority gated.

## Rollback

#208 is documentation-only. Revert only its synchronization merge if required. Product/runtime/data behavior is unaffected.
