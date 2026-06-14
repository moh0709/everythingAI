# EverythingAI — Phase 8.3B Release Hardening Checklist

Date: 2026-06-14
Phase: 8.3B release hardening
Status: In progress

## Source of truth

Latest handover to read first:

```text
docs/HANDOVER_2026-06-13_PHASE8_3A_CONNECTOR_DIAGNOSTICS_COMPLETION.json
```

Phase 8.3A validated baseline:

```text
GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS
```

Recommended local validation helper:

```bat
cd C:\temp\EverythingAI\apps\everything-ai-ui
git pull
.\scripts\clean-and-smoke.bat
```

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

## Phase 8.3B active checklist

### API key lifecycle UX

- [x] Show when the active remote-provider API key is not configured.
- [x] Show when a replacement API key is staged locally before saving.
- [x] Keep saved secrets masked instead of rendering the saved sentinel as visible field content.
- [x] Provide clear operator copy for saved / replace / clear behavior.
- [x] Provide a clear saved-key removal action when the backend reports a saved key.
- [x] Cover the lifecycle UI in the admin smoke test.

### Release checklist and validation discipline

- [x] Add this Phase 8.3B release-hardening checklist.
- [ ] Run local Windows validation after pulling latest `main`.
- [ ] Record green local validation artifact after `clean-and-smoke.bat` passes.
- [ ] Confirm GitHub Actions state after the pushed commits finish.

### Deferred / tracked follow-ups

- [ ] Continue frontend modularization and cleanup of legacy admin paths without broad refactors.
- [ ] Improve citation/source highlighting and extracted document formatting.
- [ ] Track GitHub Actions Node runtime warning maintenance.
- [ ] Track frontend dependency audit warnings without force-upgrading blindly.

## Required validation commands before declaring Phase 8.3B complete

```bat
cd C:\temp\EverythingAI\apps\everything-ai-ui
git pull
.\scripts\clean-and-smoke.bat
```

Expected final summary:

```text
GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS
```

Optional backend baseline:

```bat
cd C:\temp\EverythingAI\services\api
npm test
```

## Notes

This checklist intentionally does not approve connector chat, bridge execution, arbitrary shell execution, or exposure of admin-only provider/connector controls in Client Workspace.
