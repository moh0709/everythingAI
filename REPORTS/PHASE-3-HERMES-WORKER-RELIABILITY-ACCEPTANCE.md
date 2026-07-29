# Phase 3 Hermes Worker Reliability Acceptance

Issue: #69 / EAI-TASK-046
Agent: Forge
Decision: `PHASE_3_ACCEPTED`
Rerun date: 2026-07-29
Starting SHA: `cd777d63d9252005fec437bf6e3e1f87655ad3b0`
Artifact commit: `d5aa013764c8d6d2568e13ba69174a15e5580e5f`
Deployed host: `vmi2938167 / 37.60.248.195`
Deployed checkout during drill: `cd777d63d9252005fec437bf6e3e1f87655ad3b0`

## Executive Decision

Phase 3 is accepted for the bounded reliability gate.

After the accepted #87 queue-ownership remediation, Forge reran the #69 unattended reliability drill against fresh disposable issue #90. The systemd Hermes poller discovered the fixture, claimed it, executed the no-op lifecycle, completed it as `hermes:done + pm:review`, returned the `pm:ready + hermes:ready` queue to empty, and showed no duplicate execution.

A 24-hour soak was not feasible in this bounded Codex worker session. The observation window for this rerun was 2026-07-29T09:41:33Z through 2026-07-29T09:56:16Z, approximately 14 minutes 43 seconds including a 10-minute post-completion stability watch. A follow-up 24-hour soak gate remains recommended before expanding Atlas or other autonomous delegation.

Atlas creation is not performed by this task. It may be considered only after PM accepts this result and explicitly delegates the next Atlas scope.

## Acceptance Matrix

| Criterion | Status | Evidence |
|---|---|---|
| All preceding Phase 3 tasks accepted | Pass | Live GitHub #76 and #68 are closed with PM acceptance comments; #87 was accepted and closed before this #69 rerun. |
| Automatic startup or service restart | Pass | Host runtime was stopped, fast-forwarded to `cd777d63`, then `hermes-runtime.target`, `hermes-supervisor.service`, `hermes-poller.service`, and `hermes-watchdog.timer` restarted active. |
| Heartbeat continuity | Pass with limitation | Health JSON remained valid with fresh heartbeat through the stability window. Status is `DEGRADED` because the read-only health CLI treats the expected supervisor lock as conservative degradation. |
| Single ownership | Pass | Atlas fence from #87 remained in place; #90 had exactly one `CLAIMED` comment and one `PASS` comment from Hermes. |
| Queue discovery, claim, execution, validation, completion, queue return | Pass | #90 was discovered by systemd poller, claimed at 2026-07-29T09:42:35Z, completed at 2026-07-29T09:42:36Z, and live queue query returned `[]`. |
| Retry behavior | Pass | Deterministic retry-policy drill produced retryable `TRANSIENT` and revalidated `CLAIM_CONFLICT` states with bounded backoff, then reset cleanly. |
| Crash recovery | Pass | `hermes-poller.service` was killed with SIGKILL and recovered through bounded systemd restart to active state. |
| Structured history | Pass | Parser drill wrote and parsed seven sanitized records: discovery, claim, start, retry, recovery, validation, completion. Secret canary and credential URL user-info were absent. |
| Health CLI JSON validation | Pass with limitation | Local and remote health CLI outputs were valid JSON. Remote queue availability was true with ready count 0; local status is expected to be `UNKNOWN` where no local heartbeat exists. |
| Watchdog recovery | Pass | Stale-heartbeat simulation returned `HEARTBEAT_STALE`; heartbeat was restored and watchdog returned `HEALTHY`. |
| Simulated transient failure | Pass | Retry-policy fixture recorded retryable sanitized timeout evidence. |
| Claim conflict | Pass | A same-host active claim lock forced a worker claim conflict before the lock was removed for unattended completion. |
| Worker crash | Pass | Poller SIGKILL recovery returned active without unbounded restarts. |
| Stale-state reconciliation | Pass | Stale heartbeat was detected conservatively, restored, and health returned to fresh heartbeat evidence. Repository crash-recovery tests also cover stale locks and manual review cases. |
| Clean completion after recovery | Pass | After #87 remediation and claim-conflict release, #90 completed as `hermes:done + pm:review`. |
| No duplicate task execution | Pass | #90 had one claim comment and one pass comment; no duplicate completion was observed. |
| No restart storm | Pass | Final samples showed poller and supervisor `NRestarts=0` after the final controlled restart window. The deliberate SIGKILL sample showed one bounded restart only. |
| No secrets in artifacts | Pass | No raw `/etc/hermes/everythingai.env` contents, tokens, credential values, or raw environment dumps were recorded. |

