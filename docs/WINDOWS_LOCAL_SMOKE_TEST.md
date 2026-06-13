# WINDOWS LOCAL SMOKE TEST

Date: 2026-06-07

## Purpose

Use this checklist to verify that the current EverythingAI local MVP works on a Windows machine through the official Client Workspace and Admin Dashboard.

This smoke test is intentionally focused on runtime behavior, not another refactor pass.

Latest validation references:

```text
docs/HANDOVER_2026-06-13_PHASE8_2_CI_SMOKE_COMPLETION.json
docs/VALIDATION_2026-06-13_PHASE8_2_CI_SMOKE_COMPLETION.md
docs/VALIDATION_2026-06-09_AGENT_CONNECTOR_DETECTION.md
docs/VALIDATION_PLAN_2026-06-09_AGENT_VERSION_PROBES.md
docs/VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md
docs/VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md
```

Current validated baseline:

```text
Backend npm test:        113/113 passed
Frontend typecheck:      PASS
Frontend build:          PASS
CI smoke pipeline:       implemented
```

Official local MVP surfaces:

```text
services/api                       Backend API, SQLite persistence, indexing, extraction, search, Wiki/evidence routes, Ask workflows, provider runtime, agent bridge
apps/everything-ai-ui              React frontend
http://127.0.0.1:4100              Backend API
http://localhost:5151              Official Client Workspace
http://localhost:5151/admin.html   Admin Dashboard on the same dev server
http://localhost:5152/admin.html   Optional dedicated Admin Dashboard dev server through npm run dev:admin
```

## Current smoke-test rule

Do not broadly rewrite `apps/everything-ai-ui/src/UserApp.tsx` or admin runtime files as part of this smoke test.

At this milestone:

- `UserApp.tsx` remains the official Client Workspace orchestration layer.
- Client Workspace must not expose provider/API-key configuration.
- Client Workspace must not expose Agent Connectors.
- Admin Dashboard owns provider settings, planning rules, source-path administration, and Agent Connectors.
- UX changes and workflow refactors must not be mixed with smoke-test fixes.

## Prerequisites

From PowerShell:

```powershell
git --version
node -v
npm -v
```

Recommended Node version: Node.js 20 LTS or newer.

## 1. Clone or update repository

If the repository does not exist locally yet:

```powershell
cd C:\temp
git clone https://github.com/moh0709/everythingAI.git EverythingAI
cd C:\temp\EverythingAI
```

If the repository already exists:

```powershell
cd C:\temp\EverythingAI
git pull origin main
```

If Git reports a dubious ownership error, run:

```powershell
git config --global --add safe.directory C:\temp\EverythingAI
```

## 2. Create a safe test folder

Do not test on the full drive or on a large production folder first.

```powershell
mkdir C:\temp\EverythingAI-test-files
Set-Content C:\temp\EverythingAI-test-files\invoice-test.txt "Invoice 123 from Supplier Alpha for project Gamma. Payment terms are 30 days."
Set-Content C:\temp\EverythingAI-test-files\contract-test.md "# Contract`nSupplier Alpha renewal terms and payment conditions for project Gamma."
Set-Content C:\temp\EverythingAI-test-files\notes-test.csv "name,value`nalpha,42"
```

## 3. Start backend and frontend

Backend:

```powershell
cd C:\temp\EverythingAI\services\api
npm run dev
```

Frontend:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run dev
```

Expected URLs:

```text
Backend API:       http://127.0.0.1:4100
Client Workspace:  http://localhost:5151
Admin Dashboard:   http://localhost:5151/admin.html
```

