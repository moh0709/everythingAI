# Phase 2 Milestone 2 — Long-form and Table Formatting

Issue: #124
Baseline: `15ec8b842e73981008ccb180b8777ea723f8ebc7`
Status: ACCEPTED — CI #494 green; diff review clear

## Scope

Improve extracted-document presentation without changing source content or provenance.

## Implementation

- Consecutive extracted bullet lines now render as one semantic list instead of disconnected list-item nodes.
- Long-form prose paragraphs receive an explicit reading-content class while preserving exact extracted text and inline citations.
- Source-backed tables keep their original cell values and citations, add column-header semantics, and live inside a keyboard-focusable horizontal-scroll region.
- No heading, table value, citation, or source metadata is synthesized by presentation logic.

## Acceptance coverage

`apps/everything-ai-ui/smoke/long-form-table-formatting.spec.ts` uses a deterministic source-backed fixture to verify:

- distinct long-form paragraphs remain distinct;
- bullet structure remains intact;
- table headers and cells retain exact fixture values;
- citations inside table cells stay interactive and resolve to the correct source/chunk evidence;
- desktop has no page-level horizontal overflow;
- 390px viewport keeps wide tables contained in their local scroll region;
- source attribution and the #122 citation inspector remain intact.

## Regression evidence

GitHub Actions run #494 passed:

- root regression;
- backend tests;
- frontend typecheck and production build;
- Client/Admin smoke tests;
- Phase 2 rich-citation acceptance from #122;
- Phase 2 long-form/table formatting acceptance;
- disposable-folder RC acceptance;
- UI-governed action and undo acceptance;
- durable backend/frontend/Playwright artifacts.

Independent pre-merge patch review found no unresolved Critical or Important findings. The change is presentation/semantic markup plus deterministic acceptance coverage; it does not modify extracted source values, citation identity, backend contracts, or provider/runtime behavior.

## Rollback

Revert the eventual #124 merge commit only. No Phase 1 or #122 merge should be reverted unless later evidence proves a dependency regression.

## Protection

Protected issue #69 remains unchanged. No Enterprise Platform scope is included.
