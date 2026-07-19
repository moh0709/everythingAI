# EAI-TASK-044 — Worker health CLI and operational metrics snapshot

## Result

**Correction status:** PASS — PM QA rejection addressed.

Implementation commit SHA: `0f2acd67c8b7b4f8d99cd8bbb029c60903401072`
Adversarial test/artifact commit SHA: `3e0df61a85430d1950d3c3e365b52dc3a438fc14`
Metadata synchronization commit SHA: `f8cda7df9815da82a19b298d7b5e5554a8c791ca`

The read-only operator command remains available as `node scripts/hermes-health.mjs` and `npm run hermes:health`. This correction pass hardens retry corruption handling, routes mtime and timestamp ages through the injected clock, documents total status precedence, orders durable history chronologically across rotations, and expands the focused tests from 6 to 24.

## QA corrections

- Corrupt `.hermes/retry.json` now contributes to `DEGRADED` and `artifacts.corrupt`.
- Status precedence is explicit and documented in `docs/HERMES_WORKER_HEALTH.md`.
- Heartbeat, lock timestamp, and file-mtime fallback ages all use the injected clock.
- Boundary coverage includes exactly 120,000 ms (fresh) and 120,001 ms (stale), plus lock age.
- Missing/corrupt state, heartbeat, retry, locks, unsupported history schema, corrupt middle history, and allowed partial trailing history are covered.
- JSON/human output tests snapshot runtime directory entries, bytes, and mtimes before/after execution.
- Last completion selection is chronological across active and rotated history.
- Secret canaries are asserted absent from JSON and human output; corrupt record contents are never emitted.
- Mixed-condition precedence cases cover every precedence transition, including corruption, blocked, unknown, stale, stopped, and active-lock combinations.
- Every malformed runtime JSON artifact (state, heartbeat, claim lock, supervisor lock, retry) is tested as deterministic degradation; missing optional artifacts and missing heartbeat are covered separately.
- A recursive before/after snapshot proves runtime bytes, size, mode, inode, mtime, directory entries, and absence are unchanged.
- Secret canaries are checked across JSON, human output, stderr, and error serialization paths.

## Files changed

- `scripts/hermes-health.mjs`
- `tests/hermes-health.test.mjs` — 6 additional adversarial tests (24 focused total)
- `docs/HERMES_WORKER_HEALTH.md`
- `LOGS/EAI-TASK-044-terminal.log`
- `REPORTS/EAI-TASK-044-WORKER-HEALTH-METRICS.md`
- `docs/HANDOVER_2026-07-15_EAI_TASK_044.json`
- `.hermes/state.json`

No `apps/` or `services/` core application code was modified.

## Validation

- `node --test tests/hermes-health.test.mjs` — PASS, 24/24.
- `node scripts/framework-doctor.mjs` — PASS.
- `node --test tests/*.test.mjs` — PASS, 135/135.
- `npm test` — PASS, 135/135.
- `node scripts/hermes-health.mjs --json` — PASS output validation; live status `STOPPED`, queue available with 1 ready issue, read-only true. CLI exits 1 for non-healthy alert status as documented.
- JSON parsing of state, handover, and package manifests — PASS.
- `git diff --check` — PASS.
