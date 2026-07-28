# Forge Autonomous Execution Architecture

## Decision

The supported execution method is `FULLY_AUTOMATIC_CODEX_CLI` on the Codex desktop host. The installed CLI (`0.146.0-alpha.3.1`) completed a non-interactive JSONL probe in this repository. The worker is launched with a bounded workspace-write sandbox and an explicit `approval_policy="never"` configuration.

The VPS also has Codex CLI (`0.142.0`), but its unattended probe did not complete within the bounded test window. It is not the selected worker host.

## Flow

1. A queue poll discovers an open issue with `pm:ready` and `forge:ready`.
2. Forge re-reads the issue, atomically replaces `forge:ready` with `forge:working`, and verifies the mutation.
3. Forge writes a sanitized, timestamped context file under `.hermes/forge/`.
4. The execution adapter acquires an exclusive lock and starts one Codex CLI worker.
5. State and heartbeat files are updated while the worker runs; JSONL output is sanitized before logging.
6. Normal exit records `COMPLETED`; failure or timeout records `BLOCKED` and releases the lock.

## Queue boundary

The trigger uses the GitHub CLI (`gh`) for issue polling and mutation. The host installation must provide `gh` authentication for `moh0709/everythingAI`; Codex authentication alone does not grant a local process GitHub credentials. On the current Windows host `gh` is not installed, so the final PM test must run after that prerequisite is installed or use an equivalent authenticated trigger host.

Unrelated files remain outside the execution scope and are never staged with broad Git commands.
