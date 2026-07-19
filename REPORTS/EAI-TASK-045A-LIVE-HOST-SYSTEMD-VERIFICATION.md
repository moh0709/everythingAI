# EAI-TASK-045A — live host systemd verification

## Result

**BLOCKED — repository validation passed, but live host provisioning and systemd lifecycle verification cannot be safely completed on this runner.**

This run inspected the actual runner without making privileged changes. The repository's existing systemd templates were verified offline, and the documented repository checks passed. No product application code was changed.

## Host evidence (2026-07-19)

| Check | Result |
|---|---|
| Sanitized host identity | `vmi2938167`; Linux `6.8.0-100-generic x86_64` |
| systemd | `systemd 255 (255.4-1ubuntu8.16)`; `SystemState=degraded` |
| `systemctl is-system-running` | **BLOCKED** — returned `degraded` (exit 1) |
| `id hermes` | **BLOCKED** — account does not exist |
| Approved deployment path `/opt/everythingAI` | **BLOCKED** — absent |
| Current checkout `.git` | Present at `/root/.hermes/projects/everythingAI` (not the approved service path) |
| External env file `/etc/hermes/everythingai.env` | **BLOCKED** — absent; therefore no permission mode was inspected |
| Node | `/usr/bin/node`, v22.22.0 |
| Git | `/usr/bin/git` |
| GitHub CLI auth availability | PASS; `gh auth status` confirmed an authenticated account. Token values were not recorded. |
| Checkout `.hermes` writable | PASS for current runner user |
| Local claim/supervisor locks | Absent at inspection time |
| Running poller/supervisor processes | None observed by the bounded process-name check |

Because the account, deployment path, external environment contract, and healthy systemd state are missing, this runner is not a safe target for creating accounts, installing units, enabling services, starting workers, reboot testing, or uninstall/reinstall testing. No `systemctl enable/start/stop/restart`, account creation, filesystem provisioning, or destructive cleanup was attempted.

## Offline unit and repository validation

| Check | Result |
|---|---|
| `systemd-analyze verify deploy/systemd/*.target/service/timer` | **PASS** — all five version-controlled units |
| `npm run framework:doctor` | **PASS** |
| `node --test tests/*.test.mjs` | **PASS — 138/138** |
| `npm test` | **PASS — 138/138** |
| `git diff --check` | **PASS** |
| `.hermes/state.json` parse | **PASS** |
| Disposable stale-heartbeat watchdog fixture | **PASS** — exit 1 with `HEARTBEAT_STALE`; no service restart attempted |

The existing units retain explicit `/opt/everythingAI` and `/usr/bin/node` paths, the `hermes` identity, bounded restart settings, and external `/etc/hermes/everythingai.env` loading. The watchdog is read-only and does not call restart, so no restart-storm claim is made from this host.

## Live evidence not available

The following acceptance evidence remains blocked and must be collected by an operator on the provisioned target host:

- `hermes` system account, non-login shell, ownership, and permissions;
- `/opt/everythingAI` checkout and writable runtime directories;
- restrictive mode/ownership of `/etc/hermes/everythingai.env` without printing its contents;
- installed unit paths and post-install `systemd-analyze verify`;
- enable/start/status and journal evidence;
- service PID identity, working directory, and executable path;
- bounded disposable crash/restart recovery;
- stale-heartbeat timer observation and no-restart-storm evidence;
- lock conflict/duplicate-instance behavior;
- update, rollback, uninstall, idempotent reinstall, and restored final state.

## Remediation gate

Provision a dedicated non-login `hermes` account and `/opt/everythingAI` checkout on the approved target host, create the externally managed env-file contract with restrictive permissions, and resolve the host's degraded systemd state. Then execute the install and lifecycle procedures in `docs/HERMES_RUNTIME_RUNBOOK.md` from that host. Re-run this task only with explicit rerun authorization after that provisioning is complete.

## Scope and secret handling

Only task artifacts and `.hermes/state.json` metadata were changed. No files under `apps/` or `services/` were changed. No secret values, environment dumps, credentials, or raw runtime payloads are included in the report or terminal log.
