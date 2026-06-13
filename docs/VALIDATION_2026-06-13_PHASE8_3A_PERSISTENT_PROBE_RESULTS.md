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

## Expected validation

Run from apps/everything-ai-ui:

- npm run typecheck
- npm run build
- node scripts/run-smoke-with-servers.mjs

Expected result:

- Typecheck passes.
- Build passes.
- Playwright smoke passes.
- Admin Settings still shows Agent Connectors.
- Version probe output remains visible in the connector card after a probe completes.

## Follow-up

After validation, the next safe batch should add a controlled Codex and Claude Code setup checklist inside Admin Agent Connectors without enabling chat by default.
