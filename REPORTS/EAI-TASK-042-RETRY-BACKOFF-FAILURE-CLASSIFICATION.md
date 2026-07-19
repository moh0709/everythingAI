# EAI-TASK-042: Bounded retry backoff and failure classification

## Result

**Final status: PASS**

## Scope

Implemented a passive retry-policy module for Hermes runtime operations without changing product application code. The policy provides six explicit failure classes, bounded exponential backoff, optional deterministic jitter injection, an overall retry time ceiling, and JSON state persistence.

## Implementation

- `src/retry-policy.js`
  - Failure classes: `TRANSIENT`, `PERMANENT`, `CLAIM_CONFLICT`, `VALIDATION_FAILURE`, `OPERATOR_ACTION_REQUIRED`, `UNKNOWN`.
  - Default policy: 3 attempts, 1 second initial delay, 30 second per-delay cap, 120 second total ceiling, zero jitter by default.
  - Retries are allowed only for transient/claim-conflict failures when the caller marks the operation idempotent or supplies live revalidation.
  - Destructive or ambiguous Git/GitHub mutations are not automatically retried.
  - Retry state records attempt number, next retry time, failure class, evidence, and start/update timestamps.
  - State writes are atomic and preserve unrelated `.hermes/state.json` fields. Successful completion can clear retry fields with `resetRetryState()`.
- `tests/retry-policy.test.mjs`
  - Covers classification, retry safety, bounded backoff, success-after-retry, exhaustion, permanent/validation/unknown failures, claim conflict, persistence/restart, and reset.
- No `apps/` or `services/` product code was changed.

## Validation

| Command | Result |
|---|---|
| `node --test tests/retry-policy.test.mjs` | **PASS** — 6/6 |
| `node --test tests/*.test.mjs` | **PASS** — 96/96 |
| `npm test` | **PASS** — 96/96 |
| `node scripts/framework-doctor.mjs` | **PASS** |
| `git diff --check` | **PASS** |
| JSON parsing | **PASS** — handover and `.hermes/state.json` |

Terminal output is recorded in `LOGS/EAI-TASK-042-terminal.log`.

## Safety and ownership

The module does not schedule or execute retries itself. The operation owner must decide whether an operation is idempotent or has been live-revalidated before calling `nextRetry()`. Git/GitHub mutations remain operator-action-required unless protected by an explicit safe revalidation contract. Exhausted, non-retryable, validation, and ambiguous failures produce terminal state suitable for PM/operator handoff.

## State and artifacts

`.hermes/state.json` already existed and was updated for this task. No new state file was created. The final commit SHA is recorded after commit/push finalization.
