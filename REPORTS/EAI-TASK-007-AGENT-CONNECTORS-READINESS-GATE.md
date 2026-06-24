# EAI-TASK-007: Agent Connectors Readiness Gate

**Final status:** BLOCKED

## Summary
Validated the Admin Agent Connectors readiness gate without changing product behavior. The backend bridge remains safety-gated, the Admin UI exposes Agent Connectors only from the admin settings path, and the readiness checks are blocked on machine availability of Codex and Claude Code CLIs.

## Inspected files
- `services/api/src/agents/localAgentBridge.js`
- `services/api/src/routes/agentBridge.routes.js`
- `services/api/src/settings/aiProviderSettings.js`
- `services/api/src/scripts/detectAgentConnectors.js`
- `services/api/src/scripts/probeAgentVersions.js`
- `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminHeader.tsx`
- `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
- `apps/everything-ai-ui/src/providerSettingsApi.ts`

## Validation command results
- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd services/api && npm test` — PASS
- `cd services/api && node src/scripts/detectAgentConnectors.js` — PASS
- `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js` — PASS (safe probes only; all target CLIs skipped because they were not on PATH)
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS

## Connector readiness results
- **Codex:** not detected on PATH; version probe skipped; usable today: **no**
- **Claude Code:** not detected on PATH; version probe skipped; usable today: **no**

## Backend safety findings
- Local agent bridge execution is disabled by default and requires explicit local opt-in via `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true`.
- Safe actions are constrained to version/help probes.
- Unsafe command strings are rejected before execution.
- Chat execution requires both bridge and chat flags and remains disabled by default.
- API tests passed, including bridge safety and probe boundary coverage.

## Admin UI boundary findings
- Agent Connectors is wired into `SettingsView` inside the admin-only settings surface.
- `AdminHeader` routes the Agent Connectors nav item to `#agent-connectors` and scrolls to the admin connector panel.
- `AgentConnectorsPanel` explicitly states these connectors are for admin/operator workflows only and that the Client Workspace must not expose them.
- No product boundary weakening was observed in the inspected files.

## Exact blockers
- The machine does not have the Codex CLI installed/on PATH.
- The machine does not have the Claude Code CLI installed/on PATH.
- Until both CLIs are available, the readiness gate cannot be advanced to usable today: yes for either target connector.

## Recommended next task
Install and PATH-enable Codex and Claude Code on the machine, then rerun the readiness gate and confirm live version probes.

## Artifacts
- Terminal log: `LOGS/EAI-TASK-007-terminal.log`
- Handover JSON: `docs/HANDOVER_2026-06-24_EAI_TASK_007_AGENT_CONNECTORS_GATE.json`
- Artifact commit SHA: `TBD_AFTER_COMMIT`
