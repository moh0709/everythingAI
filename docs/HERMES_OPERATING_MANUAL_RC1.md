# Hermes Operating Manual RC1

## Purpose

This manual defines the implementation-ready operating contract for Hermes on the EverythingAI repository.
It turns the current queue-driven scaffolding into an explicit operating procedure for autonomous task pickup, claim, execution, validation, reporting, and return to the queue.

## Source of truth

Primary runtime source of truth:

- `docs/ENGINEERINGOS_RC1.md`
- GitHub issues state on `moh0709/everythingAI`
- `.hermes/state.json`
- `REPORTS/` artifacts
- current worker/poller implementation in:
  - `scripts/task-poller.mjs`
  - `scripts/task-worker.mjs`
  - `src/task-queue.js`
  - `templates/REPORT_TEMPLATE.md`

Important note:

- `docs/ENGINEERINGOS_RC1.md` is present in this checkout and is the governing operating standard.
- This RC1 manual is reconciled to that document and the current queue/runtime files.

## Mission and authority

Hermes is allowed to autonomously pick up EverythingAI tasks when:

- the GitHub issue is open,
- the issue has both `pm:ready` and `hermes:ready`,
- the issue has no matching completed report artifact,
- the issue is not already claimed or completed in `.hermes/state.json`,
- the issue is the next runnable task after duplicate-prevention checks.

Hermes must not ask for confirmation again once the issue is known runnable.
If the issue is not runnable, Hermes exits silently.

## Trigger and Event Input Contract

This contract separates the always-on polling queue from the optional webhook intake path.

### Explicit runtime-mode selection

Runtime mode must be determined before any payload discovery or queue mutation.
There are exactly three runtime outcomes:

- `POLLING`
- `WEBHOOK`
- `UNKNOWN`

Primary runtime contract:

- CLI flag: `--mode polling` or `--mode webhook`
- Environment fallback: `HERMES_RUNTIME_MODE=polling` or `HERMES_RUNTIME_MODE=webhook`
- CLI wins over environment when both are present
- conflicting or invalid explicit values return `UNKNOWN`
- no explicit mode returns `UNKNOWN`

Remediation for `UNKNOWN`:

- set `--mode polling` for the polling queue launcher
- set `--mode webhook` for the webhook dispatcher
- never infer webhook mode from missing payload variables

### Polling mode — primary autonomous mode

- Responsible process: `node scripts/task-poller.mjs --mode polling` and the worker it dispatches.
- Eligibility source of truth: live GitHub issue labels plus `.hermes/state.json` plus report duplicate-prevention checks.
- Required labels: `pm:ready` and `hermes:ready`.
- Polling mode does **not** require a webhook payload.
- Missing webhook data must never block polling-mode execution.
- Polling mode must never call webhook payload discovery.
- The Telegram/chat gateway remains a conversation context and is not a task-execution entry path.
- After one task completes, the poller returns to queue watching.
- Polling mode continues until no runnable work remains or the process is intentionally stopped.

### Webhook mode — optional event-driven mode

Webhook mode exists only when a webhook receiver or invoking process supplies an actual GitHub event payload and explicitly starts in webhook mode.

Payload discovery precedence is exactly:

1. `GITHUB_EVENT_PATH`
2. `--event-path <file>`
3. STDIN only when the invoking process explicitly guarantees JSON input

The runtime/receiver owns payload delivery.
Hermes must never ask the CEO where the payload is stored.

Machine-readable outcomes for the contract:

- `EXECUTE`
- `IGNORED_EVENT`
- `IGNORED_INELIGIBLE`
- `BLOCKED_RUNTIME_CONTRACT`
- `INVALID_EVENT_PAYLOAD`
- `CLAIM_CONFLICT`
- `UNKNOWN_RUNTIME_MODE`

Contract notes:

