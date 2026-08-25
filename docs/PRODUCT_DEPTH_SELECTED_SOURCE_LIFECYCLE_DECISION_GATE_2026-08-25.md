# Product Depth — Selected-Source Lifecycle Next-Step Clarity Decision Gate

Date: 2026-08-25  
Governance issue: #180  
Status: RECOMMENDED NEXT BOUNDED GATE — NOT MATERIAL ARCHITECTURE AUTHORIZATION

## Accepted dependency

- #178 — lifecycle-status refinement and processing-state clarity — accepted and closed.
- PR #179 merged as `48531f7d1ff843c6a23180b5331f3c05fd2df1da`.
- Final unchanged head: `0fd7b5638b142cddd1ce5f4f1795839d50eb583a`.
- Final CI Smoke #595 passed the complete inherited matrix, including restored #174 search-refinement lifecycle acceptance, #178 lifecycle-status acceptance, disposable-folder RC, and UI-governed action/undo.
- Final PM diff review found no unresolved Critical or Important findings.

## Inspection finding

`apps/everything-ai-ui/src/shared/sourceLifecycle.ts` already derives a truthful lifecycle state, label, detail, and safe recovery target from persisted indexing/extraction facts. `apps/everything-ai-ui/src/user/ExploreView.tsx` already shows that lifecycle on result rows and in selected-file details, and exposes source-root recovery only when the derived lifecycle explicitly permits it.

The remaining product-depth gap is comprehension after a user opens a specific source: the detail panel exposes several technical facts, but the user must infer what those facts mean together and what the safe next step is. This can be improved without inventing progress, retry, freshness, confidence, or recovery semantics.

## Recommended next bounded milestone

**Selected-source lifecycle next-step clarity**

Improve the selected-file/source-context panel so it explains, from the existing derived lifecycle only:

1. the current lifecycle state in plain language;
2. why that state is shown using the already persisted indexing/extraction facts;
3. the safe next step for that state;
4. when no action is required;
5. when source-root recovery is the only supported recovery path;
6. that unsupported extraction is a capability limitation rather than a failed retry condition.

## Safety contract

The milestone must remain frontend/read-only except for reusing the already accepted source-root recovery navigation. It must not:

- add per-file retry;
- trigger scanning, extraction, rebuild, mutation, or recovery automatically;
- infer progress percentages or completion timestamps;
- invent confidence, freshness, provenance, or health calculations;
- change backend lifecycle derivation, search ranking, result ordering, planning policy, approval boundaries, audit, undo, or filesystem behavior;
- expand authentication, tenancy, cloud deployment, database/object storage, privileged-host/systemd, or connector runtime scope.

## Acceptance expectations

- A focused browser acceptance proves representative ready, extracting/waiting, unsupported, and failure guidance from existing lifecycle facts.
- Failure guidance routes only to the already supported source-root recovery path.
- Ready/unsupported states do not expose misleading retry actions.
- Technical status values remain available for inspection.
- The full inherited regression matrix passes on one unchanged candidate.
- Independent diff review has no unresolved Critical or Important findings.
- Rollback is milestone-scoped.

## Rollback

Revert only the future selected-source lifecycle clarity milestone merge. No data migration or backend rollback should be required.
