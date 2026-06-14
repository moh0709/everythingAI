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

## Validation result

Status: GREEN

User validated both smoke-runner paths locally.

Results:

- Typecheck: PASS
- Production build: PASS
- Early stale-frontend guard: PASS
- Local smoke runner after cleanup: PASS
- Playwright smoke: 4 passed, 0 failed
- Duration after cleanup: about 10.5 seconds

Confirmed behavior:

- Runner exits early when port 5151 is already occupied by an old frontend server.
- Runner prints cleanup guidance instead of testing a stale UI instance.
- After old frontend cleanup, runner starts its own UI and smoke tests pass.

## Follow-up

Next safe batch: add a small troubleshooting section to the Admin Agent Connectors panel for local diagnostics refresh order.