- `BLOCKED_RUNTIME_CONTRACT` is only for webhook mode when no valid payload source exists.
- `IGNORED_EVENT` is for non-`issues` events or payloads that do not represent a GitHub issue event.
- `IGNORED_INELIGIBLE` is for issue events missing one or both readiness labels.
- `CLAIM_CONFLICT` is for duplicate or stale runnable events that fail live queue revalidation.
- `EXECUTE` only follows live revalidation against the current queue; it never fabricates a task.
- `UNKNOWN_RUNTIME_MODE` means no task execution or GitHub mutation should occur.

## Startup and initialization

On startup, Hermes should:

1. Resolve runtime mode explicitly with `--mode polling` or `--mode webhook`.
2. Read `.hermes/state.json`.
3. Query GitHub for open issues labeled `pm:ready` and `hermes:ready` when in polling mode.
4. Skip any issue that already has a matching report artifact in `REPORTS/`.
5. Re-check the current state file and issue labels before claiming.
6. Read the relevant task documents and source files.
7. If no runnable issue exists, stop silently.
8. If a runnable issue exists, claim it atomically and begin execution.

Polling startup command example:

```bash
node scripts/task-poller.mjs --mode polling --watch
```

Webhook startup command example:

```bash
node scripts/webhook-event-dispatcher.mjs --mode webhook
```

## Task discovery eligibility rules

A task is runnable only when all of the following are true:

- the GitHub issue is open,
- the issue currently has both `pm:ready` and `hermes:ready`,
- the issue does not already carry `hermes:working` or `hermes:done`,
- the issue is not already in progress in `.hermes/state.json`,
- there is no matching report artifact already present,
- the task has not already been finalized.

Additional queue hygiene rules:

- issue numbers and EAI-TASK identifiers are not interchangeable,
- process at most one issue at a time,
- always prefer live GitHub state over stale webhook payload assumptions,
- if a later poll shows the issue is already claimed or completed, no-op.

## Atomic claim, local lock, and duplicate prevention

Claiming is enforced by a shared authority in `src/task-claim.js` so the polling worker and the webhook classifier use the same preconditions.

Claim outcomes are machine-readable and mutually exclusive:

- `CLAIMED`
- `CLAIM_CONFLICT`
- `NOT_RUNNABLE`
- `ALREADY_COMPLETED`
- `RUNTIME_ERROR`

The claim sequence is:

1. Re-read live GitHub issue state.
2. Check `.hermes/state.json` for any active `IN_PROGRESS` task.
3. Attempt an exclusive local lock at `.hermes/claim.lock`.
4. Revalidate the live issue, labels, report artifact, and local state after the lock is held.
5. Add `hermes:working` and remove `hermes:ready`.
6. Verify the resulting labels from GitHub.
7. Post the claim acknowledgement comment.
8. Begin execution only after the claim is established.

Lock lifecycle:

- The lock file is created with exclusive-create semantics.
- It records issue number, task ID, PID, hostname, and timestamp.
- A second claimant is rejected while a valid lock exists.
- The live worker releases the lock on normal completion and on known failure paths.
- The lock path is ignored by Git so the live file is never committed.

Stale-lock policy:

- A lock is considered stale only when it was created on the current host and the recorded PID is no longer alive.
- Host-mismatched locks are treated conservatively as active.
- If stale evidence is not present, Hermes leaves the lock alone and returns `CLAIM_CONFLICT`.

Duplicate-delivery behavior:

- The webhook classifier records claim eligibility and claim conflict evidence.
- The production webhook entry path invokes the shared claim authority and then hands the owned issue to the worker execution helper using the same release handle.
- Repeated webhook delivery usually re-sees the updated labels or lock state and returns a non-executable result instead of dispatching again.
- Polling continues after claim conflicts and other non-fatal duplicate detections.

Crash recovery procedure:

- If Hermes crashes after creating a lock, the next run inspects the lock metadata before attempting removal.
- If the owning PID is gone on the same host, the stale lock may be removed and retried.
- If the owning PID is still alive or the host cannot be verified, the lock is left intact and the issue remains blocked.
- If `.hermes/state.json` is missing, state updates are skipped rather than synthesized.

## Execution lifecycle

The expected lifecycle is:

1. Observe the issue and repository state.
2. Plan the work from the live source artifacts.
3. Implement the requested change or artifact.
4. Validate the result.
5. Commit and push the work.
6. Report back on the issue.
7. Return to the queue.

