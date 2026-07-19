# EAI-TASK-045 — systemd deployment and watchdog recovery

## Result

**BLOCKED for host installation; deployment artifacts and validation gates PASS.**

The repository already contains the version-controlled systemd templates, read-only heartbeat watchdog, operating-manual guidance, and runtime runbook required by this issue. This run completed the safe validation path without changing application code or attempting privileged host installation.

## Delivered artifacts

- `deploy/systemd/hermes-runtime.target`
- `deploy/systemd/hermes-supervisor.service`
- `deploy/systemd/hermes-poller.service`
- `deploy/systemd/hermes-watchdog.service`
- `deploy/systemd/hermes-watchdog.timer`
- `scripts/hermes-watchdog.mjs`
- `docs/HERMES_RUNTIME_RUNBOOK.md`
- `docs/HERMES_OPERATING_MANUAL_RC1.md`
- `docs/HANDOVER_2026-07-15_EAI_TASK_045.json`
- `.hermes/state.json` (pre-existing and valid; not modified)
- `LOGS/EAI-TASK-045-terminal.log`

## Design and safety notes

- Supervisor and poller use explicit `/opt/everythingAI` and `/usr/bin/node` paths, the dedicated `hermes` account, bounded `Restart=on-failure` delays, and `StartLimit*` bounds.
- The heartbeat watchdog runs as a read-only systemd timer check every 60 seconds with a 120-second stale threshold. It reports failure and does not restart services, avoiding restart storms.
- Native `WatchdogSec` is intentionally not claimed because the Node supervisor does not implement `sd_notify`.
- Configuration is sourced from the external `/etc/hermes/everythingai.env` contract. Secrets were not printed, committed, or included in this report or log.
- Runbook procedures cover preflight, install, update, rollback, lifecycle operations, disposable crash verification, and uninstall.

## Validation evidence — 2026-07-19

| Check | Result |
|---|---|
| `npm run framework:doctor` | **PASS** |
| `npm test` | **PASS — 138/138** |
| `systemd-analyze verify` for all five unit/template files | **PASS** |
| Handover JSON parse | **PASS** |
| Existing `.hermes/state.json` JSON parse | **PASS** |
| `git diff --check` | **PASS** |
| Disposable stale-heartbeat watchdog fixture | **PASS — expected `HEARTBEAT_STALE`, exit 1** |

## Host deployment blocker

Host lifecycle installation and recovery testing were not safely executable in this checkout. Read-only evidence captured in the terminal log:

- `id hermes`: no such user
- `/opt/everythingAI`: absent; checkout is under `/root/.hermes/projects/everythingAI`
- `systemctl is-system-running`: `degraded`

Therefore boot enablement, real service status/log capture, and deliberate systemd process-crash recovery remain blocked pending target-host provisioning and operator approval. No claim of successful host deployment is made.

## Scope

No files under `apps/` or `services/` were changed. No secrets, environment dumps, credentials, or raw runtime payloads were recorded.

## Next step

Provision the target host with the `hermes` account and `/opt/everythingAI` checkout, resolve the degraded systemd state, then follow `docs/HERMES_RUNTIME_RUNBOOK.md` and rerun lifecycle verification on that host.
