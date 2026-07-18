# EAI-TASK-040: Add runtime supervisor and heartbeat foundation

## Final status: PASS (correction pass)

- **Issue:** #63
- **Task:** EAI-TASK-040
- **Branch:** main
- **Repository:** moh0709/everythingAI
- **Correction pass:** 2026-07-18 (PM rejection items addressed)

## Summary

Added a narrow supervisor/heartbeat foundation to expose machine-readable liveness
and process lifecycle state for the Hermes poller/worker runtime. No product
application code was changed.

**Correction pass** fixed the following defects identified in PM rejection:
1. CLI entry path now properly awaits `supervisor.start()` with try/catch
2. Supervisor instances are single-use with detachable signal handlers
3. CLI boundary smoke tests added (dry-run and live SIGTERM tests)

## Changes from original submission

### Defect 1: CLI entry point synchronous usage

| Before | After |
|--------|-------|
| `const result = supervisor.start();` (sync, `result.ok` is `undefined` → always enters error branch) | `const result = await supervisor.start();` with try/catch + top-level `.catch()` on module entry |
| Top-level call: `runSupervisorCli();` | `runSupervisorCli().catch(...)` for safe async rejection handling |

### Defect 2: Signal handler lifecycle

| Before | After |
|--------|-------|
| Single `signalHandlerAttached` boolean prevents re-attachment | `Map`-based signal handler tracking (`signalHandlers`): |
| Signal closure captures `lockAttempt` param from first `start()` call | `lockRef` tracks current lock; `attachSignalHandlers()` always detaches stale handlers first |
| Handlers never detached (stale lock reference remains after stop) | `detachSignalHandlers()` called in `stop()` — removes listeners and clears `lockRef` |
| Second `start()` after `stop()` returns `ALREADY_RUNNING` | Second `start()` returns `SINGLE_USE` — supervisor instances are explicitly single-use |
| | New getter: `supervisor.used` reflects single-use state |

### Defect 3: Missing CLI boundary test

New tests added to `tests/runtime-supervisor.test.mjs`:

| Test | What it verifies |
|------|-----------------|
| `CLI --dry-run outputs valid JSON and exits 0` | `spawnSync` runs supervisor in dry-run mode; asserts stdout is valid JSON with `ok: true`, `result: 'DRY_RUN'`, plus paths |
| `CLI --dry-run --mode webhook outputs correct mode` | Verifies `WEBHOOK` mode propagation through CLI |
| `CLI --dry-run --interval 5000 outputs correct interval` | Verifies interval CLI argument parsing |
| `CLI without --dry-run starts supervisor and writes heartbeat` | Spawns supervisor with short interval, sends SIGTERM after 3s; verifies startup and shutdown messages in stdout |

## Evidence reviewed

- `docs/HERMES_OPERATING_MANUAL_RC1.md` — existing operating manual
- `src/runtime-mode.js` — existing runtime mode detection
- `src/task-claim.js` — existing claim/lock foundation (used as pattern)
- `src/task-queue.js` — existing queue utilities
- `tests/task-claim.test.mjs` — existing test patterns
- `package.json` — existing package scripts
- Issue #63 body, PM rejection comment, and release labels

## Files changed

| File | Change |
|------|--------|
| `src/runtime-supervisor.js` | **UPDATED** — Fixed CLI async/await, single-use enforcement, signal handler attach/detach with Map tracking |
| `tests/runtime-supervisor.test.mjs` | **UPDATED** — 26 tests (was 21): single-use test, `used` getter, fresh instance, 4 CLI boundary tests |
| `docs/HERMES_OPERATING_MANUAL_RC1.md` | Update with single-use contract and signal handler lifecycle (unchanged from original) |
| `LOGS/EAI-TASK-040-terminal.log` | **UPDATED** — New terminal log for correction pass |
| `REPORTS/EAI-TASK-040-RUNTIME-SUPERVISOR-HEARTBEAT.md` | **UPDATED** — This report with correction details |
| `docs/HANDOVER_2026-07-15_EAI_TASK_040.json` | **UPDATED** — Status, summary, fix details |
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

### Single-use lifecycle

- Each `createSupervisor()` call produces a fresh, independent instance
- `start()` can be called at most once per instance; returns `SINGLE_USE` on second attempt
- `stop()` detaches all signal handlers and releases the lock
- To restart, create a new instance via `createSupervisor()`

### Graceful shutdown

- Handles SIGTERM and SIGINT
- Signal handlers are tracked via `Map` and properly detached on `stop()`
- Writes final heartbeat with `lastResult: "SHUTDOWN"`
- Releases supervisor lock
- Calls optional `onShutdown` callback

## Proof that runner does not auto-execute

The supervisor module is passive — it exports functions and a controller. It only
writes heartbeats when explicitly invoked via `createSupervisor().start()` or the
CLI entry point. No existing startup scripts were modified; the supervisor is not
wired into the poller or worker by default.

## Tests

26 deterministic tests in `tests/runtime-supervisor.test.mjs` (was 21):

| Test area | Tests | Description |
|-----------|-------|-------------|
| Heartbeat write | 4 | Valid file, optional hostname, no secrets, atomic write |
| Heartbeat read | 2 | Missing file, valid file |
| Stale detection | 5 | Null heartbeat, fresh, stale, unparseable, threshold parameter |
| Supervisor lock | 1 | Acquire with metadata verification |
| Supervisor lifecycle | 6 | Controller shape, SINGLE_USE enforcement, NOT_RUNNING stop, setStatus, used getter, fresh instance |
| CLI boundary | 4 | Dry-run JSON output, mode flag, interval flag, live start/SIGTERM |

## Validation results

| Command | Result |
|---------|--------|
| `node scripts/framework-doctor.mjs` | **PASS** (gh authenticated, state valid, all files present) |
| `node --test tests/*.test.mjs` | **PASS** (55/55 — 29 pre-existing + 26 supervisor tests) |
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

## Artifact commit SHA

Recorded after artifact commit (see final issue comment for the actual SHA).

## Final pushed commit SHA

Recorded in the final issue comment.
