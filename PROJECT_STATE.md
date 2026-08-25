# EverythingAI — Canonical Project State

Date: 2026-08-25  
Authority: current accepted repository state after Phase 2 dispatch and bounded Product Depth releases  
Current governance issue: #192

## Current program stage

**Phase 2 — Product Intelligence & Knowledge Experience is COMPLETE AND DISPATCHED (`PHASE2_PASS`).**

Accepted Phase 2 release merge: `266c2efa255ba11165ffaf5d0b6385affe0f261b`.

Bounded Product Depth work continues without authorizing Enterprise Platform or privileged-host expansion. The latest accepted product milestone is **#190 — Recovery Outcome Interpretation & Safe Next-Step Guidance**, merged through PR #191 as `da4fa079927f3d38dc6a3c444db5d93bbeca40c6` after unchanged-head CI Smoke #611 on `e8a6e705cde81bf804cdaa45e5572860ee784eaa` and final PM diff review with no unresolved Critical or Important findings.

The previous canonical synchronization #188 / PR #189 was accepted and merged as `037a38f362b5619aa2706e16b22e7f91a7f59cd6` after CI Smoke #606.

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
| Product and UX | Local MVP release-hardened; Phase 2 dispatched; trustworthy search, governed-action lifecycle, evidence/freshness guidance, search refinement/lifecycle, source lifecycle guidance, source-root recovery context, and recovery-outcome guidance accepted | #192 canonical synchronization, then one bounded recovery-evidence scope-alignment milestone if #192 is accepted |
| Knowledge and Safe Action | Source provenance, evidence navigation, trustworthy search, lifecycle guidance, source-root recovery context, recovery outcome interpretation, governed planning/execution/audit/undo accepted | Improve whether persisted recovery evidence clearly belongs to the currently configured source root without inventing freshness, success, or cause |
| Enterprise Platform | Architecture remains future scope | CEO approval required before auth, tenancy, cloud deployment, DB migration, object storage, or production-platform implementation |
| Engineering Operations | Reliability/host work remains separate | Explicit selection plus required privileged-host authority before live infrastructure work |
| Governance and Autonomous Delivery | Dependency-ordered issue → implementation → CI → review → merge loop proven | Preserve exact evidence, rollback, inherited-gate coverage, and truthful blocker handling |

## Accepted Product Depth milestone chain

- #136 — explainable unified Sources & Files ranking — merge `10eb14b5501499e90e5281390f9cfed99edc8315`.
- #138 — contextual search snippets and result inspection — merge `e1ba126ea2f5017f21d7e551158bc80f9cf2328c`.
- #140 — trustworthy Knowledge Base search navigation — merge `680763ca86e35d748ce37b115f1be7601d011422` — CI #529.
- #142 — trustworthy-search release decision — merge `d8fad2df21454aa7dce0101abe208fd24b91a883` — final CI #535.
- #144 — richer source inspection navigation — merge `9c707581c1c8d068724925854008309ab7cc251e` — CI #539.
- #146 — actionable trust diagnostics navigation — merge `453b7d009060db44918f6c4d5346d197323cdf15` — CI #541.
- #148 — canonical synchronization — merge `f496cf86e733501bc4bb0a5a90af4a1ec3e8678b` — CI #543.
- #150 — planning selection clarity/conflict explanations — merge `6bdb96f08cab2f1597528223d2f19a2ee1d0f3f5` — CI #546.
- #152 — canonical synchronization — merge `2f8d2bf0700d3d07e97e38e1f51bffb806886dbd` — CI #548.
- #154 — planning dry-run/preview decision clarity — merge `943aff2e9807894142581c4f6872b76188e26d5f` — CI #555.
- #156 — canonical synchronization — merge `d8152d2307b63917e5580d01690119b24c88ccf0` — CI #557.
- #158 — execution/audit/undo outcome clarity — merge `b75e236960ec5f0e562bfbfb06f1954d47efafe2` — CI #562.
- #160 — canonical synchronization — merge `d62724bf649edf77e784e32df8a76366a10f1968` — CI #564.
- #162 — governed-action lifecycle release decision — merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2` — final CI #568.
- #164 — canonical synchronization — merge `5a88a7df42d15deb747baaf30974040c4a977cdd` — CI #570.
- #166 — knowledge evidence quality/safe freshness guidance — merge `9b41167f41b89ff6ae5a8deb7064c817bfb205fb` — CI #574.
- #168 — canonical synchronization — merge `26fcc0fc68bcf7f784241b5c45d52835b5b0d0c4` — CI #576.
- #170 — read-only search refinement/filtering UX — merge `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce` — CI #579.
- #172 — canonical synchronization — merge `3b750a1467a0ba01bd30ef3dbd18b38f969099af` — CI #581.
- #174 — search refinement lifecycle/query-context clarity — merge `6ba75a928b5d126a893ed7089d9c7a391b75ee02` — CI #584.
- #176 — canonical synchronization — merge `1b103e614ba117cdf8b5e2e08cd39eebc5bdeb2e` — CI #590.
- #178 — lifecycle-status refinement/processing-state clarity — merge `48531f7d1ff843c6a23180b5331f3c05fd2df1da` — CI #595.
- #180 — canonical synchronization — merge `ff85d2fe90eb5f2903ea8c986e759e2bfcc3101d` — CI #597.
- #182 — selected-source lifecycle next-step clarity — merge `2c4b5596230b498a8fa20977bdf1790b13ff4955` — CI #600.
- #184 — canonical synchronization — merge `980b47937dd6601533776ef12478b6904faf4e0f` — CI #602.
- #186 — source-root recovery context/safe guidance — merge `3f7c4a4f7ec6560b9b588d22a1e22a658d4bec49` — CI #604.
- #188 — canonical synchronization — merge `037a38f362b5619aa2706e16b22e7f91a7f59cd6` — CI #606.
- #190 — recovery outcome interpretation/safe next-step guidance — merge `da4fa079927f3d38dc6a3c444db5d93bbeca40c6` — unchanged-head CI #611 on `e8a6e705cde81bf804cdaa45e5572860ee784eaa`.

