# Product Depth — Governed-Action Lifecycle Release Decision

Date: 2026-08-24  
Issue: #162  
Decision: **PRODUCT_DEPTH_ACTION_LIFECYCLE_PASS — FINAL MERGE-GATED**

## Released scope

This release gate evaluates the already accepted Product Depth action-lifecycle clarity milestones as one coherent governed flow:

`planning selection → conflict explanation → dry-run preview → approval boundary → governed execution → audit evidence → undo/recovery outcome`

Accepted implementation dependencies:

- #150 planning selection clarity and conflict explanations — merge `6bdb96f08cab2f1597528223d2f19a2ee1d0f3f5`, CI #546;
- #154 planning dry-run/preview decision clarity — merge `943aff2e9807894142581c4f6872b76188e26d5f`, CI #555;
- #158 execution, audit, and undo outcome clarity — merge `b75e236960ec5f0e562bfbfb06f1954d47efafe2`, CI Smoke #562;
- #160 canonical synchronization — merge `d62724bf649edf77e784e32df8a76366a10f1968`, CI Smoke #564.

## Validation evidence

Pre-decision release-candidate CI Smoke #566 passed the complete inherited matrix on unchanged head `e175ff1ef78349b2644a8211d658dde88721a2d0`, including the accepted planning-selection, planning-preview, execution/audit/undo, disposable-folder RC, and full UI-governed action/undo gates.

This final PASS decision is **merge-gated**: the decision commit and handover must themselves remain on one unchanged final PR head, pass the same CI workflow, and receive independent final diff review with no unresolved Critical or Important findings before merge. A failure on the final head invalidates the merge until diagnosed and corrected.

## Safety invariants preserved

The release preserves unchanged:

- backend planning policy and confidence enforcement;
- one-filesystem-mutation-per-file guard;
- explicit approval before governed execution;
- execution permissions;
- audit persistence semantics;
- filesystem mutation behavior;
- rollback/undo semantics;
- source/target evidence labels and backend-provided block reasons;
- truthful distinction between persisted `undone` state and actual filesystem restoration evidence.

No new runtime behavior is introduced by this release decision.

## Decision rationale

The three accepted clarity milestones now form a coherent, evidence-backed governed-action lifecycle. The user can understand what is selected and conflicted before preview, what a dry run means and whether a preview is blocked or ready for approval, and what execution/audit/undo outcomes mean after governed action. Existing safety boundaries remain backend-enforced and unchanged.

## Non-goals

No authentication, tenancy, cloud/database/storage, privileged-host/systemd, connector/runtime expansion, approval change, execution-permission change, audit-persistence change, filesystem mutation change, or undo-semantic change.

## Rollback

The release-decision documentation is independently reversible. The implementation milestones retain their existing rollback points at #150, #154, and #158 merge boundaries. If a later regression is proven, revert only the affected milestone rather than the entire Product Depth history.

## Finalization rule

This decision becomes accepted repository state only after the unchanged final PR head passes CI and the PR is merged. Until then, `main` remains the previously accepted #160 baseline.
