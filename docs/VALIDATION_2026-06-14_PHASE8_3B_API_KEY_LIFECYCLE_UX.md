# Validation — Phase 8.3B API Key Lifecycle UX

Date: 2026-06-14
Phase: 8.3B release hardening
Batch: API key lifecycle UX and release checklist

## Files changed

```text
apps/everything-ai-ui/src/admin/components/ProviderConfigurationPanel.tsx
apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts
apps/everything-ai-ui/scripts/clean-and-smoke.bat
docs/RELEASE_CHECKLIST_2026-06-14_PHASE8_3B.md
docs/VALIDATION_2026-06-14_PHASE8_3B_API_KEY_LIFECYCLE_UX.md
```

## Scope

This batch improves operator visibility around remote-provider API key lifecycle handling in Admin Settings.

It covers:

- saved-key visibility
- replacement-key staging visibility
- clear saved-key action visibility
- smoke coverage for the API key lifecycle UI
- Phase 8.3B release checklist creation
- smoke-helper diagnostics for the smoke stage

## Safety boundaries preserved

- Client Workspace still does not expose provider selection.
- Client Workspace still does not expose API keys.
- Client Workspace still does not expose Agent Connectors.
- Admin Dashboard remains the owner of provider settings and API-key configuration.
- Agent bridge execution remains disabled by default.
- Agent chat execution remains disabled by default.
- No arbitrary browser shell execution was enabled.
- No trust-score, quality-score, human-validation, diagnostics, artifact, evidence, or source-provenance logic was changed.

## Implementation notes

### ProviderConfigurationPanel.tsx

Remote-provider API key input now treats the backend `__saved__` marker as a masked saved-key state instead of rendering it as field content.

The UI now shows:

- `API key lifecycle: Saved key present` when the backend reports a saved key.
- `API key lifecycle: Replacement key staged` when an operator enters a new key before saving.
- `API key lifecycle: No key configured` when no key is configured.
- `Clear saved key` when a saved key exists.

Typing a new value stages a replacement. Clearing the saved key sets the draft API key to an empty string, matching the existing backend behavior where empty input clears the saved key.

### client-admin-smoke.spec.ts

The admin smoke test now verifies that:

- remote providers can be enabled in the admin-only Settings view,
- OpenAI provider configuration can be selected,
- API key lifecycle guidance is visible,
- no-key state is visible,
- entering a draft key shows replacement-staged state.

A strict selector issue was fixed after local validation showed that `/OpenAI/` also matched Azure OpenAI and Custom OpenAI. The smoke test now targets the exact OpenAI provider card.

### clean-and-smoke.bat

The Windows clean smoke helper now reports a clearer smoke-stage failure reason instead of leaving the smoke result as `NOT RUN` when the smoke runner exits early.

### RELEASE_CHECKLIST_2026-06-14_PHASE8_3B.md

A Phase 8.3B release-hardening checklist was added to track the active hardening scope and validation gates.

## Validation status

GitHub file updates were completed directly on `main`.

Local Windows validation was executed by the user from:

```bat
cd C:\temp\EverythingAI\apps\everything-ai-ui
git pull
.\scripts\clean-and-smoke.bat
```

Confirmed local validation summary:

```text
=== EVERYTHINGAI VALIDATION SUMMARY ===
Port cleanup: PASS
Stopped ports:  4100 5151
Git pull: PASS
Typecheck: PASS
Build: PASS
Smoke: PASS - Playwright smoke completed successfully
Final result: GREEN
Report this to ChatGPT: GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS.
=======================================
```

Optional backend baseline remains available:

```bat
cd C:\temp\EverythingAI\services\api
npm test
```

## Current result

Status: GREEN — git pull PASS, typecheck PASS, build PASS, smoke PASS.
