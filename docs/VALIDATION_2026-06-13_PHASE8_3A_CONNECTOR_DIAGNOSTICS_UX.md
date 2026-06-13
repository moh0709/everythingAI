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

## Validation commands to run locally

These commands should be run from the local Windows repository:

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

```powershell
cd E:\01PROJEKTER\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

## Expected result

```text
Backend tests: PASS
Frontend typecheck: PASS
Frontend build: PASS
Playwright smoke: PASS
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
