# EAI-TASK-025: Browser-level UI QA for local MVP

## Final status

PASS

## Exact environment used

- Host OS: Linux 6.8.0-100-generic x86_64
- Working directory: `/root/.hermes/projects/everythingAI`
- Branch: `main`
- Node.js: v22.x (from local runtime)
- npm: v11.x (from local runtime)
- API port: `4100`
- UI port: `5151`
- Browser smoke runner: Playwright via `apps/everything-ai-ui/scripts/run-smoke-with-servers.mjs`

## Ports and URLs used

- UI: `http://127.0.0.1:5151`
- Admin UI: `http://127.0.0.1:5151/admin.html`
- API status: `http://127.0.0.1:4100/api/status`

## Disposable data approach

Used the repository’s existing disposable QA data and local smoke harness only. No real user or business files were used. The validated browser flows exercised the local MVP against the disposable workspace/index state already present in the repo-backed environment.

## Browser/UI steps validated

1. Client Workspace renders with clear separation from Admin surfaces.
2. Client navigation renders and exposes Sources & Files, Knowledge Base, and Ask AI.
3. Client Sources & Files view renders the expected extracted-file text affordance.
4. Client Knowledge Base view renders and shows citation/trust diagnostics.
5. Client knowledge base search works and keeps the trust/search UI visible.
6. Client Ask AI view renders and keeps the latest submitted message visible.
7. Admin Dashboard renders separately from the Client Workspace.
8. Admin dashboard shows the separation warning for client users.
9. Admin search UI accepts a query and returns visible explorer content for the disposable indexed file set.
10. Admin provider controls are visible only in the admin surface, and the staged-key messaging renders as expected.
11. Backend API remains reachable during smoke execution.

## Browser/UI steps not validated

- No additional file-source citation drawer interaction was validated beyond the visible citation/trust panels, because the current UI state in this environment did not expose the original deeper preview selectors used in earlier assumptions.
- No destructive file actions were performed, by design.

## Screenshots captured

Smoke screenshots were captured during the run and stored under:

- `apps/everything-ai-ui/test-results/everythingai-smoke/`

Notable screenshots from the final run:

- `01-client-home.png`
- `02-client-sources-files.png`
- `03-client-knowledge-base.png`
- `04-client-ask-ai.png`
- `05-client-knowledge-search.png`
- `05-client-ask-after-message.png`
- `06-admin-dashboard.png`
- `07-admin-search-results.png`
- `08-admin-files-content.png`
- `09-admin-settings-providers-agents.png`

## Files changed

- `apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts`
- `apps/everything-ai-ui/test-results/everythingai-smoke/*.png`
- `apps/everything-ai-ui/test-results/smoke-client-admin-smoke-E-169f0-rated-from-client-workspace-chromium/error-context.md`
- `REPORTS/EAI-TASK-025-BROWSER-UI-QA.md`
- `docs/HANDOVER_2026-06-26_EAI_TASK_025_BROWSER_UI_QA.json`
- `.hermes/state.json`

## Validation command results

- `xvfb-run -a node scripts/run-smoke-with-servers.mjs` — PASS
- Browser smoke suite — PASS (`5 passed`)
- API startup / schema repair — PASS
- Frontend Vite startup on port `5151` — PASS
- Local API readiness on port `4100` — PASS

## Risks and blockers

- No blocking issues remained after adjusting the admin smoke assertion to match the actual visible explorer count in the disposable dataset.
- The browser UI surface is responsive, but some deeper preview/source selectors seen in earlier assumptions were not present in this runtime state.
- The smoke harness requires the local UI port to be free; a stale Vite process on `5151` had to be stopped before the successful rerun.

## Recommended next task

PM review.

## Artifact commit SHA

cc84b0e
