# Validation — Phase 8.3B Smoke Locator Repair

Date: 2026-06-17
Phase: 8.3B release hardening
Batch: smoke-test stability repair

## Files changed

- apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts
- docs/VALIDATION_2026-06-17_PHASE8_3B_SMOKE_LOCATOR_REPAIR.md

## Scope

This batch repairs a smoke-test locator in the Client Workspace Ask AI smoke test.

The implementation code was not changed. The production UI behavior was not changed.

## Issue fixed

The Ask AI smoke test originally selected the smoke prompt text globally. The same text could appear in both the user message and the assistant response, causing Playwright strict-mode ambiguity.

A first repair narrowed the selector to a guessed chat class. Local validation showed that the guessed class did not match the current AskView DOM.

The final repair uses the actual AskView DOM class for user chat bubbles.

## Implementation

Updated the smoke test in:

- apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts

The locator now targets the user chat bubble rendered by AskView, then verifies that this user message remains visible and in viewport after submit.

## Safety boundaries preserved

- Client Workspace and Admin Dashboard separation unchanged.
- No provider selection exposed to Client Workspace.
- No API key exposure added to Client Workspace.
- No Agent Connector exposure added to Client Workspace.
- No agent bridge execution enabled.
- No agent chat execution enabled.
- No arbitrary browser shell execution enabled.
- No backend schema or API contract changed.
- No trust-score, quality-score, human-validation, diagnostics, artifact, evidence, or source-provenance logic changed.

## Validation status

Local validation was executed by the user from the EverythingAI UI app folder after pulling latest main.

Confirmed local validation summary:

```text
Port cleanup: PASS
Git pull: PASS
Typecheck: PASS
Build: PASS
Smoke: PASS - Playwright smoke completed successfully
Final result: GREEN
```

## Current result

Status: GREEN — git pull PASS, typecheck PASS, build PASS, smoke PASS.
