# Phase 2 — Decision Package

Date: 2026-08-22
Status: READY TO START PHASE 2 PLANNING
Predecessor: Phase 1 — Local MVP Product Review and Release Hardening (`PHASE1_PASS`)
Accepted product baseline: `f9cbe324a5c7df69851354d21e6836af70b046a6`

## Recommended direction

Phase 2 should focus on **Product Intelligence & Knowledge Experience** before enterprise infrastructure expansion.

1. Rich citation rendering and source highlighting.
2. Better extracted-document formatting for long-form content and tables.
3. Grouped folder-structure planning and bulk-selection UX.
4. API-key lifecycle UX (saved / replace / clear) without weakening provider security boundaries.
5. Controlled frontend modularization only where it reduces product risk or enables the above.
6. Keep Enterprise Platform architecture as a separate decision gate; do not silently begin auth, tenancy, cloud deployment, database migration, or object storage.

## Mandatory baseline

Every Phase 2 milestone must preserve the accepted Phase 1 release matrix: root regression, backend tests, frontend typecheck/build, Client/Admin Playwright smoke, disposable-folder RC acceptance, UI-governed action/undo acceptance, durable CI artifacts, source attribution, user/admin separation, approval before governed mutation, and rollback evidence.

Protected issue #69 remains unchanged unless explicitly authorized.

## Phase 2 planning gate

Convert the accepted direction into dependency-ordered milestones/issues with acceptance criteria, rollback paths, and exactly one first released implementation task. No implementation expansion is authorized merely by this planning document.
