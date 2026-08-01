# Forge Autonomous Execution Architecture

## Decision

The supported execution method is `FULLY_AUTOMATIC_CODEX_CLI` on the Codex desktop host. The installed CLI (`0.146.0-alpha.3.1`) completed a non-interactive JSONL probe in this repository. The worker is launched with `danger-full-access` and an explicit `approval_policy="never"` configuration because Codex `workspace-write` intentionally blocks `.git` writes and GitHub network access. The PM-release label gate, repository-path restriction, single-owner locks, timeout, and structured completion contract provide the external execution boundary.

The VPS also has Codex CLI (`0.142.0`), but its unattended probe did not complete within the bounded test window. It is not the selected worker host.

## Flow

1. A queue poll discovers an open issue with `pm:ready` and `forge:ready`.
2. Forge re-reads the issue, atomically replaces `forge:ready` with `forge:working`, and verifies the mutation.
3. Forge writes a sanitized, timestamped context file under `.hermes/forge/`.
4. The execution adapter acquires an exclusive lock and starts one Codex CLI worker.
5. State and heartbeat files are updated while the worker runs; JSONL output is sanitized before logging.
6. Codex must write a schema-constrained final result. Only `SUBMITTED_FOR_PM_REVIEW` plus verified live `forge:done + pm:review` records `COMPLETED`.
7. A missing/blocked final result, unverified labels, process failure, or timeout records `BLOCKED` and releases the lock.

When the released queue is empty, Forge enters the maintenance selector instead of stopping immediately. It considers open issues that are not actively owned, excludes protected issue #69, and uses this priority order:

1. `forge:done` + `pm:review`
2. `forge:blocked` + `pm:review`
3. older open issues with no recent activity
4. governance or administrative backlog

The selected maintenance issue is claimed with `forge:working`, receives the same bounded Codex context and execution contract, and must return to `forge:done + pm:review` or `forge:blocked + pm:review`. If no maintenance candidate exists, the trigger reports `IDLE` with queue-empty evidence.

## Queue boundary

The trigger uses the GitHub CLI (`gh`) for issue polling and mutation. The host installation must provide `gh` authentication for `moh0709/everythingAI`; Codex authentication alone does not grant a local process GitHub credentials. On the current Windows host `gh` is not installed, so the final PM test must run after that prerequisite is installed or use an equivalent authenticated trigger host.

Unrelated files remain outside the execution scope and are never staged with broad Git commands.
