# Product Depth — Search Refinement & Filtering Decision Gate

Date: 2026-08-24  
Predecessor: accepted knowledge evidence/freshness milestone #166 / PR #167  
Accepted merge: `9b41167f41b89ff6ae5a8deb7064c817bfb205fb`  
Final unchanged-head CI: #574 on `76699c7e30bf741b12c880d096b770ee73de98ac`

## Purpose

Define the next bounded Product Depth direction after accepted evidence-quality/freshness guidance without authorizing Enterprise Platform, privileged-host, or material connector/runtime expansion.

## Recommended next direction

**Search refinement and filtering UX**

EverythingAI already has accepted keyword/semantic result fusion, explainable match basis, contextual snippets, literal highlighting, result inspection, and source-backed Knowledge Base navigation. The next low-risk improvement should help users narrow existing local search results using metadata already available to the client, without changing search-model/provider architecture or inventing new confidence semantics.

## User questions to answer

1. How can I narrow a mixed result set to the files or result types I actually need?
2. Which active filters are affecting the visible result set?
3. Can I clear or adjust filters without losing the underlying query context?
4. Are filters based on genuine result metadata rather than inferred categories?
5. Does filtering preserve truthful keyword/semantic match explanations and contextual evidence?

## First bounded milestone recommendation

Create one implementation milestone focused on **read-only result refinement using existing metadata**.

Candidate controls may include only metadata that is already returned or locally present, such as file type/extension, source path, or existing match basis, after inspection confirms the fields are reliable and useful.

## Acceptance requirements

- filters operate only on genuine existing result metadata;
- active filters are visible and individually clearable;
- clearing filters restores the unfiltered result set for the current query;
- search ranking/match-basis facts remain unchanged and truthful;
- semantic similarity remains a ranking signal, never calibrated confidence;
- contextual snippets and literal highlighting remain genuine;
- no backend/provider/search-model architecture change unless a later separately approved milestone explicitly requires it;
- Client search remains read-only;
- mobile/readability behavior remains sound;
- complete inherited regression matrix passes on one unchanged candidate;
- focused acceptance covers filter application, clearing, empty-state behavior, and preservation of match explanations;
- independent diff review finds no unresolved Critical or Important findings;
- rollback is milestone-scoped.

## Non-goals

This gate does not authorize:

- authentication, identity, tenancy, cloud deployment, database migration, or object storage;
- privileged host/systemd work;
- material connector/runtime expansion;
- automatic file mutation or approval bypass;
- new embedding/provider architecture;
- new confidence/trust scoring;
- backend recalculation of existing trust/evidence metrics.

## Dependency rule

Do not release the implementation milestone until #168 canonical synchronization is accepted and merged. After #168 acceptance, the bounded read-only search-refinement milestone is dependency-satisfied and may be released autonomously within these constraints.

## Rollback

This decision package is documentation-only and independently reversible. Any later implementation milestone must define its own rollback boundary and validation evidence.