## Product Depth safety contract

Product Depth remains local-first and bounded. It preserves backend-returned search order, source provenance, truthful match-basis labeling, and the rule that ranking signals are not presented as calibrated confidence. Lifecycle guidance uses only persisted indexing/extraction state. Recovery guidance uses only configured source-root identity, persisted scan report, persisted watcher status, and existing explicit controls.

Accepted #190 semantics are exact: `indexed`, `skipped`, and `failed` are interpreted only as persisted scan outcomes; watcher state is monitoring evidence only; missing scan/watcher state remains unknown/unavailable; opening recovery guidance is read-only and triggers no scan, extraction, Knowledge Base rebuild, watcher change, retry, or filesystem mutation. There is no per-file retry in the accepted client flow.

Governed planning preserves backend policy, approval, audit, undo, and the global one-filesystem-mutation-per-file guard.

## Mandatory inherited regression baseline

Subsequent product work must preserve, where applicable:

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
11. contextual-snippet acceptance;
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
23. source-root recovery-context acceptance from #186;
24. recovery-outcome guidance acceptance from #190;
25. disposable-folder RC acceptance;
26. UI-governed planning → preview → approval → execution → audit → undo acceptance;
27. independent diff review with no unresolved Critical or Important findings;
28. milestone-scoped rollback evidence.

A historical test result is not a substitute for validating a new candidate. Previously accepted focused gates must remain wired into CI unless explicitly superseded by an accepted decision.

## Execution authority and controls

- Product Owner / CEO: final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing authority.
- ChatGPT: PM/release authority and authorized direct executor for bounded, dependency-satisfied, reversible work within approved scope.
- Forge: optional executor only when explicitly released.
- Hermes: explicitly assigned, non-overlapping operational/infrastructure work only.
- Human operator: SSH/root/sudo, secret provisioning, and privileged host actions outside safe automation boundaries.

Exactly one dependency-satisfied implementation task may be released at a time for a given queue. Every material change requires acceptance criteria, evidence, review, and rollback. Do not invent PASS results.

## Issue #69

Issue #69 (`EAI-TASK-046`) is **closed completed** and retained as historical Phase 3/Hermes reliability evidence. It is not an open dependency and must not be rewritten merely because older text described it as protected or unreleased. Any newly discovered factual inconsistency in its historical acceptance record requires explicit CEO review before modification.

## Current issue state

Issue #192 is the sole active Product Depth governance task. It synchronizes canonical state after accepted #190 and prepares one bounded decision gate.

## Current next action

Complete #192 with the full inherited CI matrix on one unchanged documentation candidate and final documentation diff review. If accepted, the recommended next bounded milestone is **Recovery Evidence Scope Alignment & Context Clarity**, defined in `docs/PRODUCT_DEPTH_RECOVERY_EVIDENCE_SCOPE_ALIGNMENT_DECISION_GATE_2026-08-25.md`.

The proposed milestone is frontend-only and uses facts already present in `SourceRecoveryContext`: the configured recovery root, `scanReport.rootPath`, and watcher `rootPath`. If persisted scan evidence belongs to a different root than the active recovery root, the UI should say so explicitly and must not imply that those counts describe the active root. Matching evidence remains genuine; mismatched evidence remains visible but clearly scoped to its recorded root. No freshness, health, success, root cause, retry, recovery, or mutation fact may be invented.

## Rollback

#192 is documentation-only. Revert only its synchronization merge if required. Product/runtime/data behavior is unaffected.
