# Validation - Phase 8.3A Controlled Connector Setup Checklist

Date: 2026-06-13

## Scope

This artifact documents the Phase 8.3A UI and smoke-test batch for controlled Codex and Claude Code connector setup guidance.

## Files changed

- apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx
- apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts
- docs/VALIDATION_2026-06-13_PHASE8_3A_CONTROLLED_SETUP_CHECKLIST.md

## Implemented

### Controlled setup checklist

Admin Agent Connectors now includes a controlled setup checklist for Phase 8.3A targets.

The checklist is shown on Codex and Claude Code connector cards and tracks these readiness items:

1. Saved command is safe.
2. CLI detected on PATH.
3. Connector enabled only for controlled diagnostics.
4. Bridge execution flag verified locally.
5. Version probe completed.
6. Connector chat remains disabled.

### Readiness summary

Codex and Claude Code cards now show a readiness count such as:

- Controlled setup readiness: 2/6 setup checks complete

This helps admins see progress without treating a connector as fully ready too early.

### Operator guardrails

The panel now highlights guardrails:

- Detection and version probes are allowed.
- Connector chat remains blocked until explicitly approved.
- Workspace context should not be enabled for general users.
- Client Workspace must stay provider-only and must never expose Agent Connectors.

### Smoke coverage

The Playwright smoke test now verifies that Admin Settings includes:

- Controlled setup checklist
- Operator guardrails
- Controlled setup readiness
- Saved command is safe
- CLI detected on PATH
- Connector chat remains disabled

## Safety boundaries preserved

- No backend execution behavior changed.
- No bridge defaults changed.
- No connector chat was enabled.
- No Client Workspace connector exposure was added.
- Provider and API key settings remain Admin-only.
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

After this validates green, the next safe batch should add connector-specific setup notes for Codex and Claude Code, including command/auth notes and troubleshooting hints, while still keeping chat disabled by default.