Optional dedicated admin dev server:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run dev:admin
```

Dedicated admin URL:

```text
http://localhost:5152/admin.html
```

Expected result:

- backend dev window opens without startup errors
- frontend dev window opens without startup errors
- Client Workspace loads
- Admin Dashboard loads

If startup fails, copy the full failing terminal output before changing code.

## 4. Backend baseline validation

Run this before declaring a release-grade smoke pass:

```powershell
cd C:\temp\EverythingAI\services\api
npm test
```

Expected current baseline:

```text
113 tests / 113 passed / 0 failed
```

Do not claim a new backend validation result unless this command was actually rerun.

## 5. Frontend baseline validation

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

Expected result:

```text
typecheck: passed
build: passed
```

## 6. Playwright smoke-test agent

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

Expected current baseline:

```text
4 tests / 4 passed / 0 failed
```

The smoke test verifies:

- Client Workspace label is visible.
- Admin Dashboard label is visible.
- Sources & Files and Knowledge Base are clearly distinct.
- Ask AI keeps the latest message visible after submit.
- Client Workspace does not expose AI Provider Configuration.
- Client Workspace does not expose Admin Agent Connectors.
- Admin Settings exposes AI Provider Configuration.
- Admin Settings exposes Admin Agent Connectors.
- Backend `/api/status` is reachable.

## 7. Open the Client Workspace

Open:

```text
http://localhost:5151
```

Verify:

- `CLIENT WORKSPACE` label is visible.
- Home renders correctly.
- Sources & Files is available.
- Knowledge Base is available.
- Ask AI is available.
- Local settings guidance is visible and understandable.
- No provider/API-key configuration is exposed.
- No Agent Connectors are exposed.
- No browser console errors appear on first load.

## 8. Configure local connection settings

Use the local backend URL:

```text
http://127.0.0.1:4100
```

Use the local development token shown by the app/backend configuration.

For the folder path, use only the safe test folder:

```text
C:\temp\EverythingAI-test-files
```

Save the connection/settings from the Client Workspace.

Expected result:

- settings persist in the browser
- no error toast appears
- UI remains responsive

## 9. Build the local knowledge workspace from the UI

From the Client Workspace:

1. Select or enter the safe test folder.
2. Start the build knowledge workspace flow.
3. Watch setup progress.
4. Let the build finish before navigating away.

Expected result:

- folder indexing starts
- extraction runs
- insights/classification run where supported
- Knowledge Base data loads after build
- status messages are clear
- no repeated noisy success toasts from polling/GET requests
- no browser console errors

If this fails, record:

- exact UI step
- visible error message
- backend terminal output
- browser console output

## 10. Verify Sources & Files

Open the Sources & Files page.

Verify:

- indexed files are listed
- search for `supplier` returns the safe test documents
- selecting `invoice-test.txt` or `contract-test.md` loads document context
- source/file metadata is readable
- extracted file text is visible when available
- reveal/open source actions do not break the UI
- no browser console errors appear

## 11. Verify Knowledge Base

Open the Knowledge Base page.

Verify:

- Knowledge Base pages load
- page navigation works
- article content prioritizes real document content over metadata
- page-level search works
- reading mode works
- `[[Related Page]]` navigation works if related pages are present
- source rail renders supporting files
- source cards show path/context/evidence details
- citation badges such as `[S1:C3]` are clickable when present
- clicking a citation highlights or scrolls to the matching source/chunk
- source preview drawer opens and remains usable on the current screen width
- table/image rendering does not break article layout
- no browser console errors appear

## 12. Verify Ask AI

Open Ask AI.

Ask a grounded question such as:

```text
What does the Supplier Alpha contract say about payment terms?
```

Expected result:

- Ask submits successfully
- answer is grounded in indexed source material when available
- source references are shown when available
- latest sent/received messages remain visible without manual scrolling
- no duplicate user/assistant messages are created
- no browser console errors appear

If provider-based chat is not configured, record whether the fallback/error message is understandable and non-breaking.

## 13. Verify Admin Dashboard

Open:

```text
http://localhost:5151/admin.html
```

Verify:

- `ADMIN DASHBOARD` label is visible.
- Operator Control Center is visible.
- Files & Content, Planning, Ask AI, Analytics, and Settings are available.
- Admin Settings exposes AI Provider Configuration.
- Admin Settings exposes Admin Agent Connectors.
- Codex, Claude Code, and OpenCode connector coverage is visible.
- Client-only workspace features are not confused with admin/operator controls.

## 14. Verify Admin Agent Connectors safety boundary

In Admin Settings:

- Refresh Bridge.
- Detect All.
- Confirm bridge status is understandable.
- Confirm connector execution is disabled unless backend environment flags are explicitly set.

Do not enable agent bridge execution unless the user intentionally chooses to test real local connector commands.

Required flags for local execution:

```text
EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true
EVERYTHINGAI_AGENT_CHAT_ENABLED=true
```

## 15. Verify cross-view workflows

From Knowledge Base or Sources & Files:

- ask about the selected Knowledge Base page or document if the UI action exists
- open a Knowledge Base page from a related-page link
- move between Home, Sources & Files, Knowledge Base, and Ask AI

Expected result:

- navigation keeps the app stable
- selected file/page state behaves predictably
- no stale state causes incorrect source details
- no browser console errors appear

## 16. Verify safe action boundaries only inside the test folder

Only test move/rename previews inside:

```text
C:\temp\EverythingAI-test-files
```

Verify:

- destructive delete actions remain disabled or unavailable
- move/rename requires preview
- execution requires explicit approval
- unsafe paths are blocked
- failed execution attempts are audited
- undo restores moved/renamed files when tested

Do not run action execution against personal, production, or system folders during smoke testing.

## 17. Optional CLI sanity checks

These checks are secondary. The current milestone is the official runtime test and Playwright smoke test.

```powershell
cd C:\temp\EverythingAI\services\api
npm run index -- "C:\temp\EverythingAI-test-files"
npm run extract
npm run search -- "supplier"
npm run embeddings
npm run semantic -- "supplier payment terms"
npm run insights -- --limit 10
```

Expected result:

- indexed files count is greater than zero
- extraction finds supported text
- search returns the test documents
- semantic-style search returns relevant files with score above zero
- insights complete without crashing

## 18. Optional watcher test

Use only the safe test folder:

```powershell
cd C:\temp\EverythingAI\services\api
npm run watch -- "C:\temp\EverythingAI-test-files"
```

In another PowerShell window:

```powershell
Set-Content C:\temp\EverythingAI-test-files\watch-test.txt "Watcher test supplier document"
```

Expected result:

- file is indexed after debounce delay
- watcher does not start overlapping rescans
- queued pending rerun behavior does not overload the app

Stop the watcher with:

```text
Ctrl+C
```

## 19. Smoke-test pass criteria

The Windows local MVP smoke test can be marked as passed only when:

- backend tests pass or a previous same-session backend pass is cited
- frontend typecheck passes
- frontend production build passes
- CI smoke pipeline is implemented
- Playwright smoke test passes
- backend starts successfully
- Client Workspace opens at `http://localhost:5151`
- Admin Dashboard opens at `http://localhost:5151/admin.html`
- safe folder can be indexed from the UI
- Sources & Files loads files and document context
- Knowledge Base loads pages, citations, source rail, and source preview drawer
- Ask AI can submit a grounded question or show a clear non-breaking provider/configuration message
- Client Workspace does not expose provider/API-key configuration
- Client Workspace does not expose Agent Connectors
- Admin Dashboard exposes provider configuration and Agent Connectors
- browser console has no blocking errors
- no unsafe file action is allowed without preview and approval

