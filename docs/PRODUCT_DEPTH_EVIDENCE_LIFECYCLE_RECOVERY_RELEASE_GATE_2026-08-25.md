# Product Depth — Evidence, Search, Lifecycle & Recovery Comprehension Release Gate

Date: 2026-08-25  
Status: READY FOR RELEASE-CANDIDATE VALIDATION AFTER #196 CANONICAL SYNCHRONIZATION  
Dependency: accepted Product Depth milestones #166 through #194

## Purpose

Define the release/dispatch decision gate for the bounded Product Depth tranche covering evidence quality, search refinement, source lifecycle guidance, source-root recovery context, recovery-outcome interpretation, and exact-root recovery-evidence scope alignment.

This gate does not authorize another product feature. It determines whether the already implemented tranche can be accepted as one coherent release after validation on one unchanged candidate.

## Accepted capability chain

- #166 — knowledge evidence quality and safe freshness guidance — merge `9b41167f41b89ff6ae5a8deb7064c817bfb205fb` — CI #574.
- #170 — read-only search refinement and filtering UX — merge `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce` — CI #579.
- #174 — search refinement lifecycle and query-context clarity — merge `6ba75a928b5d126a893ed7089d9c7a391b75ee02` — CI #584.
- #178 — lifecycle-status refinement and processing-state clarity — merge `48531f7d1ff843c6a23180b5331f3c05fd2df1da` — CI #595.
- #182 — selected-source lifecycle next-step clarity — merge `2c4b5596230b498a8fa20977bdf1790b13ff4955` — CI #600.
- #186 — source-root recovery context and safe guidance — merge `3f7c4a4f7ec6560b9b588d22a1e22a658d4bec49` — CI #604.
- #190 — recovery outcome interpretation and safe next-step guidance — merge `da4fa079927f3d38dc6a3c444db5d93bbeca40c6` — CI #611.
- #194 — recovery evidence scope alignment and context clarity — merge `a869b305457d8fc18bd3b9265990e9d0065d2c6b` — unchanged-head CI #618 on `fd8c23d963fb0576ee047349da4e33052da89c95`.

Canonical synchronization milestones between these implementation milestones remain historical governance evidence and do not add product behavior.

## Accepted semantics that must remain exact

1. Citation coverage, weak-source warnings, source fingerprints, lifecycle states, scan outcomes, and watcher states are presented only from persisted/backend facts; they are not recalculated into confidence, freshness, health, readiness, or success claims.
2. Search refinements are read-only, preserve backend result order, and are scoped to the current query/result context.
3. Selected-source lifecycle guidance derives only from existing lifecycle facts and does not invent retry or repair state.
4. Recovery remains source-root scoped and user-controlled; opening recovery guidance is read-only.
5. `indexed`, `skipped`, and `failed` remain distinct persisted scan outcomes.
6. Watcher state is monitoring evidence only and does not prove extraction, recovery, or Knowledge Base success.
7. The configured recovery-root identity comes only from the persisted/current Folder Path. A scan-report root or watcher root must never be promoted into configured-root identity.
8. Scan evidence is current-root evidence only when `scanReport.rootPath` exactly equals the configured Folder Path. Mismatched evidence may remain visible but must be explicitly scoped to its recorded root.
9. Watcher evidence is applicable only to an exact configured-root match. Missing configured root or matching evidence remains unknown/unavailable rather than inferred.
10. No per-file retry, automatic scan, extraction, Knowledge Base rebuild, watcher mutation, recovery mutation, or filesystem mutation is introduced by this tranche.

## Release-candidate validation

A release decision may state PASS only if one unchanged candidate passes the complete inherited Phase 1 + Phase 2 + Product Depth matrix, including:

1. root regression;
2. backend tests;
3. frontend TypeScript typecheck;
4. frontend production build;
5. Client/Admin Playwright smoke;
6. rich citation/source-highlighting acceptance;
7. long-form/table acceptance;
8. grouped planning/bulk-selection acceptance;
9. API-key lifecycle acceptance;
10. explainable unified-search acceptance;
11. contextual-search-snippet acceptance;
12. Knowledge Base search-navigation acceptance;
13. source-inspection-navigation acceptance;
14. trust-diagnostics-navigation acceptance;
15. planning-preview decision-clarity acceptance;
16. execution/audit/undo outcome-clarity acceptance;
17. knowledge evidence/freshness guidance acceptance;
18. search refinement/filtering acceptance;
19. search-refinement lifecycle acceptance;
20. lifecycle-status refinement acceptance;
21. selected-source lifecycle guidance acceptance;
22. source-root recovery-context acceptance;
23. recovery-outcome guidance acceptance, including exact-root, mismatched-root, no-configured-root, and missing-evidence scenarios;
24. disposable-folder RC acceptance;
25. UI-governed planning → preview → approval → execution → audit → undo acceptance;
26. independent final diff/release review with no unresolved Critical or Important findings.

## Decision outcomes

The release decision must be exactly one of:

- `PRODUCT_DEPTH_COMPREHENSION_PASS` — the tranche is accepted and dispatched;
- `PRODUCT_DEPTH_COMPREHENSION_BLOCKED` — evidence is incomplete or a remediable blocker remains;
- `PRODUCT_DEPTH_COMPREHENSION_REJECTED` — the tranche fails its release objective and requires redesign.

No PASS may be inferred from prior milestone CI alone; the release candidate must pass the full matrix again on one unchanged head.

## Rollback

Each implementation milestone remains independently reversible by its accepted merge. This release-gate document and #196 canonical synchronization are documentation-only and independently reversible.

## Scope boundary after dispatch

Successful dispatch does not authorize authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd work, or material connector/runtime expansion. The next implementation direction must be selected through a separate decision gate under the five-track roadmap.

Issue #69 remains completed historical evidence and is not modified by this gate.
