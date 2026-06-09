# Agent Connector Detection Validation

Date: 2026-06-09

Phase: 8.1B — Real Connector Detection Validation

Result: passed

## Purpose

Validate real local Agent Connector command detection on the Windows workstation without enabling bridge execution, chat execution, version probes, or arbitrary shell command execution.

## Commands run

Backend validation:

```powershell
cd C:\temp\EverythingAI\services\api
npm test
```

Agent connector detection:

```powershell
cd C:\temp\EverythingAI\services\api
npm run agents:detect
```

## Backend validation result

```text
tests:      113
pass:       113
fail:       0
cancelled:  0
skipped:    0
todo:       0
duration:   5756.0195 ms
```

The backend baseline increased from 106 tests to 113 tests after adding agent bridge connector safety tests.

## Safety boundary reported by detection command

```text
Bridge enabled: no
Chat enabled:   no
Platform:       win32
Safe actions:   version, help

Command execution default: disabled
Chat execution default:    disabled
Arbitrary shell commands:  blocked
Bridge flag:               EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true
Chat flag:                 EVERYTHINGAI_AGENT_CHAT_ENABLED=true
```

## Connector detection matrix

| Connector | Command | Found on PATH | Command path | Enabled | Chat enabled | Mode | Auth strategy |
|---|---|---:|---|---:|---:|---|---|
| codex | `codex` | yes | `C:\Users\Mohammad Ismail\AppData\Roaming\npm\codex` | no | no | local-cli | codex-app |
| kiloCode | `kilo` | no | not found | no | no | local-cli | external-app |
| openCode | `opencode` | no | not found | no | no | local-cli | external-app |
| claudeCode | `claude` | yes | `C:\Users\Mohammad Ismail\AppData\Roaming\npm\claude` | no | no | local-cli | external-app |
| aider | `aider` | no | not found | no | no | local-cli | local-config |
| continue | `continue` | no | not found | no | no | config-bridge | local-config |
| cline | `cline` | no | not found | no | no | config-bridge | local-config |

## Summary

```text
Connectors checked: 7
Found on PATH:      2
Missing on PATH:    5
```

Found:

```text
codex
claudeCode
```

Missing:

```text
kiloCode
openCode
aider
continue
cline
```

## Validated behavior

- Detection command completed successfully.
- All seven configured connector catalog entries appeared in the output.
- Missing connectors returned `found on PATH: no` rather than crashing.
- Installed connectors returned `found on PATH: yes` with resolved command paths.
- Bridge execution remained disabled.
- Chat execution remained disabled.
- Detection did not run version probes.
- Detection did not run chat commands.
- Detection did not enable environment flags.
- Detection did not modify connector settings.
- Detection did not expose connectors to Client Workspace.
- Arbitrary shell command execution remained blocked.

## Notes

The output contains minor message formatting issues in some missing-connector messages, for example `wasnot found on PATH` instead of `was not found on PATH`.

This is cosmetic only and does not affect detection safety or validation result.

## Safety invariants preserved

- Normal users use Client Workspace.
- Admin/operators use Admin Dashboard.
- Provider/API-key configuration remains Admin-only.
- Agent Connectors remain Admin-only.
- Client Workspace does not expose Agent Connector configuration.
- Agent bridge execution remains disabled by default.
- Agent chat execution remains disabled by default.
- Browser clients cannot submit arbitrary shell commands.
- Trust-score logic was not changed.
- Quality-score logic was not changed.
- Human-validation governance rules were not changed.

## Final result

```text
Overall: passed
Backend tests: 113/113 passed
Connector detection: passed
Installed primary connectors detected: Codex, Claude Code
OpenCode: not installed or not on PATH
```

## Recommended next step

Proceed to Phase 8.1C — controlled version-probe validation for installed connectors only:

```text
codex
claudeCode
```

Do not enable chat execution yet.

Do not expose Agent Connectors to Client Workspace.

Keep `EVERYTHINGAI_AGENT_CHAT_ENABLED` unset/false.
