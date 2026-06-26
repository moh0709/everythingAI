# EAI-TASK-009: Rerun Admin Connector readiness after CLI install

**Final status:** PASS

## Summary
This task reran the admin connector readiness gate after the local CLI install. Validation passed for the framework doctor, API tests, UI typecheck, UI build, and safe Codex/Claude Code version probes. The admin/user runtime boundary remains intact and no production behavior was changed.

## Reference-check results
- `services/api/src/agents/localAgentBridge.js` keeps command execution behind `EVERYTHINGAI_AGENT_BRIDGE_ENABLED`, restricts probes to safe actions, and blocks arbitrary shell execution.
- `services/api/src/scripts/detectAgentConnectors.js` only performs PATH detection and does not run version probes or chat execution.
- `services/api/src/scripts/probeAgentVersions.js` only performs safe version probes when the bridge flag is enabled.
- `apps/everything-ai-ui/src/main.tsx` boots `UserApp`, so the Client Workspace path stays separate.
- `apps/everything-ai-ui/src/admin-main.tsx` boots `AdminApp`, so the admin runtime stays separate.
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx` renders `AgentConnectorsPanel` inside Admin Settings only.
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx` documents connector setup as an admin-only diagnostic flow.

## Active runtime boundary confirmation
- User runtime: `main.tsx` → `UserApp`.
- Admin runtime: `admin-main.tsx` → `AdminApp` → `SettingsView` → `AgentConnectorsPanel`.
- No Client Workspace connector controls were introduced.
- No admin boundary weakening was observed.

## Validation results
- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd services/api && npm test` — PASS (`114` tests total, `113` passed, `1` skipped)
- `cd services/api && node src/scripts/detectAgentConnectors.js` — PASS
- `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex claudeCode` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `command -v codex` / `codex --version` — PASS (`/usr/bin/codex`, `codex-cli 0.142.0`)
- `command -v claude` / `claude --version` — PASS (`/usr/bin/claude`, `2.1.191 (Claude Code)`)

## Exact files changed
- `LOGS/EAI-TASK-009-terminal.log`
- `REPORTS/EAI-TASK-009-ADMIN-CONNECTOR-READINESS-RERUN.md`
- `docs/HANDOVER_2026-06-24_EAI_TASK_009_CONNECTORS_READY.json`
- `.hermes/state.json`

## Risks and rollback note
- No product code was changed.
- Risk is limited to task artifacts and metadata.
- Rollback is a normal git revert of the artifact commit.

## Recommended next task
**EAI-TASK-011: Controlled Codex connector setup and safe probe verification**

## Artifact commit SHA
`d83975021d57ec267a5ad3ca9f9819ba77a0eba1`
