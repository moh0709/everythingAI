# Validation - Phase 8.3A Connector Troubleshooting Guidance

Date: 2026-06-13

## Scope

This artifact documents the Phase 8.3A batch that adds operator guidance to Admin Agent Connectors.

## Files changed

- apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx
- apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts
- docs/VALIDATION_2026-06-13_PHASE8_3A_CONNECTOR_TROUBLESHOOTING_GUIDANCE.md

## Implemented

Admin Agent Connectors now includes guidance for local diagnostics.

The new guidance covers:

1. Local diagnostics refresh order.
2. Smoke runner cleanup reminder.

The refresh order shown in the Admin UI is:

1. Refresh Bridge.
2. Detect.
3. Enable only for controlled diagnostics.
4. Probe Version.
5. Confirm connector chat remains disabled.

The cleanup reminder explains that if local smoke reports port 5151 is already responding, the old UI dev server should be stopped before rerunning the smoke runner.

## Smoke coverage

The Playwright smoke test now checks that Admin Settings includes the new guidance text.

## Safety boundaries preserved

- No backend execution behavior changed.
- No bridge defaults changed.
- No connector chat was turned on.
- No Client Workspace connector exposure was added.
- No provider behavior changed.
- Trust, quality, human validation, and evidence provenance rules were not changed.

## Expected validation

Run from apps/everything-ai-ui:

- npm run typecheck
- npm run build
- node scripts/run-smoke-with-servers.mjs

Expected result:

- Typecheck passes.
- Build passes.
- Playwright smoke passes.

## Follow-up

After this validates green, the next safe batch should prepare a Phase 8.3A completion handover.
