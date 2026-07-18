# EAI-TASK-040: Add runtime supervisor and heartbeat foundation

## Final status: PASS

- **Issue:** #63
- **Task:** EAI-TASK-040
- **Branch:** main
- **Repository:** moh0709/everythingAI

## Summary

Added a narrow supervisor/heartbeat foundation to expose machine-readable liveness
and process lifecycle state for the Hermes poller/worker runtime. No product
application code was changed.

## Evidence reviewed

- `docs/HERMES_OPERATING_MANUAL_RC1.md` — existing operating manual
- `src/runtime-mode.js` — existing runtime mode detection
- `src/task-claim.js` — existing claim/lock foundation (used as pattern)
- `src/task-queue.js` — existing queue utilities
- `tests/task-claim.test.mjs` — existing test patterns
- `package.json` — existing package scripts
- Issue #63 body and release labels

## Files changed

| File | Change |
|------|--------|
| `src/runtime-supervisor.js` | **NEW** — Supervisor entry point, heartbeat writer, supervisor lock |
| `tests/runtime-supervisor.test.mjs` | **NEW** — 21 deterministic tests with fake timers/dependency injection |
| `docs/HERMES_OPERATING_MANUAL_RC1.md` | **UPDATED** — Added supervisor startup, shutdown, heartbeat schema, stale interpretation, programmatic API, and known gaps |
| `LOGS/EAI-TASK-040-terminal.log` | **NEW** — Terminal log with dry-run and live supervisor tests |
| `REPORTS/EAI-TASK-040-RUNTIME-SUPERVISOR-HEARTBEAT.md` | **NEW** — This report |
| `docs/HANDOVER_2026-07-15_EAI_TASK_040.json` | **NEW** — Handover artifact |
| `.hermes/state.json` | **UPDATED** — Current task and result |

## Supervisor behavior

### Supervisor lock

- Path: `.hermes/supervisor.lock`
- Exclusive-create semantics (`flag: 'wx'`)
- Records PID, hostname, role (`supervisor`), creation timestamp
- Prevents two supervisors from managing the same runtime simultaneously
- Stale lock detection: PID no longer alive on same host
- Lock released on graceful shutdown

### Heartbeat

- Path: `.hermes/runtime/heartbeat.json`
- Atomic write: write to `.heartbeat.tmp` then rename to `heartbeat.json`
- Default interval: 30 seconds (configurable via `--interval` or `heartbeatIntervalMs`)
- Default stale threshold: 120 seconds (configurable via `staleThresholdMs`)
- Fields: `pid`, `hostname` (optional), `processStartTime`, `lastHeartbeat`, `mode`, `currentIssue`, `currentTask`, `lastResult`
- Never records environment variables, tokens, or secrets

### Graceful shutdown

- Handles SIGTERM and SIGINT
- Writes final heartbeat with `lastResult: "SHUTDOWN"`
- Releases supervisor lock
- Calls optional `onShutdown` callback

## Proof that runner does not auto-execute

The supervisor module is passive — it exports functions and a controller. It only
writes heartbeats when explicitly invoked via `createSupervisor().start()` or the
CLI entry point. No existing startup scripts were modified; the supervisor is not
wired into the poller or worker by default.

## Tests

21 new deterministic tests in `tests/runtime-supervisor.test.mjs`:

| Test area | Tests | Description |
|-----------|-------|-------------|
| Heartbeat write | 4 | Valid file, optional hostname, no secrets, atomic write |
| Heartbeat read | 2 | Missing file, valid file |
| Stale detection | 5 | Null heartbeat, fresh, stale, unparseable, threshold parameter |
| Supervisor lock | 1 | Acquire with metadata verification |
| Supervisor lifecycle | 4 | Controller shape, double-start prevention, stop without start, setStatus |
| Constants | 3 | Interval, threshold, mode values |

## Validation results

| Command | Result |
|---------|--------|
| `node scripts/framework-doctor.mjs` | **PASS** (gh authenticated, state valid, all files present) |
| `node --test tests/*.test.mjs` | **PASS** (50/50 — 29 pre-existing + 21 new) |
| `npm test` | **PASS** (same as `node --test`) |
| `git diff --check` | **PASS** (no whitespace errors) |
| JSON parse checks | **PASS** (handover JSON, heartbeat JSON, state JSON all valid) |

## How local MVP runtime behavior was preserved

- No product application code (`apps/`, `services/`) was modified.
- No existing Hermes framework scripts (`scripts/task-worker.mjs`, `scripts/task-poller.mjs`) were modified.
- No existing src modules were modified (only added new module `src/runtime-supervisor.js`).
- The supervisor is passive and must be explicitly started.

## Risks and rollback note

- **Risk:** Supervisor is not yet integrated into poller/worker startup — must be started explicitly.
- **Risk:** Supervisor lock (`.hermes/supervisor.lock`) is separate from task claim lock (`.hermes/claim.lock`) — not yet lifecycle-managed together.
- **Risk:** Downstream monitoring or auto-recovery from stale heartbeats is not yet wired up.
- **Rollback:** Remove `src/runtime-supervisor.js`, `tests/runtime-supervisor.test.mjs`, revert changes to `docs/HERMES_OPERATING_MANUAL_RC1.md`, and delete the new artifacts.

## Immediate next implementation task

**EAI-TASK-041:** Integrate runtime supervisor into poller/worker startup and wire
heartbeat status into CLI output.

## Artifact commit SHA

Recorded after artifact commit (see final issue comment for the actual SHA).

## Final pushed commit SHA

Recorded in the final issue comment.
