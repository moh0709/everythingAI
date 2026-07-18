# EAI-TASK-040: Add runtime supervisor and heartbeat foundation

## Final status: PASS (correction pass 3)

- **Issue:** #63
- **Task:** EAI-TASK-040
- **Branch:** main
- **Repository:** moh0709/everythingAI
- **Correction pass:** 3 (PM rejection items addressed: signal handler lifecycle cleanup)

## Summary

Added a narrow supervisor/heartbeat foundation to expose machine-readable liveness
and process lifecycle state for the Hermes poller/worker runtime. No product
application code was changed.

This correction pass fixes the final PM-identified defect: the signal-triggered
shutdown path (`handleSignal`) now calls `detachSignalHandlers()` after performing
shutdown actions, preventing stale owned listeners from remaining in a host process.

## Changes from previous submission

### Defect fixed: Signal handler not detached after signal-triggered shutdown

| Before | After |
|--------|-------|
| `handleSignal` releases the lock and calls `onShutdown` but never calls `detachSignalHandlers()` | `handleSignal` releases the lock, calls `onShutdown`, then calls `detachSignalHandlers()` to remove owned SIGTERM/SIGINT listeners |
| In a host process, stale listeners remain attached with closed-over lock references | After any signal-triggered shutdown, all supervisor-owned listeners are properly detached |
| Only the explicit `stop()` path cleaned up listeners | Both `stop()` and signal-triggered `handleSignal()` paths clean up listeners |

### New test: In-process signal handler cleanup

| Test | What it proves |
|------|---------------|
| `in-process SIGTERM handler detaches listeners, releases lock, writes SHUTDOWN heartbeat` | Creates supervisor in same process, retrieves the actual registered SIGTERM handler from `process.listeners()`, invokes it directly. Verifies: listener counts return to baseline (both SIGTERM and SIGINT), heartbeat has `lastResult: "SHUTDOWN"`, supervisor lock is released, a fresh supervisor instance can start in the same process. |

This test triggers the actual registered SIGTERM handler without terminating the
test runner, proving both SIGTERM and SIGINT listeners are detached after the
signal path fires.

## Evidence reviewed

- `docs/HERMES_OPERATING_MANUAL_RC1.md` — existing operating manual
- `src/runtime-mode.js` — existing runtime mode detection
- `src/task-claim.js` — existing claim/lock foundation (used as pattern)
- `src/task-queue.js` — existing queue utilities
- `tests/task-claim.test.mjs` — existing test patterns
- `package.json` — existing package scripts
- Issue #63 body, PM rejection comments, and release labels

## Files changed (this correction pass)

| File | Change |
|------|--------|
| `src/runtime-supervisor.js` | **UPDATED** — `handleSignal` now calls `detachSignalHandlers()` after shutdown actions (3 lines added) |
| `tests/runtime-supervisor.test.mjs` | **UPDATED** — Added in-process signal handler test (32 tests, was 31, was 26, was 21) |

## Files unchanged from prior passes

| File | Status |
|------|--------|
| `docs/HERMES_OPERATING_MANUAL_RC1.md` | Unchanged — already documents supervisor lifecycle correctly |
| `docs/HANDOVER_2026-07-15_EAI_TASK_040.json` | Updated for this pass |
| `.hermes/state.json` | Updated for this pass |
| `LOGS/EAI-TASK-040-terminal.log` | Updated for this pass |
| `REPORTS/EAI-TASK-040-RUNTIME-SUPERVISOR-HEARTBEAT.md` | Updated for this pass |

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

### Single-use lifecycle

- Each `createSupervisor()` call produces a fresh, independent instance
- `start()` can be called at most once per instance; returns `SINGLE_USE` on second attempt
- `stop()` detaches all signal handlers and releases the lock
- To restart, create a new instance via `createSupervisor()`

### Graceful shutdown

- Handles SIGTERM and SIGINT
- Signal handlers are tracked via `Map` and properly detached on both `stop()` and signal-triggered shutdown
- Writes final heartbeat with `lastResult: "SHUTDOWN"` (or `"STOPPED"` on explicit stop)
- Releases supervisor lock
- Calls optional `onShutdown` callback
- After signal-triggered shutdown, detached listeners ensure no stale references remain

## Proof that runner does not auto-execute

The supervisor module is passive — it exports functions and a controller. It only
writes heartbeats when explicitly invoked via `createSupervisor().start()` or the
CLI entry point. No existing startup scripts were modified; the supervisor is not
wired into the poller or worker by default.

## Tests

32 deterministic tests in `tests/runtime-supervisor.test.mjs` (was 31):

| Test area | Tests | Description |
|-----------|-------|-------------|
| Heartbeat write | 4 | Valid file, optional hostname, no secrets, atomic write |
| Heartbeat read | 2 | Missing file, valid file |
| Stale detection | 5 | Null heartbeat, fresh, stale, unparseable, threshold parameter |
| Supervisor lock | 1 | Acquire with metadata verification |
| Supervisor lifecycle | 6 | Controller shape, SINGLE_USE enforcement, NOT_RUNNING stop, setStatus, used getter, fresh instance |
| CLI boundary | 4 | Dry-run JSON output, mode flag, interval flag, live start/SIGTERM |
| Real subprocess signals | 2 | SIGTERM with isolated dir (heartbeat + lock), SIGINT with isolated dir |
| Signal handler cleanup | 4 | Listener count before/after stop, fresh instance after stop, full lifecycle, **in-process SIGTERM handler invocation with full proof** |

## Validation results

| Command | Result |
|---------|--------|
| `node scripts/framework-doctor.mjs` | **PASS** (gh authenticated, state valid, all files present) |
| `node --test tests/*.test.mjs` | **PASS** (61/61 — 29 pre-existing + 32 supervisor tests) |
| `npm test` | **PASS** (same as `node --test`) |
| `git diff --check` | **PASS** (no whitespace errors) |
| JSON parse checks | **PASS** (handover JSON, state JSON all valid) |

## How local MVP runtime behavior was preserved

- No product application code (`apps/`, `services/`) was modified.
- No existing Hermes framework scripts (`scripts/task-worker.mjs`, `scripts/task-poller.mjs`) were modified.
- No existing src modules were modified (only updated existing `src/runtime-supervisor.js` and its tests).
- The supervisor is passive and must be explicitly started.

## Risks and rollback note

- **Risk:** Supervisor is not yet integrated into poller/worker startup — must be started explicitly.
- **Risk:** Supervisor lock (`.hermes/supervisor.lock`) is separate from task claim lock (`.hermes/claim.lock`) — not yet lifecycle-managed together.
- **Risk:** Downstream monitoring or auto-recovery from stale heartbeats is not yet wired up.
- **Rollback:** Revert `src/runtime-supervisor.js` and `tests/runtime-supervisor.test.mjs` to previous known-good, or remove both plus the new artifacts.

## Immediate next implementation task

**EAI-TASK-041:** Integrate runtime supervisor into poller/worker startup and wire
heartbeat status into CLI output.