For docs-only work, implementation means writing the documentation artifact and validating it.
For code work, implementation means changing the requested source files, then validating the behavior.

## Required task-state transitions

Recommended transitions:

- Ready: `pm:ready` + `hermes:ready`
- Claimed: `pm:ready` + `hermes:working`
- Blocked: `pm:ready` + `hermes:blocked`
- Complete: `pm:review` + `hermes:done`

Guidance:

- Remove `hermes:working` when the task is finished.
- Move the task into the PM review state on completion.
- Keep blocked tasks open so they can be resumed after the blocker is fixed.
- Do not leave a completed task looking runnable.

## Validation and quality gates

Validation must match the task type and the repository area being changed.
For this RC1 manual task, the minimum checks are:

- markdown sanity by inspection,
- JSON parsing for the handover artifact,
- `git diff --check`,
- `git status --short`.

For code tasks in this repository, also run the repo-appropriate validation commands from the current docs.
Do not claim a validation result that was not actually executed.

### Persistent event history contract

Hermes lifecycle evidence may be appended as versioned NDJSON under `.hermes/history/`.
Each append is one complete `O_APPEND` write; concurrent independent writers are
supported for normal records on the local filesystem contract. Readers tolerate only
an unterminated final JSON fragment, while newline-terminated or middle-file
corruption is surfaced with a physical line number. Sensitive keys and secret-shaped
values are redacted before serialization, and oversized records are rejected.

When the active file reaches its limit, rotation uses monotonic twelve-digit sequence
names and retains the newest configured generations. Rotation happens before the new
append, so rename failure leaves the active file untouched; retention failure is
surfaced only after the active append and complete rotated file are safe. Runtime
history is ignored by Git; fixtures and focused tests remain tracked.

## Branch, commit, and push safety

- Work on `main` unless the task explicitly says otherwise.
- Keep changes narrowly scoped.
- Record the starting commit SHA at claim time.
- Record the artifact commit SHA and final pushed commit SHA once the work is committed and pushed.
- Keep the report, handover, state file, and issue comment synchronized.
- If a later metadata sync commit is needed, note that separately and keep the artifact SHA stable.

## Failure handling and escalation

If Hermes cannot complete the task:

- leave the issue open,
- set the issue to a blocked state if the blocker is real,
- explain the blocker in the issue comment,
- do not fabricate validation or completion evidence.

If a required source artifact is missing, use the closest available live source and note the gap explicitly.

## Completion reporting

On completion, Hermes should produce:

- a report in `REPORTS/`,
- a handover JSON in `docs/`,
- a log file in `LOGS/`,
- a final issue comment summarizing status, validation, and SHAs.

The completion comment should include:

- final status,
- files changed,
- validation results,
- artifact commit SHA,
- final pushed commit SHA,
- blocker notes if any,
- next recommended task.

## Interaction rules

- The CEO/PM should not need to manually continue a runnable GitHub issue.
- Runnable issues should be claimed automatically.
- Non-runnable events should exit silently.
- Future agents should read the live issue, state file, report, and handover before making changes.

## Runtime supervisor and heartbeat

### Purpose

The runtime supervisor (`src/runtime-supervisor.js`) provides a narrow liveness and
process-lifecycle foundation for the Hermes poller/worker runtime without changing
product application behavior.

### Supervisor startup

Start the supervisor with:

```bash
node src/runtime-supervisor.js --mode polling
```

Or with a custom heartbeat interval (default: 30 seconds):

```bash
node src/runtime-supervisor.js --mode polling --interval 15000
```

Options:
- `--mode polling|webhook` — sets the runtime mode reported in heartbeats
- `--interval <ms>` — heartbeat interval in milliseconds (default: 30000)
- `--dry-run` — print the configuration and exit without starting

### Supervisor lock

The supervisor uses an exclusive file lock at `.hermes/supervisor.lock` to prevent
two supervisor processes from managing the same runtime simultaneously. The lock
mechanism follows the same patterns established by the task claim/lock foundation
in `src/task-claim.js`:

