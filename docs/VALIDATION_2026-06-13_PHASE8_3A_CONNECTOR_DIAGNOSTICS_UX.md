# Validation — 2026-06-13 Phase 8.3A Connector Diagnostics UX

## Scope

This validation artifact documents the first Phase 8.3A implementation batch for Admin Agent Connector diagnostics.

The work intentionally stays inside the existing safety model:

- Agent Connectors remain Admin-only.
- Client Workspace does not expose connector configuration.
- Agent bridge execution remains disabled by default.
- Agent chat execution remains disabled by default.
- Browser-submitted arbitrary shell execution remains blocked.
- Codex and Claude Code remain the only primary Phase 8.3A setup targets.
- OpenCode, Kilo Code, Cline, Aider, and Continue remain documented as not installed / not on PATH until explicitly installed.

## Files changed

```text
apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx
apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts
apps/everything-ai-ui/scripts/run-smoke-with-servers.mjs
docs/VALIDATION_2026-06-13_PHASE8_3A_CONNECTOR_DIAGNOSTICS_UX.md
```

## Implemented

### 1. Connector Health Summary

The Admin Agent Connectors panel now shows a high-level connector diagnostics summary:

```text
Connector Health Summary
- detected count
- missing count after detection
- version probe pass count
```

This gives the admin/operator a clearer snapshot before drilling into individual connectors.

### 2. Phase 8.3A scope visibility

The panel now explicitly marks the current connector-hardening scope:

```text
Primary setup targets are Codex and Claude Code.
OpenCode, Kilo Code, Cline, Aider, and Continue stay documented as not installed until explicitly installed.
```

This prevents optional connector entries from being mistaken as currently installed or required.

### 3. Per-connector health state

Each connector now derives a visible health state from:

- bridge status
- command safety
- detection result
- optional version probe result
- configured enabled/chat flags

Possible states include:

```text
Status not loaded
Phase 8.3A target pending detection
Pending detection
Detected on PATH
Documented as not installed
Not detected on PATH
Unsafe command blocked
Version probe passed
Version probe blocked or failed
```

### 4. Per-connector next action

Each connector now shows a short admin-oriented next action, such as:

```text
Run Detect for this Phase 8.3A connector.
Enable the connector only when running controlled local diagnostics.
Run Probe Version with bridge flag enabled locally.
Keep documented as not installed / not on PATH until explicitly installed.
```

This improves operator guidance without enabling unsafe execution.

### 5. Probe result display support

The panel now supports displaying stored per-connector probe results when provided by the surrounding Admin runtime.

Current compatibility note:

- `probeResults` is optional in the panel props.
- Existing SettingsView wiring remains compatible.
- A later follow-up can thread persisted probe results through `AdminRuntimeApp`, `AdminViewRouter`, and `SettingsView` when those files are edited in a separate safe patch.

### 6. Smoke-test coverage

The Admin smoke test now verifies that Admin Settings contains:

- `Connector Health Summary`
- `Phase 8.3A scope`
- Codex + Claude Code primary target wording
- missing-connector guidance for OpenCode, Kilo Code, Cline, Aider, and Continue

### 7. Local smoke runner

Added a local smoke runner that starts the backend API and frontend dev server before running Playwright.

```text
apps/everything-ai-ui/scripts/run-smoke-with-servers.mjs
```

The runner:

- starts `services/api` with `npm start`
- waits for `http://127.0.0.1:4100/api/status` to return HTTP 200 or 401
- starts `apps/everything-ai-ui` with `npm run dev -- --host 127.0.0.1`
- waits for `http://127.0.0.1:5151`
- runs `npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed`
- stops the child processes afterward

## Validation commands run by user

Backend tests passed from:

```powershell
cd C:\temp\EverythingAI\services\api
npm test
```

Result:

```text
tests 113
pass 113
fail 0
```

Frontend typecheck and build passed from:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

Result:

```text
TypeScript typecheck: PASS
Vite production build: PASS
```

Playwright smoke failed because required local servers were not running:

```text
http://localhost:5151 -> connection refused
http://localhost:4100 -> connection refused
```

This was an environment/startup issue, not a product assertion failure.

## Updated local smoke command

Use this command from the UI folder to start required services and run Playwright in one step:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
node scripts/run-smoke-with-servers.mjs
```

## Expected result

```text
Backend tests: PASS
Frontend typecheck: PASS
Frontend build: PASS
Playwright smoke with server runner: PASS
GitHub CI: should remain GREEN after push to main
```

## Risk review

### Preserved

- No backend command execution behavior changed.
- No bridge or chat environment defaults changed.
- No Client Workspace connector exposure added.
- No provider/API-key behavior changed.
- No trust-score, quality-score, human-validation, or evidence governance logic changed.

### Known follow-up

Probe results are visually supported by the panel, but full persistent probe-result threading through the Admin runtime should be completed in a separate patch because it touches broader SettingsView/AdminViewRouter wiring.
