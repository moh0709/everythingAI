# EAI-TASK-011: Controlled Codex connector setup and safe probe verification

## Final status
PASS

## Evidence reviewed
- `services/api/src/agents/localAgentBridge.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/scripts/detectAgentConnectors.js`
- `services/api/src/scripts/probeAgentVersions.js`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `LOGS/EAI-TASK-011-terminal.log`
- `node scripts/framework-doctor.mjs` output
- `npm run typecheck` output
- `npm run build` output
- `npm test` output
- `command -v codex` output
- `codex --version` output
- `node src/scripts/detectAgentConnectors.js` output
- `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex` output

## Files changed
- `LOGS/EAI-TASK-011-terminal.log`
- `REPORTS/EAI-TASK-011-CODEX-CONNECTOR-SETUP.md`
- `docs/HANDOVER_2026-06-26_EAI_TASK_011_CODEX_CONNECTOR_SETUP.json`
- `.hermes/state.json`

## Codex readiness result
- Codex is installed and visible on PATH at `/usr/bin/codex`.
- Codex version is `codex-cli 0.142.0`.
- The detection script reports Codex as found on PATH.
- The safe version probe succeeds with the explicit bridge flag enabled.
- The probe remains version-only; chat execution stays disabled.

## Backend safety findings
- `services/api/src/agents/localAgentBridge.js` keeps command execution off by default and only allows safe actions such as version/help probes.
- Arbitrary shell characters are rejected before execution.
- Chat execution requires separate explicit opt-in and remains disabled in this task.
- The probe script refuses to run without `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true`.

## Admin UI boundary findings
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx` describes the connector surface as admin-only.
- The panel text explicitly states that Client Workspace does not expose Agent Connectors.
- The UI keeps connector chat disabled until explicitly approved.
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx` keeps connectors within the admin settings surface.

## Validation command results
- `git pull --ff-only` — PASS (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — PASS
- `command -v codex` — PASS (`/usr/bin/codex`)
- `codex --version` — PASS (`codex-cli 0.142.0`)
- `node src/scripts/detectAgentConnectors.js` — PASS
- `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS (`127 passed, 1 skipped, 0 failed`)

## Risks and rollback note
- Risk: connector probes remain intentionally limited to safe version/help checks.
- Risk: chat execution is still disabled and must not be enabled casually.
- Rollback is straightforward: keep the bridge flags off and leave the admin connector surface unchanged.

## Immediate next implementation task
- Repeat the same controlled readiness verification pattern for Claude Code, keeping connector chat disabled unless explicitly approved.

## Artifact commit SHA
- PENDING_COMMIT_SHA

## Final pushed commit SHA
- PENDING_COMMIT_SHA

## Lifecycle notes
- Issue comment: pending
- Labels updated: `hermes:working` added; will transition to `pm:review` and `hermes:done`
- Final SHA handling: follow-up metadata synchronization commit will update `.hermes/state.json` and this report once the artifact commit SHA is known.

## Skipped commands / reasons
- None.

## Follow-up
- Claude Code readiness verification and the next connector hardening task.
