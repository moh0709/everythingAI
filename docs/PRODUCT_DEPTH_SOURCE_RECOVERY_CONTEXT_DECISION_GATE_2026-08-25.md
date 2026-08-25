# Product Depth — Source-Root Recovery Context Clarity Decision Gate

Date: 2026-08-25  
Governance issue: #184  
Status: RECOMMENDED NEXT BOUNDED GATE — NOT MATERIAL ARCHITECTURE AUTHORIZATION

## Accepted dependency

- #182 — selected-source lifecycle next-step clarity — accepted and closed.
- PR #183 merged as `2c4b5596230b498a8fa20977bdf1790b13ff4955`.
- Final unchanged head: `b973508701ac7be3e0f3f8108755976d12f4bd91`.
- Final CI Smoke #600 passed root regression, backend tests, frontend typecheck/build, all inherited Product Depth browser gates, the focused selected-source lifecycle guidance acceptance, disposable-folder RC, and UI-governed action/undo acceptance.
- Final PM diff review found no unresolved Critical or Important findings.

## Inspection finding

The accepted selected-source lifecycle guidance now tells users when a failure state should use the existing source-root recovery path and avoids inventing per-file retry. The next bounded comprehension gap is what happens after the user follows that recovery path: the UI can make the recovery scope and consequences easier to understand using only already persisted source-root facts and existing recovery navigation.

This can be improved without adding a new recovery mechanism, automatic action, backend lifecycle semantics, or mutation behavior.

## Recommended next bounded milestone

**Source-Root Recovery Context Clarity**

Improve the existing recovery view/navigation so a user can understand, from facts already available in the current source-root configuration and recovery state:

1. which configured source root the recovery action concerns;
2. why the user was routed to source-root recovery rather than a per-file retry;
3. that recovery/re-scan operates at the configured source-root boundary, not as an isolated file retry;
4. what the user can safely inspect before choosing any existing recovery/re-scan action;
5. when no automatic action has occurred merely because the recovery view was opened.

## Safety contract

The milestone must remain a comprehension/navigation improvement over existing source-root recovery behavior. It must not:

- add per-file retry;
- auto-trigger scan, extraction, recovery, rebuild, or filesystem mutation;
- create new recovery states or infer progress/completion percentages;
- invent health, freshness, confidence, provenance, or success facts;
- change backend lifecycle derivation, source-root recovery semantics, search ranking/order, planning policy, approval, audit, undo, or filesystem behavior;
- expand authentication, tenancy, cloud deployment, database/object storage, privileged-host/systemd, or connector runtime scope.

## Acceptance expectations

- A focused browser acceptance proves the recovery view identifies the relevant configured source root from existing facts.
- The UI explicitly distinguishes source-root recovery from unsupported per-file retry.
- Opening recovery remains read-only and does not itself start a scan or recovery operation.
- Existing recovery/re-scan actions, if shown, retain their current explicit user-control and backend behavior.
- Representative no-action / failure navigation remains truthful and does not imply automatic success.
- The full inherited regression matrix passes on one unchanged candidate, including the #182 selected-source lifecycle guidance acceptance.
- Independent diff review has no unresolved Critical or Important findings.
- Rollback is milestone-scoped.

## Rollback

Revert only the future source-root recovery context-clarity milestone merge. No data migration or backend rollback should be required.