## Validation Summary

Fresh validation after artifact refresh:

- `npm run framework:doctor`: PASS.
- `node --test tests/*.test.mjs`: PASS, 164/164.
- `npm test`: PASS, 164/164.
- `node scripts/hermes-health.mjs --json`: valid JSON; local status `UNKNOWN` and exit 1 because this Windows checkout has no local heartbeat.
- History parser validation: PASS, one completion record parsed with secret canary and credential URL absent.
- Remote systemd verification/status: PASS; installed units verified and four EverythingAI units active.
- Handover and state JSON parsing: PASS.
- `git diff --check`: PASS, exit 0 with CRLF normalization warnings only.

Runtime validation already collected:

- Remote queue before fixture: `[]`.
- Remote checkout fast-forwarded with `git pull --ff-only origin main` to `cd777d63d9252005fec437bf6e3e1f87655ad3b0`.
- Remote `npm ci --ignore-scripts`: PASS, no vulnerabilities.
- Four systemd units active after update and after final restart.
- #90 completion observed within the bounded wait.
- Post-completion stability samples: 10 samples over approximately 10 minutes, all four units active, queue available with ready count 0.

## Metrics

| Metric | Result |
|---|---|
| Rerun observation duration | Approximately 14 minutes 43 seconds |
| 24-hour soak | Not performed; follow-up gate recommended |
| Disposable issue used | #90 |
| Disposable issue final state during evidence collection | Open, `pm:ready + hermes:done + pm:review` |
| Clean disposable completions | 1 |
| Duplicate completions observed | 0 |
| Claim comments on #90 | 1 |
| Completion comments on #90 | 1 |
| Poller restart count during deliberate crash sample | 1 bounded restart |
| Final poller restart count after final restart window | 0 |
| Final supervisor restart count after final restart window | 0 |
| Stability samples | 10 |
| Event-history parser drill records | 7 |
| Secret canary present in parser output | false |

## Risk Register

| Risk | Status | Impact | Control / Remediation |
|---|---|---:|---|
| 24-hour soak not performed | Open | Medium | Add a separate 24-hour soak gate before broadening autonomous delegation or declaring long-duration operational maturity. |
| Health CLI reports `DEGRADED` while service is otherwise healthy | Open | Medium | Clarify expected supervisor-lock semantics in a follow-up health UX task; current JSON remains accurate and read-only. |
| Future Atlas or Forge queue overlap | Controlled | Critical | Keep #87 Atlas delegation fence active; require explicit PM delegation labels before Atlas can claim tasks. |
| Host-wide systemd degraded state from unrelated units | Open | Low for Hermes | Avoid claiming global host health; continue reporting only EverythingAI unit status and known unrelated host state separately. |
| Disposable issue left open for PM inspection | Controlled | Low | Close or archive disposable fixture #90 only after PM has inspected the evidence, unless PM directs immediate cleanup. |
| Secret exposure in evidence | Controlled | Critical | Continue metadata-only env checks and redaction scans; never print env file contents or credential stores. |

## Epic #62 Recommendation

Recommend accepting Phase 3 as `PHASE_3_ACCEPTED` for the bounded reliability gate. Do not create Atlas automatically from this result. PM should first accept #69, then decide whether to create a follow-up 24-hour soak gate and a separately scoped Atlas delegation task.
