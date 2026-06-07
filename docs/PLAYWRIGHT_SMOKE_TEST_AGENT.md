# EverythingAI Playwright Smoke Test Agent

This smoke-test agent runs locally on the user's machine and verifies the running Client Workspace and Admin Dashboard UI.

It does not require ChatGPT to control the desktop. Instead, Playwright opens the app in a browser, clicks through the UI, asserts important labels, checks backend reachability, and saves screenshots.

## Prerequisites

Start the backend in one terminal:

```powershell
cd C:\temp\EverythingAI\services\api
npm run dev
```

Start the frontend in another terminal:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run dev
```

Default URLs:

- Client Workspace: `http://localhost:5151`
- Admin Dashboard: `http://localhost:5151/admin.html`
- Backend API: `http://localhost:4100`

## First-time Playwright setup

From the UI app folder:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright install chromium
```

If Playwright is not installed yet, `npx` may ask to install it. Accept the prompt.

## Run the smoke-test agent

Headless mode:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium
```

Visible browser mode:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

## Optional environment overrides

```powershell
$env:EVERYTHINGAI_UI_URL="http://localhost:5151"
$env:EVERYTHINGAI_API_URL="http://localhost:4100"
$env:EVERYTHINGAI_SMOKE_ARTIFACT_DIR="test-results/everythingai-smoke"
```

Then run the same Playwright command.

## What the agent verifies

Client Workspace:

- `CLIENT WORKSPACE` badge is visible.
- Navigation shows Home, Sources & Files, Knowledge Base, and Ask AI.
- Sources & Files clearly says it is for raw indexed files and extracted file content.
- Knowledge Base clearly says it is a saved knowledge database generated from indexed files.
- Ask AI clearly says it asks about the Knowledge Base.
- Ask message remains visible after submit, confirming the auto-scroll fix.

Admin Dashboard:

- `ADMIN DASHBOARD` badge is visible.
- Operator Control Center heading is visible.
- Admin copy explains that normal users should use the Client Workspace.
- Files & Content navigation exists.
- Settings page exposes AI Provider Configuration and remote provider policy.

Backend:

- `GET /api/status` is reachable.

## Screenshots

Screenshots are saved under:

```text
test-results/everythingai-smoke/
```

Expected screenshot names:

- `01-client-home.png`
- `02-client-sources-files.png`
- `03-client-knowledge-base.png`
- `04-client-ask-ai.png`
- `05-client-ask-after-message.png`
- `06-admin-dashboard.png`
- `07-admin-files-content.png`
- `08-admin-settings-providers.png`

## Interpreting failures

If a label assertion fails, the UI copy or navigation changed and the smoke test should be updated or the UI should be corrected.

If the backend API test fails, confirm the backend is running on port `4100` and that `/api/status` is available.

If the Ask AI message visibility test fails, check `apps/everything-ai-ui/src/user/AskView.tsx` auto-scroll behavior.
