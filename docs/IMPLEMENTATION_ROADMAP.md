# EverythingAI — Current Implementation Roadmap

Date: 2026-08-23

## Current state

Phase 2 — Product Intelligence & Knowledge Experience is **complete and dispatched** at merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`.

There is currently **no authorized major implementation queue after Phase 2**.

Issue #134 is the sole active task and is documentation-only: reconcile stale canonical overlays and prepare the next-phase decision gate.

## Active sequence

1. Complete #134 canonical reconciliation.
2. Independently review the documentation diff.
3. Merge only if history/evidence are preserved and no Critical/Important finding remains.
4. Close #134 with exact merge and rollback evidence.
5. Present/select the next bounded phase objective from the five-track roadmap.
6. Only then create/release the first dependency-satisfied implementation milestone.

## Phase 2 accepted chain

- #122 → merge `15ec8b842e73981008ccb180b8777ea723f8ebc7` → CI #492.
- #124 → merge `1ec7c8ddcfe30beb49c84ae92646988b8894c1e5` → CI #495.
- #126 → merge `af026ff065602587c53c0081a04211e2543fa99d` → CI #499.
- #128 → merge `f4de9b2c890ad28503756742e0989ac1bd2d01d2` → CI #502.
- #130 → merge `ef54272e92bfc2774385be67fcf6ce311e241aa7` → CI #504.
- #132 release → merge `266c2efa255ba11165ffaf5d0b6385affe0f261b` after CI #508.

## Inherited release gates

Every future product implementation milestone must preserve applicable Phase 1 + Phase 2 acceptance gates:

1. root regression;
2. backend tests;
3. frontend typecheck;
4. frontend production build;
5. Client/Admin Playwright smoke;
6. rich-citation/source-highlighting acceptance;
7. long-form/table acceptance;
8. grouped-planning/bulk-selection acceptance;
9. API-key lifecycle acceptance;
10. disposable-folder RC acceptance;
11. UI-governed planning → preview → approval → execution → audit → undo acceptance;
12. independent diff review;
13. exact rollback evidence.

A new milestone starts with its own acceptance criteria and cannot inherit PASS merely from prior CI.

## Scope boundaries

Do not silently begin any of the following from this roadmap:

- authentication or production identity;
- tenancy/workspace infrastructure;
- cloud deployment;
- production database migration;
- object storage;
- privileged-host/systemd deployment;
- materially expanded connector runtime;
- other material architecture changes.

Those require an explicit next-phase decision before implementation release.

## Issue #69

Issue #69 is closed completed historical reliability evidence and is not an active dependency. Do not rewrite its acceptance history without a newly discovered factual inconsistency requiring CEO review.

## Rollback

Issue #134 is documentation-only. Its eventual merge can be reverted independently without reverting any accepted product milestone.

## Historical implementation roadmap

The exact pre-reconciliation file is preserved at:

`docs/archive/2026-08-23-pre-phase2-reconciliation/IMPLEMENTATION_ROADMAP.md`
