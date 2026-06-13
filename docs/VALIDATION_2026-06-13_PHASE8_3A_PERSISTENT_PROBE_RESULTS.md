# Validation - Phase 8.3A Persistent Connector Probe Results

Date: 2026-06-13

## Scope

This artifact documents the Phase 8.3A follow-up batch that threads connector version-probe results through the Admin UI runtime.

## Files changed

- apps/everything-ai-ui/src/admin/AdminRuntimeApp.tsx
- apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx
- apps/everything-ai-ui/src/admin/components/SettingsView.tsx
- docs/VALIDATION_2026-06-13_PHASE8_3A_PERSISTENT_PROBE_RESULTS.md

## Implemented

Persistent connector probe result wiring now flows through:

1. AdminRuntimeApp
2. AdminViewRouter
3. SettingsView
4. AgentConnectorsPanel

AdminRuntimeApp now stores probe results in local React state keyed by connector id. When a version probe completes, the payload returned by the backend is retained and passed down to the connector panel.

The connector panel already supports optional probe results. This batch connects the runtime state to that existing panel support.

## Safety boundaries preserved

- No backend command execution behavior changed.
- No connector chat behavior changed.
- No bridge environment defaults changed.
- No Client Workspace connector exposure added.
- No provider or API key behavior changed.
- No trust, quality, human validation, or evidence provenance rules changed.

## Validation result

Status: GREEN

User validated the local smoke runner after this batch.

Command:

- node scripts/run-smoke-with-servers.mjs

Result:

- Backend API reachable during smoke run
- Frontend UI reachable during smoke run
- Playwright smoke: 4 passed, 0 failed
- Duration: about 7.7 seconds

Confirmed smoke coverage included:

- Client Workspace separation
- Client Ask AI message visibility
- Admin Dashboard separation
- Admin Settings and Agent Connectors visibility
- Backend API reachability

## Follow-up

Next safe batch: add a controlled Codex and Claude Code setup checklist inside Admin Agent Connectors without enabling connector chat by default and without changing bridge defaults.
