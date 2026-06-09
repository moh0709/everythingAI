# Agent Connector Detection Validation Plan

Date: 2026-06-09

Phase: 8.1B — Real Connector Detection Validation

## Purpose

Validate which local agent connector commands are available on the Windows workstation without enabling bridge execution, chat execution, arbitrary shell command execution, or Client Workspace exposure.

This validation is detection-only.

## Safety boundaries

This validation must preserve:

- Agent bridge execution disabled by default.
- Agent chat execution disabled by default.
- No arbitrary shell command execution from browser clients.
- Agent Connectors remain Admin-only.
- Client Workspace must not expose Agent Connectors.
- Provider/API-key settings remain Admin-only.
- Trust-score and quality-score logic unchanged.
- Human-validation governance rules unchanged.

## Command

Run from the backend folder:

```powershell
cd C:\temp\EverythingAI\services\api
npm run agents:detect
```

## What this command does

The command:

- Loads the default Agent Connector catalog.
- Prints bridge/chat flag status.
- Prints the security boundary.
- Performs safe PATH detection for configured connector commands.
- Reports whether each connector command is found on PATH.

## What this command does not do

The command does **not**:

- Run version probes.
- Run chat commands.
- Enable `EVERYTHINGAI_AGENT_BRIDGE_ENABLED`.
- Enable `EVERYTHINGAI_AGENT_CHAT_ENABLED`.
- Execute arbitrary shell commands.
- Modify connector settings.
- Modify provider settings.
- Expose connectors to Client Workspace.

## Connectors checked

Expected connector catalog:

```text
codex
kiloCode
openCode
claudeCode
aider
continue
cline
```

Primary connectors for this phase:

```text
codex
claudeCode
openCode
```

## Expected output shape

For each connector, the output should include:

```text
Connector: <connectorId>
  known:         yes
  enabled:       no
  chat enabled:  no
  command:       <command>
  found on PATH: yes/no
  command path:  <resolved path or not found>
  mode:          <mode>
  auth:          <auth strategy>
  message:       <detection message>
```

## Pass criteria

This validation passes if:

- The command exits without crashing.
- Every configured connector appears in the output.
- Missing tools return `found on PATH: no` rather than throwing errors.
- Installed tools return `found on PATH: yes` with a resolved command path.
- `Bridge enabled` prints `no` unless intentionally enabled outside this validation.
- `Chat enabled` prints `no` unless intentionally enabled outside this validation.
- The output confirms arbitrary shell commands are blocked.

## Fail criteria

This validation fails if:

- The command crashes.
- A configured connector is missing from the output.
- Detection attempts to run chat or version probes.
- Bridge/chat execution appears enabled unexpectedly.
- Arbitrary shell commands are shown as allowed.
- The command modifies settings or files.

## Follow-up artifact

After running the command, create a validation artifact:

```text
docs/VALIDATION_2026-06-09_AGENT_CONNECTOR_DETECTION.md
```

The artifact should record:

- command run
- full connector matrix
- which connectors were found
- which connectors were missing
- safety boundary status
- pass/fail result
- follow-up actions

## Next step after passing

If detection passes, the next recommended step is:

```text
Phase 8.1C — controlled version-probe validation
```

That later phase may test safe `--version` / `--help` probes, but only after detection-only behavior is documented.
