# EAI-TASK-047A Durable Soak Observer

Issue: #93
Agent: Forge
Status: SUBMITTED FOR PM REVIEW
Implementation commit: 5a8e9f1f3b059ba091f6a78243166333c7287ff1

## Result

A durable host-resident observer was added, installed, enabled, and started on the live Hermes host `vmi2938167 / 37.60.248.195`.

The real observation window has started. This report does not claim the 24-hour soak is complete.

- Persisted observation start: 2026-07-29T11:43:05.318Z
- Expected completion: 2026-07-30T11:43:05.318Z
- Required duration: PT24H
- Continuous 24-hour soak completed: false
- Service: `hermes-soak-observer.service`
- Service state at evidence collection: active/running
- Service restart counter at evidence collection: 0
- Observer restart continuity counter: 1 after a controlled `systemctl restart`

## Implementation

- Added `src/hermes-soak-observer.js` for durable observation state, immutable start timestamp handling, sample collection, service counters, queue ownership transition capture, watchdog event capture, sanitized failure event capture, and single-instance lock ownership.
- Added `scripts/hermes-soak-observer.mjs` as the systemd-friendly CLI.
- Added `deploy/systemd/hermes-soak-observer.service`.
- Updated `deploy/systemd/hermes-runtime.target` to want the observer service.
- Added `tests/hermes-soak-observer.test.mjs`.

## Acceptance Matrix

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| AC-1 | Durable observer installed and active on real Hermes host | PASS | `systemctl show hermes-soak-observer.service`: `ActiveState=active`, `SubState=running`, `MainPID=1294207` |
| AC-2 | Initial observation start timestamp persists and cannot silently reset | PASS | Before and after restart, `startedAt=2026-07-29T11:43:05.318Z` and `expectedCompletionAt=2026-07-30T11:43:05.318Z`; `restartCount=1` |
| AC-3 | Single-instance ownership is enforced | PASS | A second `node scripts/hermes-soak-observer.mjs --root /opt/everythingAI --once` returned `OBSERVER_CONFLICT` with `active observer lock present` |
| AC-4 | Observer survives/resumes after initiating Forge execution exits | PASS | After a 70 second SSH delay, service remained active and sample count advanced from 2 to 4 |
| AC-5 | Expected completion is at least 24 hours after persisted start | PASS | Difference between persisted timestamps is exactly 86,400,000 ms |
| AC-6 | No soak-success claim is made | PASS | `continuous24HourSoakCompleted=false`; this issue only starts the durable window |
| AC-7 | Required artifacts are present | PASS | Report, handover JSON, terminal log, version-controlled observer/service files, `.hermes/state.json` |
| AC-8 | Do not modify issue #69 | PASS | No GitHub mutation was performed against issue #69 |
| AC-9 | Submit `forge:done + pm:review`; do not self-close | PENDING LIVE TRANSITION | To be verified after final artifact commit and issue label update |

## Validation

- `npm run framework:doctor`: PASS.
- Targeted observer red test: PASS expected failure observed before implementation (`ERR_MODULE_NOT_FOUND` for `src/hermes-soak-observer.js`).
- `node --test tests/hermes-soak-observer.test.mjs`: PASS, 4/4.
- `node --test tests/*.test.mjs`: PASS, 169/169.
- `npm test`: PASS, 169/169.
- `git diff --check`: PASS before artifact updates with CRLF normalization warnings only.
- Live `systemd-analyze verify`: PASS for `hermes-runtime.target`, `hermes-supervisor.service`, `hermes-poller.service`, `hermes-watchdog.service`, `hermes-watchdog.timer`, and `hermes-soak-observer.service`.
- JSON parsing: PASS for `.hermes/state.json` and `docs/HANDOVER_2026-07-29_EAI_TASK_047A.json`.

## Live Host Evidence

Deployment used a non-destructive fast-forward pull with autostash on `/opt/everythingAI`. The host reached implementation commit `5a8e9f1f3b059ba091f6a78243166333c7287ff1`.

Service evidence:

```text
MainPID=1294207
Result=success
NRestarts=0
ActiveState=active
SubState=running
```

Persisted observer state after controlled restart:

```text
startedAt=2026-07-29T11:43:05.318Z
expectedCompletionAt=2026-07-30T11:43:05.318Z
deployedCommitSha=5a8e9f1f3b059ba091f6a78243166333c7287ff1
restartCount=1
sampleCount=4
```

The host checkout reported an autostash conflict in tracked `.hermes/state.json` from prior runtime state while pulling historical commits. The durable observer service and `.hermes/soak-observer.json` remained active and valid. The task artifact `.hermes/state.json` in this submission records the current issue #93 state.

## Risk Controls

- Duplicate execution: controlled by `.hermes/soak-observer.lock`; live duplicate invocation returned `OBSERVER_CONFLICT`.
- Stale state: observer reuses persisted `startedAt` and `expectedCompletionAt` on restart; it increments `restartCount` instead of resetting the window.
- Secret exposure: observer samples use existing event-history redaction and record no raw environment content.
- Restart storm: service uses `Restart=on-failure`, `RestartSec=15s`, `StartLimitIntervalSec=5min`, `StartLimitBurst=4`; live `NRestarts=0`.
- Dependency bypass: issue #92 was verified closed with accepted blocked PM decision; issue #69 was not modified.

## Next Gate

After PM accepts and closes #93, create a separate verification task only after the persisted expected completion time has elapsed. That later task should inspect the same `.hermes/soak-observer.json` evidence and must not infer completion from this submission alone.
