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

- The webhook classifier invokes the shared claim authority before returning `EXECUTE`.
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

## Known gaps between target behavior and the current worker

- The current worker is lifecycle-oriented and writes claim/report artifacts, but it does not implement a full product-specific execution engine.
- The repository still relies on the GitHub issue queue plus `.hermes/state.json` rather than a separate hidden queue service, and state writes are skipped if the file is absent.
- Webhook classification can identify a claimable event, but the actual ownership transition still happens in the polling worker path.
- If a stale lock cannot be proven stale on the current host, Hermes intentionally leaves it in place and returns `CLAIM_CONFLICT`.

## Operating summary

If the issue is runnable, claim it.
If it is not runnable, do nothing.
If it is claimed, work it to completion.
If it is blocked, say so clearly and stop.
