# EverythingAI — Current Roadmap

Date: 2026-08-25  
Current product state: **Phase 2 complete and dispatched (`PHASE2_PASS`)**  
Accepted Phase 2 release merge: `266c2efa255ba11165ffaf5d0b6385affe0f261b`  
Accepted Product Depth trustworthy-search release: `PRODUCT_DEPTH_PASS` / merge `d8fad2df21454aa7dce0101abe208fd24b91a883`  
Accepted Product Depth governed-action lifecycle release: `PRODUCT_DEPTH_ACTION_LIFECYCLE_PASS` / merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`

## Completed product sequence

### Phase 0 — Reconciliation and Release Control

Complete. Established the five-track model, execution ownership, release-candidate baseline, and evidence discipline.

### Phase 1 — Local MVP Product Review and Release Hardening

Complete. Hardened the local MVP, source-processing/recovery lifecycle, Unicode integrity, governed action/undo flow, and release evidence.

### Phase 2 — Product Intelligence & Knowledge Experience

Complete and dispatched. Delivered rich citations/source highlighting, improved long-form/table rendering, grouped planning/bulk selection, secure provider API-key lifecycle UX, controlled frontend modularization, and unchanged-head release validation.

Release evidence:

- `docs/PHASE2_RELEASE_DECISION_2026-08-23.md`
- `docs/HANDOVER_2026-08-23_PHASE2_RELEASE_DECISION.json`

### Product Depth — Trustworthy Search Experience

Accepted and dispatched through #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883` after final unchanged-head CI #535 and independent diff review.

1. #136 explainable unified Sources & Files ranking — `10eb14b5501499e90e5281390f9cfed99edc8315`.
2. #138 contextual search snippets and result inspection — `e1ba126ea2f5017f21d7e551158bc80f9cf2328c`.
3. #140 trustworthy Knowledge Base search navigation — `680763ca86e35d748ce37b115f1be7601d011422`.
4. #142 `PRODUCT_DEPTH_PASS` release decision — `d8fad2df21454aa7dce0101abe208fd24b91a883`.

### Product Depth — Governed-Action Lifecycle

Accepted as `PRODUCT_DEPTH_ACTION_LIFECYCLE_PASS` through #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`.

5. #144 richer source inspection navigation — `9c707581c1c8d068724925854008309ab7cc251e`, CI #539.
6. #146 actionable trust diagnostics navigation — `453b7d009060db44918f6c4d5346d197323cdf15`, CI #541.
7. #148 canonical synchronization — `f496cf86e733501bc4bb0a5a90af4a1ec3e8678b`, CI #543.
8. #150 planning selection clarity/conflict explanations — `6bdb96f08cab2f1597528223d2f19a2ee1d0f3f5`, CI #546.
9. #152 canonical synchronization — `2f8d2bf0700d3d07e97e38e1f51bffb806886dbd`, CI #548.
10. #154 planning dry-run/preview decision clarity — `943aff2e9807894142581c4f6872b76188e26d5f`, CI #555.
11. #156 canonical synchronization — `d8152d2307b63917e5580d01690119b24c88ccf0`, CI #557.
12. #158 execution/audit/undo outcome clarity — `b75e236960ec5f0e562bfbfb06f1954d47efafe2`, CI #562.
13. #160 canonical synchronization — `d62724bf649edf77e784e32df8a76366a10f1968`, CI #564.
14. #162 governed-action lifecycle release — `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.

### Product Depth — Evidence and Search Refinement Continuation

15. #164 canonical synchronization — `5a88a7df42d15deb747baaf30974040c4a977cdd`, CI #570.
16. #166 knowledge evidence quality and safe freshness guidance — `9b41167f41b89ff6ae5a8deb7064c817bfb205fb`, CI #574.
17. #168 canonical synchronization — `26fcc0fc68bcf7f784241b5c45d52835b5b0d0c4`, CI #576.
18. #170 read-only search refinement/filtering UX — `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce`, CI #579.
19. #172 canonical synchronization — `3b750a1467a0ba01bd30ef3dbd18b38f969099af`, CI #581.
20. #174 search refinement lifecycle/query-context clarity — `6ba75a928b5d126a893ed7089d9c7a391b75ee02`, final unchanged-head CI #584.
21. #176 canonical synchronization — `1b103e614ba117cdf8b5e2e08cd39eebc5bdeb2e`, final unchanged-head CI #590.
22. #178 lifecycle-status refinement and processing-state clarity — `48531f7d1ff843c6a23180b5331f3c05fd2df1da`, final unchanged head `0fd7b5638b142cddd1ce5f4f1795839d50eb583a`, final CI #595. The final candidate restored and passed the inherited #174 search-refinement lifecycle browser gate before acceptance.
23. #180 canonical synchronization — `ff85d2fe90eb5f2903ea8c986e759e2bfcc3101d`, CI #597.
24. #182 selected-source lifecycle next-step clarity — `2c4b5596230b498a8fa20977bdf1790b13ff4955`, final unchanged head `b973508701ac7be3e0f3f8108755976d12f4bd91`, CI #600.

