# EAI-TASK-008: Connector CLI Installation and Verification

**Final status:** PASS

## Summary
Installed and PATH-verified the Codex and Claude Code CLIs on the Hermes machine, then reran the connector detection and safe version-probe workflow. No product code was changed. The EverythingAI API and UI validation suite passed, and the connector readiness path is now unblocked for a follow-up readiness gate rerun.

## Environment summary
- OS: Linux 6.8.0-100-generic x86_64
- Shell: /usr/bin/bash
- Node: v22.22.0
- npm: 11.12.1
- PATH: includes `/usr/bin`, `/root/.local/bin`, and repo-local tooling paths

## Install / PATH actions
- Ran: `npm install -g @openai/codex @anthropic-ai/claude-code`
- Result: both CLIs are available on PATH at `/usr/bin/codex` and `/usr/bin/claude`
- No credentials, tokens, or environment secrets were printed or stored
- No manual login was required during verification

## Validation results
- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd services/api && npm test` — PASS
- `cd services/api && node src/scripts/detectAgentConnectors.js` — PASS
- `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex claudeCode openCode kiloCode cline` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS

## Connector verification
### Codex
- Command: `/usr/bin/codex`
- Version: `codex-cli 0.142.0`
- Detection: PASS
- Version probe: PASS

### Claude Code
- Command: `/usr/bin/claude`
- Version: `2.1.191 (Claude Code)`
- Detection: PASS
- Version probe: PASS

### Other default probe targets
- OpenCode: skipped, command not found on PATH
- Kilo Code: skipped, command not found on PATH
- Cline: skipped, command not found on PATH

## Safety notes
- Bridge execution stayed explicitly opt-in for the safe version-probe run only
- Chat execution remained disabled
- Unsafe arbitrary command execution remained blocked
- No application behavior or production code was changed

## Human action required
None for this task.

## Recommended next task
Rerun `EAI-TASK-007` / connector readiness gate now that Codex and Claude Code are available on PATH.

## Artifacts
- Terminal log: `LOGS/EAI-TASK-008-terminal.log`
- Handover JSON: `docs/HANDOVER_2026-06-24_EAI_TASK_008_CONNECTOR_CLI_INSTALLATION.json`
- State file: `.hermes/state.json`
- Artifact commit SHA: `7cceab5`
