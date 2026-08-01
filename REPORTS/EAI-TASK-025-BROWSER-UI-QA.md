# EAI-TASK-025: Browser-level UI QA for local MVP

## Final status

PASS

## Exact environment used

- Host OS: Windows, PowerShell execution environment
- Working directory: `C:\temp\EverythingAI`
- Branch: `main`
- Starting commit: `423855eff6db8b0aaab80f93081e293e006394cb`
- Node.js/npm: local installed runtime used by repository scripts
- API port: `4100`
- UI port: `5151`
- Browser smoke runner: Playwright via `apps/everything-ai-ui/scripts/run-smoke-with-servers.mjs`
- Browser dependency note: Chromium was installed with `npx playwright install chromium` after the first smoke attempt reported the local Playwright browser binary was missing.

## Ports and URLs used

- Client Workspace: `http://127.0.0.1:5151`
- Admin Dashboard: `http://127.0.0.1:5151/admin.html`
- API status: `http://127.0.0.1:4100/api/status`

## Disposable data approach

Used only the local disposable QA/index state already present in the repository-backed environment. The rendered admin search results referenced disposable local markdown files under temporary test paths. No real user or business files were introduced, and no destructive file actions were performed.

## Browser/UI steps validated

1. Client Workspace renders with the `CLIENT WORKSPACE` marker.
2. Main navigation renders Home, Sources & Files, Knowledge Base, and Ask AI.
3. Sources & Files view renders and exposes extracted-file text/readability affordances.
4. Knowledge Base view renders.
5. Citation inspector summary and Workspace Trust Health panels render.
6. Knowledge page search renders matching state.
7. Ask AI view accepts a disposable prompt and keeps the submitted message visible.
8. Admin Dashboard renders separately at `/admin.html`.
9. Admin Dashboard separation warning remains visible.
10. Admin file search returns visible indexed disposable QA content.
11. Indexing & Extraction Progress status labels render.
12. Files & Content view renders.
13. Admin Settings renders provider controls.
14. Admin Agent Connectors render only on the admin surface.
15. Client Workspace does not expose Admin Agent Connectors.
16. Client Workspace does not expose AI Provider Configuration.
17. Backend API remains reachable during browser smoke execution.

## Browser/UI steps not validated

- Deeper file-source citation drawer interaction was not validated because the current UI/runtime state did not expose a stable deeper drawer selector during this smoke pass. Visible citation/source/trust panels were validated instead.
- Destructive file actions were not validated because they are explicitly out of scope.

## Screenshots captured

The final successful smoke run captured screenshots under:

- `apps/everything-ai-ui/test-results/everythingai-smoke/`

Screenshots:

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

- `LOGS/EAI-TASK-025-terminal.log`
- `REPORTS/EAI-TASK-025-BROWSER-UI-QA.md`
- `docs/HANDOVER_2026-06-26_EAI_TASK_025_BROWSER_UI_QA.json`
- `apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts`
- `apps/everything-ai-ui/test-results/.last-run.json`
- `apps/everything-ai-ui/test-results/everythingai-smoke/*.png`
- Removed stale failure artifact: `apps/everything-ai-ui/test-results/smoke-client-admin-smoke-E-169f0-rated-from-client-workspace-chromium/error-context.md`

## Validation command results

- `git pull --ff-only` - PASS, already up to date.
- `node scripts/framework-doctor.mjs` - PASS.
- `cd apps/everything-ai-ui && npm run typecheck` - PASS.
- `cd apps/everything-ai-ui && npm run build` - PASS.
- `cd apps/everything-ai-ui && node scripts/run-smoke-with-servers.mjs` - PASS, Playwright smoke suite `5 passed`.
- `cd services/api && npm test` - PASS, `173` passed, `0` failed.

Additional runtime notes:

- Initial browser smoke was blocked by a missing Playwright Chromium binary; resolved with `npx playwright install chromium`.
- One rerun was blocked by a stale local Vite process on `127.0.0.1:5151`; only the identified EverythingAI npm/vite/API processes from the failed smoke attempts were stopped before the final run.
- The admin search smoke assertion was narrowed from hard-coded `1/1 visible` to the UI's generic visible-count pattern because the current disposable dataset rendered `2/2 visible`.

## Risks and blockers

- No blocking issues remain for the scoped browser-level smoke pass.
- The current environment contains unrelated dirty files outside this task; they were preserved and not staged for this issue.
- The report cannot embed its own final commit SHA without changing that SHA; the final pushed SHA is recorded in the GitHub issue comment and can be verified from repository history.

## Recommended next task

PM review of the refreshed Forge maintenance evidence for stale open issue #47.

## Artifact commit SHA

Recorded in the final GitHub issue comment after push.
