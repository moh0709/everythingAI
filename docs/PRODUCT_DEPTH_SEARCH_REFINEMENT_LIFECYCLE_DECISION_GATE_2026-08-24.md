# Product Depth — Search Refinement Lifecycle Decision Gate

Date: 2026-08-24
Governance issue: #172
Status: CANDIDATE — NOT YET RELEASED

## Accepted predecessor

Product Depth issue #170 — read-only search refinement and filtering UX — is accepted and closed.

- PR #171 merge: `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce`
- final unchanged-head candidate: `fce080ad6bca0ff0d9193419b52b04e1e8278dc9`
- CI Smoke #579: PASS
- independent diff review: no unresolved Critical or Important findings
- inherited CI now explicitly includes the accepted #166 knowledge-evidence/freshness acceptance and #170 search-refinement acceptance

## Observed bounded follow-up

The accepted #170 filters are local Client UI state. Inspection shows the file-type and match-basis filters can remain selected while the user launches another search query or refreshes the underlying file list. That behavior is not a backend safety issue, but it can make a new result set appear unexpectedly narrowed by refinement choices made for a previous result set.

The next dependency-safe Product Depth gate should therefore be **Search Refinement Lifecycle & Query-Context Clarity**.

## Proposed scope

1. Treat refinement filters as belonging to the current search-result context rather than as durable cross-query preferences.
2. Starting a new explicit search should reset active result refinements before the new result set is presented.
3. Refreshing the base file list should not leave stale search-only refinements applied to non-search data.
4. Preserve the typed query itself and all genuine backend result metadata.
5. Preserve original ranking order, match-basis explanation, semantic ranking-signal wording, snippets, source inspection, and read-only behavior.
6. Add focused browser acceptance for new-query reset, refresh reset, clear-all, and mobile overflow.

## Non-goals

- no saved filter presets or user preference persistence;
- no backend search/provider changes;
- no semantic model, embeddings, ranking, trust, confidence, or provenance recalculation;
- no mutation-policy or approval changes;
- no authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd, or material connector/runtime expansion.

## Mandatory inherited baseline

Any released implementation must pass one unchanged candidate through:

- root regression;
- backend tests;
- frontend TypeScript typecheck and production build;
- Client/Admin Playwright smoke;
- Phase 2 rich-citation, long-form/table, grouped-planning, and API-key lifecycle acceptances;
- Product Depth explainable search, contextual snippets, Knowledge Base navigation, source inspection, trust diagnostics, planning preview, execution/audit/undo, knowledge evidence/freshness, and search-refinement acceptances;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent diff review with no unresolved Critical or Important findings.

## Rollback

Revert only the future lifecycle milestone merge. The accepted #170 search-refinement implementation and all backend search behavior remain independently reversible and unchanged by this decision package.

## Release rule

This document prepares but does not itself release implementation. Release exactly one issue only after #172 canonical synchronization is accepted.