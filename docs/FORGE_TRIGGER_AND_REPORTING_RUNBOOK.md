# Forge Trigger and Reporting Runbook

## Local trigger

From the repository root:

```text
npm run forge:trigger
```

The default polling interval is 60 seconds. For a bounded watch:

```text
$env:FORGE_TRIGGER_ITERATIONS = '3'
npm run forge:trigger -- --watch
```

The trigger first uses `gh issue list` with `--state open --label pm:ready --label forge:ready`, then performs a live issue read before and after label mutation. It claims one issue at a time using `.hermes/forge/claim.lock`. A stale same-host lock may be recovered only when its owner PID is dead and its age exceeds 15 minutes. Cross-host locks require manual review.

If no released Forge issue exists, the trigger lists open issues and enters maintenance mode. Maintenance mode skips actively owned issues, skips protected issue #69, and selects one candidate in this order:

1. `forge:done` + `pm:review`
2. `forge:blocked` + `pm:review`
3. older open issues with no recent activity
4. governance or administrative backlog

The selected maintenance issue is claimed with `forge:working` and launched through the same bounded Codex execution path. It must return as `forge:done + pm:review` or `forge:blocked + pm:review`. If neither released nor maintenance work exists, the trigger records `IDLE` with queue-empty evidence.

## Codex start boundary

The trigger prepares `.hermes/forge/context-<issue>.json`. Open the repository in Codex desktop and start or resume the task using that context. The trigger reports `HUMAN_START_REQUIRED`; it does not fabricate an automatic Codex launch.

## Telegram

Set `FORGE_TELEGRAM_BOT_TOKEN` and `FORGE_TELEGRAM_CHAT_ID` in the process environment through an external secret store. Never commit or print them. `src/forge-reporting.js` sends only a short sanitized lifecycle message. If either setting is absent, the trigger records `not-configured` and continues without tick spam.

## Recovery

- `CLAIM_CONFLICT`: inspect the live issue labels and `.hermes/forge/claim.lock`; do not remove a cross-host lock.
- `REPORTING_REQUIRED`: rerun the trigger to deliver the persisted one-time claim acknowledgement without relabeling.
- `HUMAN_START_REQUIRED`: open the persisted context in Codex desktop and continue the claimed issue.
- `forge:working` with no live context or heartbeat: PM reviews the evidence and decides whether to recover or block; Forge does not silently replace ownership.

## PM review loop

PM reviews open `pm:ready` issues without Forge ownership, active `forge:working` issues and their context/heartbeat, `forge:done` or `forge:blocked` issues carrying `pm:review`, Atlas child status, and dependency ordering. PM alone accepts/rejects and releases the next task.
