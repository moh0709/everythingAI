# EAI-TASK-009: Admin Connector Readiness Rerun

**Final status:** PASS

## Summary
Reran the Admin Connector readiness gate after the Codex and Claude Code CLIs were installed and verified on the Hermes machine. The backend bridge remains safety-gated, the admin UI boundary is intact, both required connectors are now detected and version-probed successfully, and no product behavior was changed.

## Inspected files
- `services/api/src/agents/localAgentBridge.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/scripts/detectAgentConnectors.js`
- `services/api/src/scripts/probeAgentVersions.js`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `.hermes/state.json`

## Validation results
- `command -v codex` — PASS (`/usr/bin/codex`)
- `codex --version` — PASS (`codex-cli 0.142.0`)
- `command -v claude` — PASS (`/usr/bin/claude`)
- `claude --version` — PASS (`2.1.191 (Claude Code)`)
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `cd services/api && npm test` — PASS (`113` tests, `112` passed, `1` skipped, `0` failed)
- `cd services/api && node src/scripts/detectAgentConnectors.js` — PASS
- `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex claudeCode` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS

## Connector readiness results
### Codex
- Command: `/usr/bin/codex`
- Version: `codex-cli 0.142.0`
- Detection: PASS
- Version probe: PASS
- Usable today: **yes**

### Claude Code
- Command: `/usr/bin/claude`
- Version: `2.1.191 (Claude Code)`
- Detection: PASS
- Version probe: PASS
- Usable today: **yes**

### Detection / probe summary
- Detection result: both required connectors were found on PATH.
- Version probe result: both required connectors returned a safe version response.
- Bridge policy: command execution stayed explicitly opt-in, chat execution remained disabled, and arbitrary shell execution remained blocked.

## Admin UI boundary result
- `AgentConnectorsPanel` is still rendered from `SettingsView` inside the admin-only settings surface.
- `AdminHeader` routes Agent Connectors to the `#agent-connectors` anchor and scrolls to the admin panel.
- The inspected UI files do not expose connector controls to the Client Workspace.
- No product boundary weakening was observed.

## Connector gate status
The connector gate is now **cleared**.

## Recommended next task
No other runnable `pm:ready` + `hermes:ready` issue was available at the time of this rerun. Wait for the next PM task, or proceed with the next backlog item once it is opened.

## Artifact commit SHA
`f71b48777b603abf4bc74f235f633221a12bcdfa`