- The lock is created with exclusive-create semantics (`flag: 'wx'`).
- It records PID, hostname, role (`supervisor`), and creation timestamp.
- A second supervisor is rejected while a valid lock exists.
- Stale locks are detected when the recorded PID is no longer alive on the same host.
- Locks from different hosts are treated conservatively unless they exceed the stale threshold.
- The lock is released on graceful shutdown.

### Heartbeat file

The supervisor emits a heartbeat file at `.hermes/runtime/heartbeat.json` using atomic
replacement (write to `.heartbeat.tmp`, then rename to `heartbeat.json`).

Schema:

```json
{
  "pid": 12345,
  "hostname": "host-abc",
  "processStartTime": "2026-07-18T14:00:00.000Z",
  "lastHeartbeat": "2026-07-18T14:05:00.000Z",
  "mode": "POLLING",
  "currentIssue": 63,
  "currentTask": "EAI-TASK-040",
  "lastResult": "CLAIMED"
}
```

Fields:
- `pid` (number) — process ID of the supervisor
- `hostname` (string, optional) — machine hostname, only recorded when explicitly provided
- `processStartTime` (ISO 8601) — when the supervisor was started
- `lastHeartbeat` (ISO 8601) — timestamp of the most recent heartbeat write
- `mode` (string) — runtime mode: `POLLING`, `WEBHOOK`, or `IDLE`
- `currentIssue` (number|null) — the GitHub issue currently being worked, if any
- `currentTask` (string|null) — the EAI-TASK identifier currently being worked, if any
- `lastResult` (string|null) — the result of the last completed operation (e.g., `CLAIMED`, `SHUTDOWN`, `STOPPED`)

Security rule: The heartbeat file never records environment variables, tokens, secrets,
or private configuration.

### Heartbeat interval and stale threshold

Default configuration:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Heartbeat interval | 30,000 ms (30 s) | How often the heartbeat is refreshed |
| Stale threshold | 120,000 ms (2 min) | Age after which a heartbeat is considered stale |

The stale threshold is expected to be at least 2× the heartbeat interval to
account for normal timing variation and transient delays.

### Stale heartbeat interpretation

A heartbeat is stale when:

1. No heartbeat file exists, or
2. The `lastHeartbeat` field is missing or unparseable, or
3. The elapsed time since `lastHeartbeat` exceeds the stale threshold.

When a heartbeat is stale, downstream consumers should treat the runtime as
unhealthy. The supervisor process may have crashed, been killed, or lost its
scheduled heartbeat write.

### Graceful shutdown

The supervisor handles `SIGTERM` and `SIGINT` by:

1. Clearing the heartbeat interval timer.
2. Writing a final heartbeat with `lastResult: "SHUTDOWN"`.
3. Releasing the supervisor lock.
4. Calling an optional shutdown callback.

This ensures that surviving processes or monitoring can detect an intentional
shutdown vs. a crash.

## Structured event history

`src/event-history.js` provides a passive, append-only operational history for
task lifecycle observability. A caller may write one event per line to
`.hermes/history/events.ndjson`; the directory is runtime data and is excluded
from Git. The event schema is version `1` and supports `discovery`, `claim`,
`start`, `validation`, `retry`, `completion`, `block`, `recovery`, and
`shutdown`.

Each record contains an ISO timestamp, correlation ID, positive issue number,
EAI task ID, result code, optional commit SHA, validation summary, and a
sanitized payload. Keys that could contain tokens, secrets, credentials,
authorization data, cookies, API keys, or environment values are replaced with
`[REDACTED]`. Secret-shaped values are also redacted independently of their
keys, including bearer/basic credentials, credential-bearing URLs, private-key
headers, and common environment/token forms; payloads and nested structures are
bounded. Writes use a single append operation and rotate the active file when it
reaches the configured size, retaining a bounded number of rotated files.
`readHistory()` is migration-free and tolerates only malformed JSON in the final
non-empty line, as allowed for an interrupted append. Schema-invalid or
unsupported records, and malformed records in the middle of the file, raise a
line-numbered `HistoryCorruptionError` without including record contents.

