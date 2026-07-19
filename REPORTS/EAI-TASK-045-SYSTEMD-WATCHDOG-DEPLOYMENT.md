# EAI-TASK-045: systemd deployment and watchdog recovery

## Final status: BLOCKED (host installation prerequisites unavailable)

- Issue: #68
- Repository: `moh0709/everythingAI`
- Branch: `main`
- Starting commit: `eb29ce2b56ac66b0ebf5c48aca50537f272ddad2`

## Delivered artifacts

- `deploy/systemd/hermes-runtime.target`
- `deploy/systemd/hermes-supervisor.service`
- `deploy/systemd/hermes-poller.service`
- `deploy/systemd/hermes-watchdog.service`
- `deploy/systemd/hermes-watchdog.timer`
- `scripts/hermes-watchdog.mjs`
- `docs/HERMES_RUNTIME_RUNBOOK.md`
- Updated `docs/HERMES_OPERATING_MANUAL_RC1.md`
- `LOGS/EAI-TASK-045-terminal.log`
- `docs/HANDOVER_2026-07-15_EAI_TASK_045.json`
- `.hermes/state.json`

## Implementation summary

The version-controlled deployment separates the runtime heartbeat supervisor from the GitHub polling worker. Both service units use explicit `/usr/bin/node`, `/opt/everythingAI`, `User=hermes`, external `/etc/hermes/everythingai.env`, bounded `Restart=on-failure` delays, and `StartLimit*` burst controls. Hardening includes `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=full`, `ProtectHome=read-only`, and explicit writable paths.

The watchdog timer invokes a read-only Node check every 60 seconds. It validates heartbeat freshness (120-second threshold) and poller service activity. It exits with machine-readable failure evidence and deliberately does not restart the service, preventing restart storms. The documentation explicitly states that this is heartbeat watchdog evidence, not native systemd `WatchdogSec`/`sd_notify` support, because the existing supervisor does not implement `sd_notify`.

The operating manual and runbook document preflight, install, update, start, stop, restart, status, logs, rollback, disposable failure verification, and uninstall procedures. Secrets remain external and are not committed.

## Blocker and exact evidence

Systemd is available (`systemd 255.4-1ubuntu8.16`), but this checkout host is not a prepared Hermes deployment target:

- `systemctl is-system-running` returned `degraded`.
- `id hermes` returned `no such user`.
- `/opt/everythingAI` is absent; the checkout is under `/root/.hermes/projects/everythingAI`.

Installing and starting the services would therefore require host provisioning and a repository relocation/copy, plus configuring GitHub CLI credentials for the dedicated service account. Those host-side changes were not performed, and no deployment or service lifecycle success is claimed. The templates were validated with `systemd-analyze verify` and the watchdog was exercised against a disposable stale-heartbeat fixture.

## Validation

| Check | Result |
|---|---|
| `systemd-analyze verify` on all target/service/timer templates | PASS |
| `npm run framework:doctor` | PASS |
| `node --test tests/*.test.mjs` | PASS — 138/138 |
| `npm test` | PASS — 138/138 |
| `.hermes/state.json` JSON parse | PASS |
| `git diff --check` | PASS |
| Disposable stale watchdog fixture | PASS — expected exit 1 / `HEARTBEAT_STALE` |

No `apps/` or `services/` application code was changed.

## Operator next step

Provision the `hermes` account and `/opt/everythingAI` on the intended Hermes host, configure the protected external environment/credential mechanism, rerun the runbook preflight, install the templates, and perform the documented disposable crash-recovery verification. This issue should remain open for PM review of the blocked host-deployment evidence.