## 20. Smoke-test result template

Use this template when recording the result:

```text
Date:
Machine:
Branch:
Commit SHA:
Backend command:
Frontend command:
Safe test folder:

Backend tests:
Frontend typecheck:
Frontend build:
CI smoke pipeline:
Playwright smoke test:

Client Workspace:
Sources & Files:
Knowledge Base:
Ask AI:
Admin Dashboard:
Admin Agent Connectors:
Safe actions:
Watcher, if run:
Console errors:
Backend errors:

Result: PASS / PARTIAL / FAIL
Notes:
```

## 21. CI smoke-test relationship

Phase 8.2 CI smoke-test integration is complete.

CI workflow:

```text
.github/workflows/ci-smoke.yml
```

CI triggers:

```text
push -> main
pull_request -> main
```

CI smoke jobs:

```text
services/api: npm ci, npm test
apps/everything-ai-ui: npm ci, npm run typecheck, npm run build
apps/everything-ai-ui: npx playwright install --with-deps chromium
apps/everything-ai-ui: npx playwright test smoke/client-admin-smoke.spec.ts
```

CI artifacts:

```text
playwright-report
test-results
```

Local smoke testing remains useful for interactive Windows verification, while CI smoke testing provides repeatable main-branch validation.

## Final rule

Do not claim runtime validation beyond what was actually tested on the Windows machine.
