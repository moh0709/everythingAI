# Product Depth — Search Lifecycle-Status Refinement Decision Gate

Date: 2026-08-24
Governance issue: #176
Status: READY FOR BOUNDED RELEASE AFTER #176 ACCEPTANCE

## Accepted dependency

- #174 — search refinement lifecycle and query-context clarity — accepted and closed.
- PR #175 merged as `6ba75a928b5d126a893ed7089d9c7a391b75ee02`.
- Final unchanged-head CI Smoke #584 passed on `4bdc4823917f9249eb9bb23528741e2a2e9faa43`.
- PM diff review found no unresolved Critical or Important findings.

## Recommended next bounded Product Depth milestone

**Search lifecycle-status refinement and processing-state clarity**

The Sources & Files experience already exposes persisted indexing/extraction/recovery facts and derives the existing user-facing lifecycle labels used elsewhere in the same view. The next bounded milestone should let users refine the current file/search result set by those already-visible lifecycle states while keeping the behavior read-only and preserving backend result order.

### User problem

A result set can contain files that are complete, still processing, partial/unsupported, failed, or missing progress data. Today users can refine search results by file type and match basis, but they cannot directly narrow the current result context by the processing state already shown on each row.

### Proposed bounded behavior

1. Add an optional lifecycle-status refinement using the existing lifecycle classification already rendered for each file.
2. Keep the filter local to the current result context and reset it under the accepted #174 lifecycle rules when a new explicit search or base-file refresh changes that context.
3. Show active lifecycle refinement with the same clearable-filter pattern already accepted for file type and match basis.
4. Preserve original backend-returned ordering among visible rows.
5. Keep processing-state wording tied to existing persisted index/extraction/recovery facts; do not invent progress, confidence, freshness, or completion facts.
6. Provide a truthful filtered-empty recovery message and preserve mobile/no-horizontal-overflow behavior.

## Non-goals

- no backend search/ranking change;
- no semantic/provider architecture change;
- no new confidence/trust/freshness calculation;
- no automatic scan, extraction, retry, rebuild, recovery, or file mutation;
- no approval/policy change;
- no authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd work, or material connector/runtime expansion.

## Acceptance contract for the future implementation issue

- lifecycle filter options map only to lifecycle states already derived from persisted file facts;
- active lifecycle refinement is visible and individually clearable;
- lifecycle refinement composes correctly with file-type and match-basis filters;
- new explicit search and base-file refresh clear stale lifecycle refinement before loading the new context;
- original backend-returned ordering is preserved;
- no result metadata is strengthened beyond available facts;
- complete inherited regression matrix passes on one unchanged candidate;
- focused Playwright acceptance covers lifecycle refinement, composition, context reset, empty-state recovery, and 390px no-overflow behavior;
- independent diff review has no unresolved Critical or Important findings;
- rollback is milestone-scoped.

## Rollback

Revert only the future lifecycle-status refinement milestone merge. Existing search results, ranking, provenance, lifecycle calculations, and backend behavior remain unchanged.

## Scope boundary

This decision package authorizes no implementation by itself. The implementation task may be released only after #176 is accepted and closed.