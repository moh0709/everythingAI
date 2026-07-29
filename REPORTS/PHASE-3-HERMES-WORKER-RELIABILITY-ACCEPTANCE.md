# Phase 3 Hermes Worker Reliability Acceptance

Issue: #69 / EAI-TASK-046
Agent: Forge
Decision: `PHASE_3_BLOCKED`
Artifact commit: `63265bd5f38d46fd67473f5ecb51d4c4a066eb40`
Observation window: 2026-07-29T07:01:33Z through 2026-07-29T07:07:37Z, approximately 6 minutes. A 24-hour soak was not feasible in this bounded Codex worker session.

## Executive Decision

Phase 3 is blocked, not accepted.

The live systemd services were active and bounded restart behavior was evidenced, but the unattended queue lifecycle did not complete cleanly. Disposable drill issue #84 was claimed by an external Atlas poller comment and remained `pm:ready + hermes:working` through the bounded observation window. The systemd Hermes poller logged `NOT_RUNNABLE`, and no `hermes:done + pm:review` clean completion was observed for that disposable task. Forge moved the disposable fixture out of the runnable queue to `hermes:blocked + pm:review` for PM inspection.

Atlas must not be created from this result.

## Acceptance Matrix

| Criterion | Status | Evidence |
|---|---|---|
| All preceding Phase 3 tasks accepted | Pass | Live GitHub #76 closed with PM acceptance; #68 closed with PM acceptance before #69 release. |
| Automatic startup or service restart | Pass | `hermes-runtime.target`, `hermes-supervisor.service`, `hermes-poller.service`, and `hermes-watchdog.timer` active on `vmi2938167 / 37.60.248.195`; restart of `hermes-runtime.target` returned all four active. |
| Heartbeat continuity | Pass with limitation | Live health showed heartbeat present and fresh after restart; health status remains `DEGRADED` because supervisor lock presence is treated conservatively by the read-only CLI. |
| Single ownership | Blocked | Disposable #84 was claimed by an external Atlas poller while Forge was running the drill; no duplicate completion was observed, but ownership ambiguity blocks acceptance. |
| Queue discovery, claim, execution, validation, completion, queue return | Blocked | #84 was discovered and moved to `hermes:working`, but clean completion was not observed within 4 minutes. |
| Retry behavior | Pass | Deterministic retry-policy drill produced retryable `TRANSIENT` and revalidated `CLAIM_CONFLICT` states with bounded backoff. |
| Crash recovery | Pass with limitation | `systemctl kill --signal=SIGKILL hermes-poller.service` produced a bounded restart path; service returned active after the restart cycle. |
| Structured history | Pass | Local parser drill wrote and parsed seven sanitized event-history records: discovery, claim, start, retry, recovery, validation, completion. Secret canaries and credential URL user-info were absent from parsed JSON. |
| Health CLI JSON validation | Pass with limitation | Local and remote CLI output was valid JSON; remote status was `DEGRADED` because queue availability was false and a supervisor lock was present. |
| Watchdog recovery | Partial | The intended stale-heartbeat simulation command had quoting failure in the first drill run; subsequent service restart restored fresh heartbeat. This is not enough to claim full watchdog recovery for #69. |
| Simulated transient failure | Pass | Retry-policy fixture recorded retryable transient timeout evidence. |
| Claim conflict | Partial | The manual same-host claim-lock fixture command was malformed by shell quoting, but the live systemd poller logged a `NOT_RUNNABLE` dispatch and the task remained externally claimed. |
| Worker crash | Pass | Poller was killed with SIGKILL and systemd returned it to active state without storm. |
| Stale-state reconciliation | Pass | Repository crash-recovery tests exercise stale heartbeat, stale claim lock, cross-host lock, and manual review cases. |
| Clean completion after recovery | Fail | #84 did not reach `hermes:done + pm:review`; Forge moved it to blocked review. |
| No duplicate task execution | Pass with limitation | No duplicate completion comments or duplicate done labels were observed on #84; no clean completion occurred. |
| No restart storm | Pass | `NRestarts` remained bounded: poller `1`, supervisor `0` in the post-drill status sample. |
| No secrets in artifacts | Pass | No secret values or raw environment contents were printed; `/etc/hermes/everythingai.env` was inspected only by metadata. |

## Validation Summary

Initial full validation in the drill exposed Windows reliability test failures:

- `event-history` rotation/retention used POSIX-only basename parsing.
- `runtime-supervisor` CLI entrypoint compared `import.meta.url` with a raw Windows path, so CLI tests did not execute the entrypoint.
- Runtime-supervisor subprocess signal assertions assumed Linux signal behavior on Windows.

Forge made narrow reliability/test fixes and verified the targeted suites:

- `node --test tests/event-history.test.mjs`: 12/12 pass.
- `node --test tests/runtime-supervisor.test.mjs`: 32/32 pass.

Final validation after artifact finalization:

- `npm run framework:doctor`: PASS.
- `node --test tests/*.test.mjs`: 157/157 pass.
- `npm test`: 157/157 pass.
- `node scripts/hermes-health.mjs --json` wrapper: JSON parsed; CLI status `UNKNOWN` locally because no local heartbeat is expected.
- `node src/crash-recovery.js --json`: JSON parsed; returned `MANUAL_REVIEW_REQUIRED` for a generated test heartbeat before cleanup, which is conservative behavior.
- History parser validation: PASS, one completion record parsed.
- Live systemd status evidence: four units active; poller `NRestarts=1`, supervisor `NRestarts=0`.
- Handover and state JSON parsing: PASS.
- `git diff --check`: PASS.

## Metrics

| Metric | Result |
|---|---|
| Observation duration | Approximately 6 minutes |
| Disposable issue used | #84 |
| Disposable issue final state | Open, `hermes:blocked + pm:review` |
| Clean disposable completions | 0 |
| Duplicate completions observed | 0 |
| Poller restart count after crash/restart | 1 |
| Supervisor restart count after drill | 0 |
| Event-history parser drill records | 7 |
| Secret canary present in parser output | false |

## Risk Register

| Risk | Status | Impact | Control / Remediation |
|---|---|---:|---|
| External Atlas poller claims disposable Hermes queue task | Open | Critical | Disable or fence Atlas poller before rerunning #69; prove only one worker owns the queue. |
| Clean unattended completion not observed | Open | Critical | Rerun a disposable no-op task after ownership fencing and verify `hermes:done + pm:review`. |
| Hermes service GitHub queue availability false in health CLI | Open | High | Verify `/etc/hermes/everythingai.env` and systemd service environment without exposing values; confirm `gh` access from the exact service environment. |
| Watchdog stale-heartbeat drill command quoting failed | Open | Medium | Rerun stale-heartbeat simulation through a checked shell script or direct SSH here-doc, then restore heartbeat and verify watchdog healthy. |
| 24-hour soak not performed | Open | Medium | Create a follow-up soak gate after clean bounded completion is proven. |
| Windows validation drift | Mitigated | Medium | Path and CLI entrypoint fixes added; full suite rerun required before final submission. |

## Epic #62 Recommendation

Do not close Phase 3 and do not authorize Atlas creation from this run. The next valid action is a follow-up reliability rerun after queue ownership is fenced so Atlas and Hermes cannot both act on the same disposable queue item.
