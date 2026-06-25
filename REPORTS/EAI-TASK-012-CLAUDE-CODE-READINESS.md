# EAI-TASK-012: Verify Claude Code CLI readiness

**Final status:** PASS

## Summary
Validated that Claude Code is available on PATH, reports the expected CLI version, and remains handled only through the safe admin/operator connector path. The repo stayed on `main`, no core product code was changed, framework doctor passed, the API test suite passed, the connector detection/probe commands succeeded, and the UI typecheck/build checks passed.

## Validation results
- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd services/api && npm test` — PASS
- `cd services/api && node src/scripts/detectAgentConnectors.js` — PASS
- `cd services/api && env EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js claudeCode` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `command -v claude` — PASS (`/usr/bin/claude`)
- `claude --version` — PASS (`2.1.191 (Claude Code)`)

## Claude Code readiness summary
- Command path: `/usr/bin/claude`
- Version: `2.1.191 (Claude Code)`
- Detection: PASS
- Version probe: PASS
- Result: Claude Code is usable for safe version/readiness probes on this machine.

## Backend safety findings
PASS. The backend bridge keeps execution constrained:
- `services/api/src/agents/localAgentBridge.js` blocks arbitrary shell execution and only permits safe probe actions (`version`, `help`).
- The bridge remains disabled unless `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true` is set locally.
- Chat execution remains off unless both the bridge and chat flags are set locally.
- `services/api/src/routes/agentBridge.routes.js` exposes only the controlled status, detect, probe, and chat endpoints; detection/probe routes do not execute arbitrary browser-supplied commands.
- Detection/probe results stay limited to safe PATH checks and version probes.

## Admin UI boundary findings
PASS. The admin UI keeps connector controls scoped to Admin settings:
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx` routes `Agent Connectors` into Admin Settings using the `#agent-connectors` hash.
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx` mounts `AgentConnectorsPanel` inside the admin settings experience.
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx` documents Codex and Claude Code as admin/operator targets with chat disabled and readiness checks gated.
- No Client Workspace connector controls were introduced.

## Reported connector detection/probe results
- Claude Code was detected on PATH.
- Claude Code version probe succeeded with `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true`.
- Codex was also detected on PATH and remained handled as an admin/operator connector.
- The safe-probe path stayed in version mode only; no chat execution was enabled.

## Blockers
None.

## Recommended next task
Proceed with the next PM-reviewed ready issue in the queue. No additional Claude Code setup work is required from this task.

## Artifacts
- Terminal log: `LOGS/EAI-TASK-012-terminal.log`
- Handover JSON: `docs/HANDOVER_2026-06-25_EAI_TASK_012_CLAUDE_CODE_READINESS.json`
- Artifact commit SHA: `2c9217f`
