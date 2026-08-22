# Phase 2 — Decision Package

Date: 2026-08-22
Status: READY FOR CEO/PM SCOPE SELECTION
Predecessor: Phase 1 — Local MVP Product Review and Release Hardening (`PHASE1_PASS`)
Accepted product baseline: `f9cbe324a5c7df69851354d21e6836af70b046a6`

## Purpose

Phase 2 starts from a hardened, product-reviewable local MVP. It must preserve the Phase 1 regression matrix and must not silently reinterpret historical enterprise phase numbering as the new product phase.

## Five-track starting position

| Track | Phase 1 exit | Candidate Phase 2 direction |
|---|---|---|
| Product and UX | Responsive Client/Admin journeys and coherent recovery/action visibility accepted | Product polish, richer planning UX, citation/source-reading improvements |
| Knowledge and Safe Action | UTF-8, source lifecycle, governed execution/audit/undo acceptance established | Richer citations, source highlighting, document formatting, bounded planning improvements |
| Enterprise Platform | Intentionally not expanded in Phase 1 | Decision required before auth/tenancy/cloud/object-storage work |
| Engineering Operations | CI release matrix and durable browser evidence established | Preserve gates; improve release automation/evidence only where justified |
| Governance and Autonomous Delivery | Dependency-ordered execution and protected queue preserved | Continue one released dependency-satisfied task at a time |

## Recommended Phase 2 priority

Start with a **Product Intelligence & Knowledge Experience** phase rather than enterprise infrastructure expansion. The local MVP now proves safe end-to-end behavior; the highest-value next step is to make its knowledge and planning experience substantially more useful before introducing production-platform complexity.

Recommended order:

1. Rich citation rendering and source highlighting.
2. Better extracted-document formatting for long-form content, tables, and supported media.
3. Grouped folder-structure planning and bulk-selection UX.
4. API-key lifecycle UX (saved / replace / clear) without changing provider security boundaries.
5. Controlled frontend modularization/legacy-admin cleanup only where it reduces product risk or enables the above.
6. Separately prepare an Enterprise Platform architecture/decision gate; do not implement auth, tenancy, cloud deployment, or object storage until approved.

## Mandatory baseline gates

Every Phase 2 milestone must preserve:

- root regression 191/191 or its intentionally updated accepted successor;
- backend tests;
- frontend typecheck/build;
- Client/Admin Playwright smoke;
- disposable-folder release-candidate acceptance;
- UI-governed action/undo acceptance;
- durable CI artifacts;
- source attribution;
- user/admin separation;
- approval before governed mutation;
- rollback evidence;
- protected issue #69 unchanged unless explicitly authorized.

## Phase 2 planning exit

Planning is ready when the recommended direction is accepted or amended, milestones are converted into dependency-ordered issues, acceptance criteria and rollback are defined, and exactly one first implementation issue is released.

No Phase 2 implementation should begin merely because this package exists.
