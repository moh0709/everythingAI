# Product Depth — Governed-Action Lifecycle Release Gate Preparation

Date: 2026-08-24  
Issue: #160  
Status: CANDIDATE — documentation synchronization only

## Accepted dependencies

- #150 planning selection clarity and conflict explanations — merge `6bdb96f08cab2f1597528223d2f19a2ee1d0f3f5`, CI #546.
- #154 planning dry-run/preview decision clarity — merge `943aff2e9807894142581c4f6872b76188e26d5f`, CI #555.
- #156 canonical synchronization — merge `d8152d2307b63917e5580d01690119b24c88ccf0`, CI #557.
- #158 execution, audit, and undo outcome clarity — merge `b75e236960ec5f0e562bfbfb06f1954d47efafe2`, CI Smoke #562 and independent final diff review with no unresolved Critical or Important findings.

## Combined lifecycle to release-gate

`planning selection → conflict explanation → dry-run preview → approval boundary → governed execution → audit evidence → undo/recovery outcome`

The next release decision evaluates whether this already-implemented lifecycle is coherent, truthful, regression-safe, and sufficiently evidenced. It does not authorize new runtime behavior.

## Required validation

The release candidate must pass on one unchanged head:

1. root regression;
2. backend tests;
3. frontend TypeScript typecheck;
4. frontend production build;
5. Client/Admin Playwright smoke;
6. all inherited Phase 2 acceptance tests;
7. Product Depth trustworthy-search and source-inspection acceptance;
8. trust-diagnostics navigation acceptance;
9. planning-selection-clarity acceptance;
10. planning-preview-decision-clarity acceptance;
11. execution/audit/undo outcome-clarity acceptance;
12. disposable-folder RC acceptance;
13. UI-governed planning → preview → approval → execution → audit → undo acceptance;
14. independent final diff review with no unresolved Critical or Important findings.

## Decision outcomes

The release gate must record exactly one of:

- `PRODUCT_DEPTH_ACTION_LIFECYCLE_PASS`
- `PRODUCT_DEPTH_ACTION_LIFECYCLE_BLOCKED`
- `PRODUCT_DEPTH_ACTION_LIFECYCLE_REJECTED`

No PASS may be inferred from prior milestone merges alone.

## Safety invariants

The release gate must preserve:

- backend planning policy/confidence enforcement;
- one-filesystem-mutation-per-file safety guard;
- explicit approval before governed execution;
- existing execution permissions;
- audit persistence semantics;
- filesystem mutation behavior;
- rollback/undo semantics;
- truthful distinction between persisted `undone` state and actual filesystem restoration evidence;
- source/target evidence labels and backend-provided block reasons.

## Out of scope

No authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd work, material connector/runtime expansion, or other material architecture expansion.

## Rollback

Issue #160 is documentation-only. Revert only its documentation synchronization merge. The accepted #150/#154/#158 implementation merges remain independently reversible at their own merge boundaries.
