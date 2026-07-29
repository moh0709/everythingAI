# Forge Autonomous Execution Runbook

## Configure

Set `FORGE_CODEX_PATH` to the installed Codex executable when `codex` is not on `PATH`:

```powershell
$env:FORGE_CODEX_PATH = 'C:\Users\<user>\AppData\Local\OpenAI\Codex\bin\<version>\codex.exe'
```

Install and authenticate GitHub CLI separately, then verify:

```powershell
gh auth status
gh repo view moh0709/everythingAI
```

Do not place tokens in repository files, command arguments, logs, or Telegram messages.

## One-shot execution

Run one queue poll from the repository root:

```powershell
node scripts/forge-trigger.mjs
```

The trigger is intentionally one-shot. A Windows Scheduled Task can invoke this command every minute; the claim lock and execution lock make duplicate launches safe.

## Install a scheduled task

Run PowerShell as the Windows account that owns the authenticated Codex and GitHub sessions. Replace the placeholders and keep the task under the current user:

```powershell
$root = 'C:\temp\EverythingAI'
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "scripts\forge-trigger.mjs" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'EverythingAI Forge Trigger' -Action $action -Trigger $trigger -Description 'Polls released Forge issues and starts one bounded Codex CLI worker.'
```

Verify with `Get-ScheduledTask -TaskName 'EverythingAI Forge Trigger'` and `Get-ScheduledTaskInfo -TaskName 'EverythingAI Forge Trigger'`.

The production task must:

- run as the interactive Windows user that owns both Codex and GitHub authentication;
- execute from `C:\temp\EverythingAI`;
- provide the GitHub CLI directory on `PATH`;
- provide `FORGE_CODEX_PATH`;
- use `IgnoreNew` for overlapping invocations;
- run once per minute with `StartWhenAvailable`;
- append sanitized output to `.hermes/forge/scheduler.log`.

Every poll writes `.hermes/forge/trigger-heartbeat.json`. A healthy idle installation has `status: HEALTHY`, `result: IDLE`, a recent `lastPollAt`, and Task Scheduler result `0`. The desktop must remain powered on and the owning user must remain logged in.

## Uninstall and recover

```powershell
Unregister-ScheduledTask -TaskName 'EverythingAI Forge Trigger' -Confirm:$false
```

Inspect `.hermes/forge/execution-state.json`, `execution-heartbeat.json`, `execution.jsonl`, and `execution.lock`. A live worker or a cross-host lock requires review. A dead lock older than the configured stale window is recovered automatically on the next launch. Never use `git clean` for recovery.

For Telegram intake, exactly one Hermes gateway may poll a bot token. The Docker `hermes` gateway is the selected owner on the current VPS; `hermes-gateway.service` must remain disabled unless the Docker gateway is intentionally removed first.
