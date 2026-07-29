# Hermes Runtime Runbook

This runbook installs the version-controlled EverythingAI Hermes polling runtime under systemd. It is intentionally explicit about paths, permissions, restart bounds, and the limits of heartbeat-based monitoring.

## Prerequisites and preflight

Run as root on the Hermes host:

```bash
id hermes
readlink -f "$(command -v node)"        # expected: /usr/bin/node
node --version
readlink -f "$(command -v git)"
gh auth status                            # confirms the hermes account can use GitHub CLI
systemctl --version
systemctl is-system-running               # must not be unavailable; degraded requires operator review
systemctl show --property=SystemState
 test -d /opt/everythingAI/.git
 test -w /opt/everythingAI/.hermes
```

The service requires a single instance of the repository runtime. Before installation, stop any manually launched `task-poller.mjs` or `runtime-supervisor.js` processes and inspect `.hermes/claim.lock` and `.hermes/supervisor.lock`. Never delete a lock unless same-host stale ownership is proven.

## Install

1. Create the non-login account and directories, if they do not already exist:

```bash
useradd --system --home-dir /opt/everythingAI --shell /usr/sbin/nologin hermes
install -d -o hermes -g hermes -m 0750 /etc/hermes
install -d -o hermes -g hermes -m 0750 /opt/everythingAI/.hermes/runtime
```

2. Create `/etc/hermes/everythingai.env` as root. This file is a protected, external environment contract; it is not committed and must not be printed in logs:

```bash
install -o root -g hermes -m 0640 /dev/null /etc/hermes/everythingai.env
# Edit it with the required non-secret configuration only. Put credentials in the host's secret manager.
```

3. Ensure the checkout and runtime directories are owned appropriately. Keep GitHub CLI credentials available to the `hermes` account through the host's supported credential mechanism; do not copy tokens into the env file.

4. Install the templates without shell expansion:

```bash
install -o root -g root -m 0644 deploy/systemd/hermes-runtime.target /etc/systemd/system/
install -o root -g root -m 0644 deploy/systemd/hermes-supervisor.service /etc/systemd/system/
install -o root -g root -m 0644 deploy/systemd/hermes-poller.service /etc/systemd/system/
install -o root -g root -m 0644 deploy/systemd/hermes-watchdog.service /etc/systemd/system/
install -o root -g root -m 0644 deploy/systemd/hermes-watchdog.timer /etc/systemd/system/
systemctl daemon-reload
systemd-analyze verify /etc/systemd/system/hermes-runtime.target /etc/systemd/system/hermes-supervisor.service /etc/systemd/system/hermes-poller.service /etc/systemd/system/hermes-watchdog.service /etc/systemd/system/hermes-watchdog.timer
systemctl enable hermes-runtime.target hermes-watchdog.timer
systemctl start hermes-runtime.target hermes-watchdog.timer
```

## Normal operations

```bash
systemctl status hermes-runtime.target hermes-supervisor.service hermes-poller.service hermes-watchdog.timer
journalctl -u hermes-supervisor.service -u hermes-poller.service -n 100 --no-pager
systemctl restart hermes-runtime.target
systemctl stop hermes-runtime.target
systemctl start hermes-runtime.target
```

The supervisor writes `.hermes/runtime/heartbeat.json` atomically every 30 seconds. The watchdog checks it every 60 seconds with a 120-second stale threshold and also checks that the poller is active. The watchdog is read-only and exits with evidence on failure; it does not call `restart`, avoiding restart storms. Process crashes are handled by each service's bounded `Restart=on-failure`, `RestartSec`, and `StartLimit*` settings.

The units intentionally do not use `WatchdogSec` because the existing Node supervisor has no `sd_notify` implementation. The timer is the truthful heartbeat watchdog. Do not document native systemd watchdog support until `sd_notify` is implemented and tested.

## Update and rollback

```bash
git -C /opt/everythingAI fetch origin
git -C /opt/everythingAI checkout --detach origin/main
systemctl restart hermes-runtime.target
systemctl status hermes-runtime.target
```

For rollback, checkout the previously accepted commit, run the framework and test gates, then restart the target. Keep the service templates from the matching commit. If the update fails, stop the target, preserve `journalctl` output, and restore the prior commit; do not remove runtime locks while a process is alive.

## Recovery from deliberate disposable failure

On a disposable host only, verify recovery without touching production state:

```bash
systemctl kill --kill-who=main --signal=SIGKILL hermes-poller.service
systemctl status hermes-poller.service
journalctl -u hermes-poller.service -n 50 --no-pager
```

The service should return after the bounded delay. A stale heartbeat or inactive service causes the next watchdog invocation to fail visibly for operator review. Do not repeatedly kill the service on a production host.

## Phase 3 reliability-drill gate

Before running a Phase 3 unattended reliability drill, confirm that no legacy Atlas, Forge, cron, or manual poller can claim the same queue item as the systemd Hermes poller. The drill is blocked if more than one actor can observe or mutate `pm:ready + hermes:ready` issues.

Use only disposable no-op issues for queue lifecycle proof. The expected clean path is:

```bash
gh issue create --repo moh0709/everythingAI --title "DISPOSABLE-DRILL-<id>" --body "Disposable no-op reliability drill; no product work." --label pm:ready --label hermes:ready
```

Then observe from outside the service until the issue reaches `hermes:done + pm:review`. If it remains `hermes:working`, is claimed by an unexpected actor, or requires manual relabeling, record `PHASE_3_BLOCKED` and move the disposable fixture out of the runnable queue for PM review. Do not treat repository tests or service active status as a substitute for this clean completion proof.

## Stop, disable, uninstall

```bash
systemctl disable --now hermes-watchdog.timer hermes-runtime.target
systemctl daemon-reload
rm /etc/systemd/system/hermes-watchdog.timer /etc/systemd/system/hermes-watchdog.service
rm /etc/systemd/system/hermes-poller.service /etc/systemd/system/hermes-supervisor.service /etc/systemd/system/hermes-runtime.target
systemctl daemon-reload
```

Preserve `/etc/hermes/everythingai.env` until an operator confirms it is no longer needed, then securely remove it according to the host secret-management policy. Do not remove `/opt/everythingAI/.hermes` during incident recovery; it contains evidence and state.

## Security and ownership

- Secrets are external to Git and are never placed in unit files, reports, or logs.
- The service runs as `hermes`, with `NoNewPrivileges`, a read-only system view, and explicit writable paths.
- The repository path, executable path, service account, and env-file path are explicit.
- Only one supervisor lock owner may manage the runtime. Cross-host or ambiguous locks require manual review.
