# EAI-TASK-008: Connector CLI Installation and Verification

**Final status:** PASS

## Summary
Forge refreshed EAI-TASK-008 on 2026-08-01 from the Windows Codex CLI environment. Claude Code was already visible on PATH. Codex was not visible on PATH at the start of this run, so Forge installed/PATH-enabled Codex CLI with the approved npm package, reran connector detection and safe version probes, and completed the required validation suite. No EverythingAI production app behavior was changed.

## OS / Environment Summary
- OS: Microsoft Windows 10.0.26200
- Shell: PowerShell 5.1.26100.8972
- Safe shell check shell: `C:\Program Files\Git\bin\bash.exe`
- Node: v22.15.0
- npm: 10.9.2
- PATH: recorded in `LOGS/EAI-TASK-008-terminal.log`
- Repository: `C:\temp\EverythingAI`
- Branch: `main`
- Starting SHA: `629cddfa4e717e9d9db25cb09b19c151f65b747f`

## Install / PATH Actions Taken
- Checked existing CLI availability with PowerShell command discovery.
- Found Claude Code at `C:\Users\Mohamed Ismail\.local\bin\claude.exe`.
- Codex was initially not found on PATH.
- Ran `npm install -g @openai/codex`.
- Verified Codex on PATH after install at `C:\nvm4w\nodejs\codex.ps1`.
- Used Git Bash for the required `command -v` checks because Windows `bash.exe` resolves to the WSL launcher and no WSL distribution is installed.
- No credentials, tokens, or raw environment secrets were stored in repository artifacts.

## Connector Verification
### Codex
- PowerShell path: `C:\nvm4w\nodejs\codex.ps1`
- Git Bash path: `/c/nvm4w/nodejs/codex`
- Version result: `codex-cli 0.146.0`
- Detection result: PASS
- Version probe result: PASS

### Claude Code
- PowerShell path: `C:\Users\Mohamed Ismail\.local\bin\claude.exe`
- Git Bash path: `/c/Users/Mohamed Ismail/.local/bin/claude`
- Version result: `2.1.209 (Claude Code)`
- Detection result: PASS
- Version probe result: PASS

### Other Default Probe Targets
- OpenCode: skipped, command not found on PATH.
- Kilo Code: skipped, command not found on PATH.
- Cline: skipped, command not found on PATH.

## Required Validation Results
- `git pull --ff-only`: PASS
- `node scripts/framework-doctor.mjs`: PASS
- `cd services/api && npm test`: PASS, 173/173 tests passed
- `cd services/api && node src/scripts/detectAgentConnectors.js`: PASS, Codex and Claude Code found on PATH
- `cd services/api && $env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED="true"; node src/scripts/probeAgentVersions.js`: PASS, Codex and Claude Code version probes passed
- `cd apps/everything-ai-ui && npm run typecheck`: PASS
- `cd apps/everything-ai-ui && npm run build`: PASS
- Git Bash safe shell checks:
  - `command -v codex || true`: `/c/nvm4w/nodejs/codex`
  - `codex --version || true`: `codex-cli 0.146.0`
  - `command -v claude || true`: `/c/Users/Mohamed Ismail/.local/bin/claude`
  - `claude --version || true`: `2.1.209 (Claude Code)`

## Acceptance Matrix
| ID | Requirement | Evidence | Status | Limitation / Remediation |
|---|---|---|---|---|
| AC-1 | Check OS, shell, Node/npm, PATH, Codex, and Claude availability | `LOGS/EAI-TASK-008-terminal.log` | PASS | None |
| AC-2 | Install or PATH-enable Codex CLI via approved method | `npm install -g @openai/codex`; Codex version probe | PASS | None |
| AC-3 | Install or PATH-enable Claude Code CLI if needed | Claude already present and version probe passed | PASS | None |
| AC-4 | Do not store credentials or secrets | Artifacts contain command/path/version evidence only | PASS | None |
| AC-5 | Stop if login/manual auth required | Version probes did not require login/manual auth | PASS | None |
| AC-6 | Rerun connector detection and version probes | Detection/probe sections in terminal log | PASS | None |
| AC-7 | Required validation commands pass | Validation summary in terminal log | PASS | None |
| AC-8 | Required artifacts exist and are updated | Log, report, handover JSON, state file | PASS | None |
| AC-9 | No production app behavior changed | Diff limited to task artifacts | PASS | None |

## Safety Notes
- Bridge execution was enabled only for the safe local version-probe command.
- Chat execution remained disabled.
- Arbitrary shell command execution remained blocked by the probe script.
- No production app code or behavior was changed.
- Existing unrelated workspace changes were preserved and not included in this task.

## Human Action Required
None.

## Recommended Next Task
Rerun the connector readiness gate that depends on live Codex and Claude Code CLI detection.

## Artifacts
- Terminal log: `LOGS/EAI-TASK-008-terminal.log`
- Report: `REPORTS/EAI-TASK-008-CONNECTOR-CLI-INSTALLATION.md`
- Handover JSON: `docs/HANDOVER_2026-06-24_EAI_TASK_008_CONNECTOR_CLI_INSTALLATION.json`
- State file: `.hermes/state.json`
- Artifact commit SHA: `625f777cb08522446773f6039e02b4e46fb98944`
