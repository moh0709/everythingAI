# Phase 2 Release Decision

Date: 2026-08-23  
Issue: #132  
Status: **RELEASE CANDIDATE — final unchanged-candidate CI and diff review required**

## Phase

**Phase 2 — Product Intelligence & Knowledge Experience**

## Accepted milestone chain

| Milestone | Issue | Merge | CI |
|---|---:|---|---:|
| Rich citations and source highlighting | #122 | `15ec8b842e73981008ccb180b8777ea723f8ebc7` | #492 |
| Long-form and table formatting | #124 | `1ec7c8ddcfe30beb49c84ae92646988b8894c1e5` | #495 |
| Grouped planning and bulk selection | #126 | `af026ff065602587c53c0081a04211e2543fa99d` | #499 |
| API-key lifecycle UX | #128 | `f4de9b2c890ad28503756742e0989ac1bd2d01d2` | #502 |
| Controlled frontend modularization | #130 | `ef54272e92bfc2774385be67fcf6ce311e241aa7` | #504 |

## Product result

Phase 2 now provides:

- citation references that remain connected to genuine source evidence and focused source context;
- clearer long-form document rendering, semantic lists, responsive tables, and interactive citations inside table cells;
- grouped planning and bulk-selection UX with global one-filesystem-mutation-per-file safety preserved;
- explicit provider API-key lifecycle states for saved, replace, cancel, clear, and staged-key behavior;
- reduced frontend coupling by isolating the security-sensitive API-key lifecycle field from generic provider configuration.

No Phase 2 milestone introduced authentication, tenancy, cloud deployment, database migration, object storage, new provider runtime behavior, connector runtime expansion, or other Enterprise Platform scope.

## Mandatory final release gate

The release candidate is accepted only if one unchanged head SHA passes:

1. root regression;
2. backend tests;
3. frontend TypeScript typecheck;
4. frontend production build;
5. Client/Admin Playwright smoke;
6. Phase 2 rich-citation acceptance;
7. Phase 2 long-form/table acceptance;
8. Phase 2 grouped-planning acceptance;
9. Phase 2 API-key lifecycle acceptance;
10. disposable-folder RC acceptance;
11. UI-governed planning → preview → approval → execution → audit → undo acceptance;
12. independent diff review with no unresolved Critical or Important findings.

## Rollback

Each milestone remains independently reversible by reverting its merge commit. The Phase 2 release-control documentation itself is documentation-only and can be reverted independently.

## Protected scope

Issue #69 remains protected and unchanged.

## Decision rule

If the final unchanged-candidate gate is green and independent review finds no unresolved Critical/Important issue, record **PHASE2_PASS — COMPLETE AND DISPATCHED** and close #132. Otherwise Phase 2 remains open until the failure is diagnosed, corrected, and revalidated.
