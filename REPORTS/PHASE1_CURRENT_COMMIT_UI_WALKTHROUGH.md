# Phase 1 Current-Commit UI Walkthrough

Date: 2026-08-21

Baseline: `3c852ba0187be3022643efa48217e22a0eb36715`

Validation branch: `phase1/issue110-walkthrough`

Draft pull request: [#117](https://github.com/moh0709/everythingAI/pull/117)

## Result

The current Client Workspace and Admin Dashboard journey is covered at 1280×900 and 390×844. Every captured surface now has a horizontal-overflow assertion. The disposable-folder acceptance also carries one exact UTF-8 source from indexing through extraction, document context, persisted Knowledge Base data, visible file-page rendering, and source attribution.

## Observation classification

| Observation | Classification | Current-commit evidence | Artifact(s) | Disposition |
|---|---|---|---|---|
| Agent Connector layout and stale phase copy | `confirmed` and repaired | #111, PR #115, merge `5a09c45d685eaa84576115469d2fe082957efcc5`, CI #450 | `phase1-desktop-admin-agent-connectors.png`, `phase1-narrow-admin-agent-connectors.png` | Accepted before this gate; no runtime expansion |
| Knowledge Base horizontal overflow | `confirmed` and repaired | CI #457 measured `scrollWidth=1332` at a 1280 px viewport. CI #460 identified `.wiki-source-rail` outside the viewport. `wikiNavigationTree.css` required 1,268 px of minimum tracks inside a 90vw page but collapsed only below 1,200 px. The breakpoint is now 1,420 px. | `phase1-desktop-client-knowledge-base.png`, `phase1-narrow-client-knowledge-base.png` | Fixed in PR #117; all viewport assertions pass in CI #464 |
| Knowledge Base Unicode/mojibake | `not reproduced` | Exact Danish, Spanish, German, Arabic, currency, punctuation, and quotation characters survive extraction, document-context JSON, persisted file-page JSON, visible Markdown rendering, and source-card rendering. CI #455 exposed a test-selection mistake: the first aggregate page containing the source was selected instead of its file page. The assertion now selects `page_type === 'file'`. | `phase1-unicode-knowledge-base.png` | Close #112 as an evidence-backed non-defect; corrected CI #464 passes |
| Indexing/extraction/recovery state ambiguity | `confirmed` | Client and Admin file tables give one file four equal visual labels: derived progress, stage, raw index status, and raw extraction status. Recovery guidance is prose; only source-root re-scan is actionable. | `phase1-desktop-client-sources-files.png`, `phase1-narrow-client-sources-files.png` | Implement #113 with one precedence model and only backend-supported recovery controls |
| Planning → preview → approval → execution → audit → undo visibility | `confirmed` | Direct-API disposable acceptance proves backend preview, approval, execution, audit identity, undo, and restoration. Admin Planning exposes preview/execution but not undo; Analytics exposes audit logs but no governed end-to-end UI sequence. | `phase1-desktop-admin-planning.png`, `phase1-narrow-admin-planning.png`, `phase1-desktop-admin-analytics-audit.png`, `phase1-narrow-admin-analytics-audit.png` | Implement #114 after #113 |

## Deterministic fixture

Path: `apps/everything-ai-ui/smoke/fixtures/phase1-unicode-source.txt`

The acceptance rejects `\uFFFD`, `Ã`, `Â`, and `â€` at the document-context and persisted Wiki-page boundaries. It asserts the exact visible strings and the source filename `phase1-unicode-source.txt` in the selected file-page source card.

## Responsive screenshot set

For each viewport, `apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts` captures:

- `phase1-{desktop|narrow}-client-sources-files.png`
- `phase1-{desktop|narrow}-client-knowledge-base.png`
- `phase1-{desktop|narrow}-client-ask-ai.png`
- `phase1-{desktop|narrow}-admin-planning.png`
- `phase1-{desktop|narrow}-admin-analytics-audit.png`
- `phase1-{desktop|narrow}-admin-agent-connectors.png`

## Validation

- Root regression: 191/191 passed locally after the discovery assertions.
- TypeScript typecheck and production build: passed in CI #464.
- Backend tests: passed in CI #464.
- Client/Admin Playwright: 8/8 passed in CI #464.
- Disposable-folder acceptance: 1/1 passed in CI #464.
- CI: [EverythingAI CI Smoke #464](https://github.com/moh0709/everythingAI/actions/runs/32467186125).

## Safety and rollback

- Browser mutation remains confined to Playwright-created temporary directories.
- The test restores the moved source before cleanup and blocks targets outside the indexed root.
- No provider, connector runtime, credential, or protected #69 behavior changed.
- Roll back this discovery gate by reverting the eventual PR #117 merge commit; the only production-code change is the one-line Knowledge Base responsive breakpoint repair.
