# Validation - Phase 8.3A Smoke Runner Port Polish

Date: 2026-06-13

## Scope

This artifact documents the Phase 8.3A batch that improves local smoke runner reliability when old dev servers are still running.

## Files changed

- apps/everything-ai-ui/scripts/run-smoke-with-servers.mjs
- docs/VALIDATION_2026-06-13_PHASE8_3A_SMOKE_RUNNER_PORT_POLISH.md

## Implemented

The local smoke runner now performs a frontend port preflight before starting Vite.

If the configured frontend URL is already responding, the runner stops immediately and prints cleanup guidance. This prevents Playwright from accidentally testing a stale UI server.

The runner now starts Vite with strict port behavior so Vite does not silently move from port 5151 to another port while Playwright still targets 5151.

The runner also prints clearer cleanup guidance for Windows and Unix-like systems.

## Safety boundaries preserved

- No backend execution behavior changed.
- No connector bridge defaults changed.
- No connector chat was enabled.
- No Client Workspace connector exposure was added.
- No provider configuration behavior changed.
- Trust, quality, human validation, and evidence provenance rules were not changed.

## Expected validation

Run from apps/everything-ai-ui:

- npm run typecheck
- npm run build
- node scripts/run-smoke-with-servers.mjs

Expected result when no old frontend server is running:

- Typecheck passes.
- Build passes.
- Playwright smoke passes.

Expected result when an old frontend server is already running on the configured frontend URL:

- Runner exits early.
- Runner explains that the old UI dev server should be stopped.
- Runner avoids testing a stale UI instance.

## Follow-up

After this validates green, the next safe batch should add a small troubleshooting section to the Admin Agent Connectors panel for local diagnostics refresh order.
