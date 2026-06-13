# Controlled Agent Version Probe Validation Plan

Date: 2026-06-09

Phase: 8.1C — Controlled Version-Probe Validation

## Purpose

Validate safe `--version` probing for Agent Connectors after detection confirmed which connector commands are available on PATH.

This phase is still not agent chat and not arbitrary execution.

## Preconditions

Previous validation:

```text
docs/VALIDATION_2026-06-09_AGENT_CONNECTOR_DETECTION.md
```

Detected installed connectors:

```text
codex
claudeCode
```

Detected missing / not on PATH:

```text
openCode
kiloCode
aider
continue
cline
```

Kilo Code and Cline are included in the default version-probe target list. If they are not installed or not on PATH, they must be reported as skipped rather than failed.

## Safety boundaries

This validation must preserve:

- Agent chat execution disabled.
- No arbitrary browser-submitted shell commands.
- Only saved connector commands from the backend catalog are used.
- Only the safe `version` probe action is used.
- Agent Connectors remain Admin-only.
- Client Workspace remains unchanged.
- Trust-score and quality-score logic unchanged.
- Human-validation governance rules unchanged.

## Required local command

Run from PowerShell:

```powershell
cd C:\temp\EverythingAI
git pull origin main

cd C:\temp\EverythingAI\services\api
npm test
$env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED="true"; npm run agents:probe:versions; Remove-Item Env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED
```

## Important

Do not set:

```powershell
$env:EVERYTHINGAI_AGENT_CHAT_ENABLED="true"
```

The probe script refuses to run if chat execution is enabled.

## What the command does

The command:

- Checks the bridge status.
- Verifies chat execution is not enabled.
- Detects the configured command for each target connector.
- Skips connectors not found on PATH.
- Temporarily marks the target connector enabled only inside the script settings object.
- Runs the backend bridge safe `version` action for detected targets.
- Prints stdout/stderr and pass/fail state.

## What the command does not do

The command does **not**:

- Run chat.
- Enable persistent connector settings.
- Write to the database.
- Expose connectors to Client Workspace.
- Accept arbitrary commands from the browser.
- Accept arbitrary shell strings from the terminal beyond optional known connector IDs.

## Default targets

Default probe targets:

```text
codex
claudeCode
openCode
kiloCode
cline
```

Optional explicit targets can be passed after the script command, for example:

```powershell
$env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED="true"; npm run agents:probe:versions -- codex claudeCode openCode kiloCode cline; Remove-Item Env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED
```

## Pass criteria

This validation passes if:

- `npm test` passes.
- The version-probe command runs without crashing.
- Chat execution remains disabled.
- Arbitrary shell command execution remains blocked.
- Codex and Claude Code return version output or a safe connector-specific failure.
- OpenCode, Kilo Code, and Cline either return version output if installed or are skipped if missing/not on PATH.
- No persistent connector settings are changed.

## Fail criteria

This validation fails if:

- `npm test` fails.
- The script runs with chat enabled.
- The script attempts to run chat.
- The script accepts arbitrary shell commands.
- The script modifies persistent settings.
- The script exposes connectors to Client Workspace.
- Missing connector commands crash the script instead of being skipped.

## Follow-up artifact

After running the command, create:

```text
docs/VALIDATION_2026-06-09_AGENT_VERSION_PROBES.md
```

The artifact should record:

- command run
- backend test result
- bridge/chat flag state
- Codex version-probe output
- Claude Code version-probe output
- OpenCode/Kilo Code/Cline output or skipped status
- pass/fail result
- risks/follow-up tasks

## Next step after passing

If version probes pass, the recommended next step is:

```text
Phase 8.2 — CI smoke-test integration
```

Do not enable agent chat until detection, probe behavior, CI, and safety documentation are complete.