The accepted refinement behavior is read-only. It preserves backend result ordering, scopes filters to the current result context, clears stale refinements on explicit search/base-file refresh, derives lifecycle labels only from persisted indexing/extraction facts, and explains selected-source next steps without inventing per-file retry or progress.

## Current five-track position

| Track | Position | Next gate |
|---|---|---|
| Product and UX | Strong local MVP; Phase 2 dispatched; trustworthy-search, governed-action lifecycle, evidence-quality, search refinement/filtering, search-context lifecycle, lifecycle-status, and selected-source lifecycle Product Depth work accepted | Complete #184; if accepted, release source-root recovery context/safe guidance |
| Knowledge and Safe Action | Proven source-backed reading, explainable search, evidence navigation, diagnostics, lifecycle-state filtering, selected-source lifecycle guidance, governed planning/execution/audit/undo lifecycle | Improve source-root recovery comprehension using existing persisted recovery facts only |
| Enterprise Platform | Target architecture exists; production platform not authorized | CEO decision before implementation expansion |
| Engineering Operations | Reliability/host history exists separately | Explicit business priority plus privileged authority before live host work |
| Governance and Autonomous Delivery | Evidence-backed issue/PR/CI/review loop proven | Preserve exact dependency, inherited CI wiring, rollback, and truthful blocker discipline |

## Active dependency sequence

```text
#182 accepted
  -> #184 canonical synchronization + decision package
    -> source-root recovery context & safe guidance (recommended bounded gate)
```

Issue #184 does not itself authorize product/runtime implementation. Its decision package recommends one bounded next milestone only after #184 is accepted.

## Recommended next bounded milestone

**Source-Root Recovery Context & Safe Guidance**

Decision package: `docs/PRODUCT_DEPTH_SOURCE_RECOVERY_CONTEXT_DECISION_GATE_2026-08-25.md`.

The selected-source panel now truthfully explains lifecycle state and safe next steps. The remaining bounded comprehension gap is what the existing source-root recovery navigation means after a supported failure state: users should understand the scope of that recovery context before navigating there, using only already persisted recovery facts and existing navigation.

Allowed direction:

- explain that recovery operates at the configured source-root context rather than as a per-file retry;
- surface already persisted recovery state where available;
- clarify that navigation opens recovery/inspection context and does not itself guarantee or trigger repair;
- reuse existing source-root recovery navigation only;
- add focused browser acceptance and preserve the full inherited matrix.

Prohibited expansion:

- per-file retry;
- automatic scan/extraction/recovery/rebuild;
- progress percentages, health scores, inferred recovery success, or freshness timestamps;
- new trust/confidence/provenance calculations;
- backend lifecycle/recovery redesign;
- planning/mutation/approval/audit/undo changes;
- authentication, tenancy, cloud deployment, DB migration, object storage, privileged-host/systemd, or material connector/runtime expansion.

## Mandatory inherited release discipline

Every new product candidate must pass the full applicable inherited matrix on one unchanged head, including accepted Product Depth browser gates through #182, disposable-folder RC acceptance, and UI-governed action/undo acceptance. Historical green results do not substitute for current validation. Previously accepted focused gates must remain wired into CI unless an explicit accepted supersession says otherwise.

## Issue #69

Issue #69 is closed completed historical Phase 3/Hermes reliability evidence. It is not an open dependency and must not be rewritten without explicit CEO review of a newly discovered factual inconsistency.

## Scope boundary

Do not silently begin Enterprise Platform, privileged-host/systemd, authentication/tenancy/cloud/database/storage, automatic mutation/recovery, or material connector/runtime implementation. Those remain separately gated.
