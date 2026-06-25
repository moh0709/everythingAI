# EAI-TASK-012: Claude Code CLI readiness

## Final status

**BLOCKED** — validation and readiness checks passed, but the task also required updating `.hermes/state.json`. That file does not exist in this repository checkout, and the workflow guard only allows updating it if it already exists.

## Issue

- GitHub issue: #34
- Issue title: EAI-TASK-012: Verify Claude Code CLI readiness

## Repository / branch

- Repository: `moh0709/everythingAI`
- Branch: `main`

## Artifact summary

- `LOGS/EAI-TASK-012-terminal.log` — created
- `REPORTS/EAI-TASK-012-CLAUDE-CODE-READINESS.md` — created
- `docs/HANDOVER_2026-06-25_EAI_TASK_012_CLAUDE_CODE_READINESS.json` — created
- `.hermes/state.json` — not present, therefore not updated

## Validation summary

- `git pull --ff-only` — passed (`Already up to date.`)
- `node scripts/framework-doctor.mjs` — passed
- `cd services/api && npm test` — passed (113 tests passed, 1 skipped)
- `cd services/api && node src/scripts/detectAgentConnectors.js` — passed
- `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js claudeCode` — passed
- `cd apps/everything-ai-ui && npm run typecheck` — passed
- `cd apps/everything-ai-ui && npm run build` — passed
- `command -v claude` — passed (`/usr/bin/claude`)
- `claude --version` — passed (`2.1.191 (Claude Code)`)

## Claude Code readiness summary

- Claude Code is installed and visible on PATH at `/usr/bin/claude`.
- Version check returned `2.1.191 (Claude Code)`.
- Connector detection reported `claudeCode` as found on PATH.
- Safe version probe succeeded with bridge opt-in enabled locally.
- No chat execution was attempted.
- No arbitrary shell execution was enabled.

## Backend safety findings

- The agent bridge defaults remain disabled for command execution and chat execution.
- The safe command allow-list is limited to `version` and `help`.
- The probe script requires explicit local bridge opt-in and refuses to run when chat is enabled.
- The detection/probe scripts report status without enabling agent chat.
- API tests covering bridge safety passed.

## Admin UI boundary findings

- Agent connectors remain within the Admin settings flow.
- `AdminHeader.tsx` routes Agent Connectors from the admin header into the settings section via `#agent-connectors`.
- `SettingsView.tsx` mounts `AgentConnectorsPanel` alongside other admin-only settings panels.
- No client workspace exposure was observed in the inspected files.
- No product boundary change was required for this validation task.

## Notable inspected files

- `services/api/src/agents/localAgentBridge.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/scripts/detectAgentConnectors.js`
- `services/api/src/scripts/probeAgentVersions.js`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`

## Blockers

- `.hermes/state.json` is absent, so it could not be updated.
- Because of that, the exact artifact set requested by the issue is incomplete.

## Recommendation

- If the repository owner wants this task to be fully accepted, add the Hermes state file to the repo and rerun the readiness task, or explicitly relax the state-file requirement for this branch of the workflow.

## Artifact commit SHA

- `PENDING_COMMIT_SHA`
