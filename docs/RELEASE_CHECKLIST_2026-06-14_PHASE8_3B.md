# EverythingAI — Phase 8.3B Release Hardening Checklist

Date: 2026-06-14
Phase: 8.3B release hardening
Status: Multiple Phase 8.3B batches GREEN locally

## Source of truth

Latest handover to read first: docs/HANDOVER_2026-06-13_PHASE8_3A_CONNECTOR_DIAGNOSTICS_COMPLETION.json

Phase 8.3A validated baseline: GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS

Recommended local validation helper: cd C:\temp\EverythingAI\apps\everything-ai-ui, then git pull, then .\scripts\clean-and-smoke.bat

## Release hardening scope

- [x] Preserve Client Workspace / Admin Dashboard separation.
- [x] Keep Agent Connectors admin-only.
- [x] Keep provider selection, API keys, remote-provider policy, and planning policy admin-only.
- [x] Keep agent bridge execution disabled by default.
- [x] Keep agent chat execution disabled by default.
- [x] Do not enable arbitrary browser shell execution.
- [x] Do not weaken trust-score, quality-score, human-validation, diagnostics, artifacts, evidence, or source provenance.

## Phase 8.3A completion carried forward

- [x] Admin connector diagnostics UX.
- [x] Persistent probe-result wiring.
- [x] Controlled setup checklist.
- [x] Connector-specific setup notes.
- [x] Primary connector progress snapshot.
- [x] Local diagnostics troubleshooting guidance.
- [x] Smoke-runner port guard.
- [x] Windows clean-and-smoke helper.
- [x] Phase 8.3A completion handover.

## Phase 8.3B completed green batches

### API key lifecycle UX

- [x] No-key, saved-key, replacement-key, and clear-key states are visible to admins.
- [x] Saved secrets remain masked.
- [x] Admin smoke coverage exists for the lifecycle UI.
- [x] Smoke selector ambiguity was fixed.
- [x] Smoke-helper diagnostics were improved.
- [x] Local validation confirmed GREEN.
- Validation artifact: docs/VALIDATION_2026-06-14_PHASE8_3B_API_KEY_LIFECYCLE_UX.md

### Admin cleanup and shared frontend types

- [x] Stale admin boundary documentation corrected.
- [x] Active modular admin runtime path documented.
- [x] Legacy root app files documented as reference-only prototypes.
- [x] AgentProbeResult frontend type centralized in providerSettingsApi.ts.
- [x] AdminRuntimeApp.tsx and SettingsView.tsx consume the shared probe-result type.
- [x] Local validation confirmed GREEN.
- Validation artifact: docs/VALIDATION_2026-06-14_PHASE8_3B_ADMIN_CLEANUP_SHARED_TYPES.md

### Wiki chunk citation highlighting

- [x] Chunk-level citation references are preserved when opening Knowledge Base source previews.
- [x] Existing WikiView.tsx chunk-ref handling can pass the exact source chunk to WikiSourcePreviewDrawer.
- [x] Backend schema and API contracts remain unchanged.
- [x] Local validation confirmed GREEN.
- Validation artifact: docs/VALIDATION_2026-06-14_PHASE8_3B_WIKI_CHUNK_CITATION_HIGHLIGHTING.md

### Release checklist and validation discipline

- [x] Add this Phase 8.3B release-hardening checklist.
- [x] Run local Windows validation after pulling latest main for each completed batch.
- [x] Record green local validation artifacts for completed batches where connector writes succeeded.
- [ ] Confirm GitHub Actions state after the pushed commits finish.

Confirmed local validation summary for completed batches: GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS

## Deferred / tracked follow-ups

- [ ] Continue frontend modularization and cleanup of legacy admin paths without broad refactors.
- [ ] Improve extracted document formatting.
- [ ] Continue citation/source highlighting polish beyond chunk-ref preservation.
- [ ] Track GitHub Actions Node runtime warning maintenance.
- [ ] Track frontend dependency audit warnings without force-upgrading blindly.

## Required validation before declaring a future Phase 8.3B batch complete

Run the local Windows helper from apps/everything-ai-ui after pulling latest main. Expected final summary: GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS.

Optional backend baseline: run npm test from services/api.

## Notes

This checklist intentionally does not approve connector chat, bridge execution, arbitrary shell execution, or exposure of admin-only provider/connector controls in Client Workspace.
