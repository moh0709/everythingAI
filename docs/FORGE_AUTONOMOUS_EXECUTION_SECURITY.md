# Forge Autonomous Execution Security

## Boundaries

- Only issues with live `pm:ready` and `forge:ready` labels are runnable.
- The worker receives a complete context file and a repository working directory.
- The prompt forbids destructive Git operations, secret exposure, self-acceptance, issue closure, and unrelated-file changes.
- One claim lock and one execution lock prevent duplicate launches.
- Context age, runtime, and heartbeat intervals are bounded.
- Dead stale locks can be recovered only on the same host after the stale window.
- `danger-full-access` is required for Git staging and GitHub push; it is permitted only after the live PM/Forge label gate and repository-path check succeed.
- A zero Codex process exit is not success. The worker must emit the constrained submission result and the trigger must verify live completion labels.

## Secrets and evidence

Codex output, error messages, and Telegram event text pass through the existing sanitizer. Token-shaped values, bearer values, bot tokens, and PEM private keys are redacted. Runtime files live below `.hermes/forge/` and are ignored by Git.

GitHub authentication belongs to the host process environment or the GitHub CLI credential store. Telegram credentials belong in the host service environment. Neither is committed or printed.

## Failure handling

Worker start failure, non-zero exit, timeout, invalid context, and reporting failure produce explicit blocked or recovery evidence. The trigger does not silently relaunch a live worker. Recovery is observable through state, heartbeat, sanitized JSONL logs, GitHub labels/comments, and the configured Telegram event channel.
