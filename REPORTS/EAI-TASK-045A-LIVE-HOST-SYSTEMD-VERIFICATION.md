# EAI-TASK-045A - Live host systemd verification

## Result

PASS submitted for independent PM review. No product application code was changed. Issue #69 remains unreleased.

## Host and deployment

- Host: `vmi2938167` / `37.60.248.195`
- Kernel: Linux 6.8.0-100-generic
- systemd: 255.4-1ubuntu8.16
- Service account: `hermes` (uid 997, gid 986)
- Deployment checkout: `/opt/everythingAI`
- Deployment checkout commit: `ef63d2113cc563dd0f17573f0be5f674a37240c1`
- Protected runtime environment: `/etc/hermes/everythingai.env`, mode `0640`, owner `root:hermes`
- GitHub CLI credential store: `/var/lib/hermes/gh`, mode `0700`, owner `hermes`; no credential-bearing files remain in the repository checkout
- Legacy EverythingAI cron job: disabled before systemd activation

The host-wide `systemctl is-system-running` result is `degraded` because of eight unrelated pre-existing failed units: certbot, daily-test, journal-maintenance, log-size-monitor, logrotate, plan-reminder, user@999, and openclaw-log-maintenance.timer. The EverythingAI units are independently active and healthy.

## Installed units

- `/etc/systemd/system/hermes-runtime.target`
- `/etc/systemd/system/hermes-supervisor.service`
- `/etc/systemd/system/hermes-poller.service`
- `/etc/systemd/system/hermes-watchdog.service`
- `/etc/systemd/system/hermes-watchdog.timer`

All five installed units passed `systemd-analyze verify`. `hermes-runtime.target` and `hermes-watchdog.timer` are enabled.

## Acceptance matrix

| Criterion | Evidence | Result |
|---|---|---|
| Dedicated account and approved deployment path | `id hermes`; `/opt/everythingAI` owned by `hermes` | PASS |
| External protected configuration | `/etc/hermes/everythingai.env` mode `0640`; no secret values in artifacts | PASS |
| GitHub authentication for service account | `runuser -u hermes -- gh api user --jq .login` returned `moh0709` | PASS |
| Boot enablement | `systemctl is-enabled hermes-runtime.target hermes-watchdog.timer` returned `enabled` | PASS |
| Service identity and explicit paths | Both main processes run as `hermes`, cwd `/opt/everythingAI`, executable `/usr/bin/node` | PASS |
| Runtime observability | Heartbeat and supervisor lock present; final services active | PASS |
| Bounded crash restart | Poller PID `954720` was killed once; PID `955322` returned; restart counter was `1`; no storm observed | PASS |
| Watchdog healthy path | Live watchdog returned `HEALTHY`, service active, age about 14 seconds | PASS |
| Watchdog stale-heartbeat path | Disposable fixture returned `HEARTBEAT_STALE`, exit `1`; no restart attempted | PASS |
| Duplicate-instance protection | Second supervisor returned `SUPERVISOR_CONFLICT` with active supervisor lock | PASS |
| Repository validation | Framework doctor PASS; quiescent `npm test` PASS, 138/138; `git diff --check` PASS | PASS |
| Rollback and restore | Previous commit `c325367ba223fcb5dae5f7afc12c42333d650c15` installed and verified, then current commit restored | PASS |
| Uninstall | Five units disabled/stopped, removed, daemon reloaded, and absence verified | PASS |
| Idempotent reinstall | Two consecutive reinstall passes verified syntax and active target/timer/services | PASS |
| Final state | Target, supervisor, poller, and watchdog timer active; target and timer enabled | PASS |

## Validation evidence

- `npm run framework:doctor`: PASS
- `npm test`: PASS, 138/138, run while the live runtime was quiesced to avoid testing against its real supervisor lock
- `systemd-analyze verify` for all five installed units: PASS
- `git diff --check`: PASS
- Live watchdog: PASS (`HEALTHY`)
- Final repository checkout on host: clean and synchronized with `origin/main`

## Safety and limitations

- No raw tokens, environment values, private keys, or credential-bearing URLs were recorded.
- The systemd global state remains `degraded` only because of unrelated host units; this report does not claim global host health.
- Native `WatchdogSec` is not claimed; the accepted heartbeat timer watchdog is the implemented mechanism.
- PM must independently review this submission and accept or reject it. Issue #68 remains blocked pending PM acceptance, and issue #69 was not released.