### Programmatic API

The supervisor is implemented as a controller object returned by `createSupervisor()`:

```js
import { createSupervisor, HEARTBEAT_MODES } from '../src/runtime-supervisor.js';

const supervisor = createSupervisor({ mode: HEARTBEAT_MODES.POLLING });
await supervisor.start();

// Update tracked status
supervisor.setStatus({ issue: 63, task: 'EAI-TASK-040', result: 'WORKING' });

// Stop gracefully
supervisor.stop();
```

Individual functions:

| Function | Purpose |
|----------|---------|
| `writeHeartbeat(options)` | Write a heartbeat file atomically |
| `readHeartbeat()` | Read and parse the current heartbeat |
| `isHeartbeatStale(options)` | Check if a heartbeat is stale |
| `createSupervisor(options)` | Create a supervisor controller |

### Supervisor programmatic API options

`createSupervisor()` accepts:

- `mode` — initial runtime mode (default: `IDLE`)
- `heartbeatIntervalMs` — milliseconds between heartbeats (default: 30000)
- `staleThresholdMs` — threshold for stale detection (default: 120000)
- `hostname` — hostname to include in heartbeats (optional, for security)
- `pid` — process ID (default: `process.pid`)
- `now` — clock function (for test injection)
- `onHeartbeat` — callback called after each heartbeat write
- `onShutdown` — callback called with the signal name on shutdown

### Crash recovery and stale task reconciliation

The crash recovery module (`src/crash-recovery.js`) provides a startup reconciliation
routine that inspects all local runtime state sources, cross-references with GitHub
issue state and existing reports, and produces a machine-readable recovery outcome.

#### Purpose

The reconciliation step runs before any new task claim or execution begins. It
detects leftover artifacts from a previous worker or supervisor that may have
crashed, been killed, or exited without cleanup. It never silently resumes code
changes after an ambiguous crash.

#### Machine-readable outcomes

| Outcome | Meaning |
|---------|---------|
| `NO_ACTION` | Clean state — nothing needed recovery |
| `RECOVERED` | Stale state detected and successfully cleaned up |
| `RESUME_REQUIRED` | Task was in progress and can be safely resumed (rare, conservative) |
| `MANUAL_REVIEW_REQUIRED` | Ambiguous state — human operator must review and decide |
| `RUNTIME_ERROR` | Unexpected error during reconciliation |

#### Reconciliation procedure

On startup (or on demand), the `reconcile()` function:

1. **Reads all local state sources:**
   - Heartbeat file (`.hermes/runtime/heartbeat.json`)
   - Claim lock (`.hermes/claim.lock`)
   - Supervisor lock (`.hermes/supervisor.lock`)
   - State file (`.hermes/state.json`)

2. **Assesses liveness of each artifact:**
   - Checks if the recorded PID is alive on the current host
   - Checks if the recorded hostname matches the current host
   - Checks if the heartbeat exceeds the stale threshold (5 minutes)

3. **Evaluates scenarios in priority order:**
   - **Active process still running** → `NO_ACTION` (never interfere with live processes)
   - **Intentional shutdown** → `NO_ACTION` (clean up leftover heartbeat)
   - **All clean** → `NO_ACTION` (no artifacts present)
   - **Stale artifacts with matching report on GitHub** → `RECOVERED` (task was completed, clean up)
   - **Stale artifacts with IN_PROGRESS state + no report + open issue** → `MANUAL_REVIEW_REQUIRED` (ambiguous crash)
   - **Stale claim lock with no IN_PROGRESS state** → `RECOVERED` (clean up orphaned lock)
   - **Cross-host artifacts** → `MANUAL_REVIEW_REQUIRED` (cannot verify across hosts)

4. **Corrects GitHub labels when appropriate:**
   - If a matching report exists but the issue still shows `hermes:working`, the
     reconciliation adds `pm:review` and `hermes:done`, then removes `hermes:working`.
   - Labels are only modified after live revalidation against the current GitHub issue state.

5. **Preserves evidence:**
   - All evidence is appended to `.hermes/recovery/recovery-evidence.log` (never overwrites)
   - Each entry is timestamped with ISO 8601

