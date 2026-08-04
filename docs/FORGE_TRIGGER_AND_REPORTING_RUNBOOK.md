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

The trigger lists all repository issues so every decision appears in `.hermes/forge/eligibility-report.json`, then performs a live issue-universe read before label mutation. It claims one issue at a time using `.hermes/forge/claim.lock`. A stale same-host lock may be recovered only when its owner PID is dead and its age exceeds 15 minutes. Cross-host locks require manual review.

An issue is eligible only when it is open and carries `pm:ready + forge:ready` (or an explicitly configured ready equivalent). The centralized engine rejects terminal/review states, active or competing owners, controller/current/maintenance issues, unresolved or open dependencies, PM dependency holds, same-cycle processing, and unchanged-HEAD processing. Eligible issues are sorted by dependency depth, explicit priority, creation date, then issue number.

EverythingAI keeps issue #69 under an explicit PM dependency hold by default. PM may replace or clear the comma-separated hold list through the external environment:

```text
$env:FORGE_DEPENDENCY_HOLD_ISSUE_NUMBERS = '69'
```

There is no maintenance fallback. If no explicitly released issue is eligible, the trigger records `IDLE`, prints `No eligible issues found`, and performs no GitHub mutation.

## Codex start boundary

The trigger prepares `.hermes/forge/context-<issue>.json` and normally starts the bounded Codex CLI execution path. A controlled acceptance harness may call `pollForgeOnce({ execute: null })` to verify the complete live claim transaction without launching a second coding worker; this returns `HUMAN_START_REQUIRED` after the claim, acknowledgement, and processing state are verified.

## Telegram

Set `FORGE_TELEGRAM_BOT_TOKEN` and `FORGE_TELEGRAM_CHAT_ID` in the process environment through an external secret store. Never commit or print them. `src/forge-reporting.js` sends only a short sanitized lifecycle message. If either setting is absent, the trigger records `not-configured` and continues without tick spam.

## Recovery

- `CLAIM_CONFLICT`: inspect the live issue labels and `.hermes/forge/claim.lock`; do not remove a cross-host lock.
- `REPORTING_REQUIRED`: rerun the trigger to deliver the persisted one-time claim acknowledgement without relabeling.
- `HUMAN_START_REQUIRED`: open the persisted context in Codex desktop and continue the claimed issue.
- `forge:working` with no live context or heartbeat: PM reviews the evidence and decides whether to recover or block; Forge does not silently replace ownership.

## PM review loop

PM reviews open `pm:ready` issues without Forge ownership, active `forge:working` issues and their context/heartbeat, `forge:done` or `forge:blocked` issues carrying `pm:review`, Atlas child status, and dependency ordering. PM alone accepts/rejects and releases the next task.
