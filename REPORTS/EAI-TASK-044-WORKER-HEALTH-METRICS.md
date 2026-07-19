# EAI-TASK-044 — Worker health CLI and operational metrics snapshot

## Result

**Final status:** PASS

Implemented a read-only operator health command at `node scripts/hermes-health.mjs` (also available as `npm run hermes:health`). It reads heartbeat, state, claim/supervisor locks, retry state, and versioned event history without mutating runtime artifacts. It emits JSON with `--json` or concise human-readable output by default.

## Health states

- `HEALTHY`: fresh heartbeat and no blocking/degradation evidence.
- `DEGRADED`: corrupt runtime/history data, retry pending, or an active lock is present.
- `BLOCKED`: terminal retry state or explicit blocked state.
- `STALE`: heartbeat is absent of a usable timestamp or older than two minutes.
- `STOPPED`: clean stopped/idle heartbeat.
- `UNKNOWN`: no heartbeat is available and no stronger state can be established.

Corrupt or missing files are handled conservatively. Queue lookup is read-only and degrades to `available: false` if GitHub is unavailable. No environment variables, credentials, webhook payloads, or secret values are included.

## Metrics

Counters are derived only from durable NDJSON event history (including retained rotated history files): discovered, claimed, completed, blocked, failed, recovered, and retried. The snapshot also reports queue visibility, current task/issue, last completed task, last failure summary, heartbeat age, retry state, and lock ages.

## Files changed

- `scripts/hermes-health.mjs`
- `tests/hermes-health.test.mjs`
- `package.json`
- `LOGS/EAI-TASK-044-terminal.log`
- `REPORTS/EAI-TASK-044-WORKER-HEALTH-METRICS.md`
- `docs/HANDOVER_2026-07-15_EAI_TASK_044.json`
- `.hermes/state.json`

## Validation

- `node --test tests/hermes-health.test.mjs` — PASS, 6/6.
- `node scripts/framework-doctor.mjs` — PASS.
- `node --test tests/*.test.mjs` — PASS, 117/117.
- `npm test` — PASS, 117/117.
- `node scripts/hermes-health.mjs --json` — PASS; live snapshot emitted JSON and reported `STOPPED` because the persisted heartbeat is a clean stopped heartbeat.
- `git diff --check` — PASS.

No `apps/` or `services/` core application code was modified.
