# EAI-TASK-007 — Admin Agent Connectors readiness gate

## Result

**Final status:** BLOCKED

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Issue number:** `29`
- **Starting commit SHA:** `e975f7a7af67cfd1013e29bbf58f851454e2aa6f`
- **Artifact commit SHA:** `5db17fecd0e79300a0a5df21065b5518ebbd9b31`
- **Finalization pattern:** Two-step post-commit sync. The validation log was committed first, then this report and handover metadata were written in a follow-up synchronization commit.

## Inspected files

- `services/api/src/agents/localAgentBridge.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/settings/aiProviderSettings.js`
- `services/api/src/scripts/detectAgentConnectors.js`
- `services/api/src/scripts/probeAgentVersions.js`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`

## Validation summary

- `git pull --ff-only`: PASS
- `node scripts/framework-doctor.mjs`: PASS
- `cd services/api && npm test`: PASS
- `cd services/api && node src/scripts/detectAgentConnectors.js`: PASS
- `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js`: PASS
- `cd apps/everything-ai-ui && npm run typecheck`: PASS
- `cd apps/everything-ai-ui && npm run build`: PASS

## Codex readiness result

- **Detected:** no
- **Version result:** unavailable because `codex` is not on PATH
- **Usable today:** no
- **Setup still needed:** install the Codex CLI on the machine and make it available on PATH

## Claude Code readiness result

- **Detected:** no
- **Version result:** unavailable because `claude` is not on PATH
- **Usable today:** no
- **Setup still needed:** install the Claude Code CLI on the machine and make it available on PATH

## Backend safety findings

- Local bridge execution is disabled by default and requires explicit `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true`.
- Agent chat is separately gated behind `EVERYTHINGAI_AGENT_CHAT_ENABLED=true` and remained off.
- Safe bridge actions are limited to `version` and `help`.
- The version probe script refuses chat execution and only performs safe readiness checks.
- The bridge code rejects unsafe shell metacharacters in commands and arguments.
- No user-facing product behavior was changed during validation.

## Admin UI boundary findings

- `AgentConnectorsPanel` is rendered from `SettingsView` in the admin settings area.
- `AdminHeader` routes to `#agent-connectors` under the admin settings view.
- The connector panel explicitly states that it is admin/operator only and not exposed in the Client Workspace.
- The UI copy repeatedly warns that Client Workspace must remain provider-only.
- Search results showed connector controls only in admin-side files, not in the client workspace UI surface.

## Exact blockers

- The machine does not have the `codex` CLI installed or on PATH.
- The machine does not have the `claude` CLI installed or on PATH.
- Because the primary connector CLIs are absent, the readiness gate is blocked for real-world use today.

## Recommended next task

- Install and PATH-enable the Codex and Claude Code CLIs on the validation machine, then rerun detection and safe version probes.

## Notes

- `.hermes/state.json` did not exist in this repository, so it was not created or updated.
- The validation log is available at `LOGS/EAI-TASK-007-terminal.log`.
- A handover summary was written to `docs/HANDOVER_2026-06-24_EAI_TASK_007_AGENT_CONNECTORS_GATE.json`.
