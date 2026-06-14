# Validation - Phase 8.3A Connector Setup Notes

Date: 2026-06-13

## Scope

This artifact documents the Phase 8.3A batch that adds connector-specific setup notes for Codex and Claude Code in Admin Agent Connectors.

## Files changed

- apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx
- apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts
- docs/VALIDATION_2026-06-13_PHASE8_3A_CONNECTOR_SETUP_NOTES.md

## Implemented

Admin Agent Connectors now includes connector-specific setup notes for Codex and Claude Code.

Each primary connector card includes:

1. Recommended command.
2. External app session expectation.
3. Troubleshooting path.
4. Ready-to-advance rule.

The top of the panel also includes a summary card for connector-specific setup notes and a readiness rule.

## Smoke coverage

The Playwright smoke test now checks that Admin Settings includes:

- Connector-specific setup notes.
- Readiness rule.
- Recommended command.
- External app session.
- Troubleshooting path.
- Ready-to-advance rule.

## Safety boundaries preserved

- No backend execution behavior changed.
- No bridge defaults changed.
- No connector chat was enabled.
- No Client Workspace connector exposure was added.
- No provider configuration behavior changed.
- Trust, quality, human validation, and evidence provenance rules were not changed.

## Validation result

Status: GREEN

User validated locally after narrowing the smoke selector for the External app session note.

Results:

- Typecheck: PASS
- Production build: PASS
- Local smoke runner: PASS
- Playwright smoke: 4 passed, 0 failed
- Duration: about 10.0 seconds

The passing smoke run confirms:

- Client Workspace remains separated from Admin Dashboard.
- Admin Settings shows Admin Agent Connectors.
- Connector-specific setup notes are visible.
- Readiness rule is visible.
- Backend API remains reachable.

## Follow-up

Next safe batch: add a small Admin-only connector setup progress snapshot that summarizes Codex and Claude Code readiness at the top of the panel.