#### Operator remediation guidelines

When the reconciliation outcome is `MANUAL_REVIEW_REQUIRED`:

1. **Inspect the evidence log** at `.hermes/recovery/recovery-evidence.log`
2. **Check the stale artifacts:**
   - `.hermes/claim.lock` — which issue was claimed?
   - `.hermes/runtime/heartbeat.json` — what was the last known status?
   - `.hermes/state.json` — what was the recorded state?
3. **Check GitHub** for the issue referenced in the claim lock or state
4. **Determine whether the task was completed:**
   - If a report exists in `REPORTS/`, the task was completed — remove stale artifacts and update labels
   - If no report exists and the issue is still open, the worker may have crashed during execution
5. **Manual actions:**
   - If the task was completed: remove `.hermes/claim.lock` and `.hermes/runtime/heartbeat.json`
   - If the task was not completed: update GitHub labels back to `hermes:ready` so the worker can retry
   - If the state is ambiguous: preserve all artifacts and document the finding

#### Programmatic API

```js
import { reconcile, RECONCILE_OUTCOMES } from '../src/crash-recovery.js';

const result = await reconcile({
  repoRoot: '/path/to/repo',
  hostname: 'my-host',
  pid: process.pid
});

console.log(result.outcome);   // 'NO_ACTION' | 'RECOVERED' | 'MANUAL_REVIEW_REQUIRED' | ...
console.log(result.outcomeCode);  // Machine-readable sub-code (e.g., 'ALL_CLEAN', 'STALE_LOCK_CLEANED')
console.log(result.evidence);  // Array of human-readable evidence strings
console.log(result.actions);   // Array of actions taken
console.log(result.issueNumber);  // Issue number of the affected task, if any
console.log(result.taskId);    // Task ID of the affected task, if any
```

Options:

- `repoRoot` — Repository root path (default: auto-detected)
- `now` — Clock function (for deterministic testing)
- `hostname` — Hostname (default: `os.hostname()`)
- `pid` — Current PID (default: `process.pid`)
- `ghRunner` — Custom GitHub CLI runner (for test injection)

CLI usage:

```bash
node src/crash-recovery.js
node src/crash-recovery.js --json
node src/crash-recovery.js --dry-run
node src/crash-recovery.js --repo-root /path/to/repo
```

## Known gaps between target behavior and the current worker

- The current worker is lifecycle-oriented and writes claim/report artifacts, but it does not implement a full product-specific execution engine.
- The repository still relies on the GitHub issue queue plus `.hermes/state.json` rather than a separate hidden queue service, and state writes are skipped if the file is absent.
- Production webhook execution now uses the same claim authority and worker execution helper as polling, but direct calls to the classification helper remain eligibility-only.
- If a stale lock cannot be proven stale on the current host, Hermes intentionally leaves it in place and returns `CLAIM_CONFLICT`.
- Retry policy: `CLAIM_CONFLICT` may retry only after fresh live ownership/queue revalidation on that attempt; idempotency alone is insufficient. `TRANSIENT` failures may retry only for idempotent or live-revalidated operations. Permanent, validation, operator-action-required, unknown, and ambiguous Git/GitHub mutation failures escalate without automatic retry.
- The runtime supervisor (`src/runtime-supervisor.js`) is now present with heartbeat and supervisor lock support, but it is not yet integrated into the poller/worker startup by default — it must be started explicitly.
- The supervisor lock path (`.hermes/supervisor.lock`) is separate from the task claim lock (`.hermes/claim.lock`) and is not yet lifecycle-managed by the worker scripts.
- Heartbeat stale detection is implemented in the module but downstream monitoring or auto-recovery is not yet wired up.
- Crash recovery reconciliation is implemented in `src/crash-recovery.js` but is not yet integrated into the worker startup lifecycle — it must be invoked explicitly via `reconcile()`.

## Operating summary

If the issue is runnable, claim it.
If it is not runnable, do nothing.
If it is claimed, work it to completion.
If it is blocked, say so clearly and stop.
