# EAI-TASK-042: Bounded retry backoff and failure classification

## Result

**Final status: PASS — PM QA correction rerun (validated 2026-07-19T02:48:48Z)**

## Scope

Corrected the bounded retry policy without changing product application code. The policy now clamps positive jitter to the configured backoff ceiling, sanitizes injected random samples, enforces the persisted total-time ceiling across restart, demonstrates a successful retry lifecycle with persisted-state clearing, requires live revalidation for claim conflicts, and uses unique same-directory temporary files for atomic state replacement.

## Implementation

- `src/retry-policy.js`
  - Six failure classes: `TRANSIENT`, `PERMANENT`, `CLAIM_CONFLICT`, `VALIDATION_FAILURE`, `OPERATOR_ACTION_REQUIRED`, `UNKNOWN`.
  - Bounded exponential backoff with maximum-attempt and total-time ceilings.
  - Deterministic/injectable jitter; out-of-range or non-finite samples are conservatively bounded and final delay never exceeds `maxBackoffMs`.
  - Retries only for transient/claim-conflict failures when the caller marks the operation idempotent or supplies live revalidation.
  - Claim conflicts without live revalidation, destructive/ambiguous Git/GitHub mutations, operator-action-required failures, and unknown failures terminate without retry.
  - Retry state records attempt, next retry time, failure class, evidence, and timestamps; persisted `startedAtMs` is reused after restart.
  - Atomic persistence uses a unique same-directory temporary path followed by rename and preserves unrelated state fields. `clearRetryState()` removes retry state after success.
- `tests/retry-policy.test.mjs`
  - 9 deterministic tests covering classification, retry safety, bounded backoff, jitter boundary/sanitization, attempt exhaustion, terminal failures, persisted ceiling boundary after restart, success-after-retry state clearing, claim conflicts, and operator/unknown escalation.
- No `apps/` or `services/` product code was changed.

## Validation

| Command | Result |
|---|---|
| `node --test tests/retry-policy.test.mjs` | **PASS — 9/9** |
| `node --test tests/*.test.mjs` | **PASS — 99/99** |
| `npm test` | **PASS — 99/99** |
| `node scripts/framework-doctor.mjs` | **PASS** |
| `git diff --check` | **PASS** |
| JSON parsing | **PASS — handover and `.hermes/state.json`** |

Terminal output is recorded in `LOGS/EAI-TASK-042-terminal.log`.

## Safety and ownership

The module remains passive: callers own operation execution and must provide an idempotency or live-revalidation contract. Git/GitHub mutations are not blindly retried. Claim conflicts retry only with fresh revalidation and remain bounded. Terminal failures provide PM/operator escalation evidence. Tests use temporary files and injected clocks/randomness; they do not mutate real GitHub issues.

## State and artifacts

`.hermes/state.json` pre-existed and was updated for this correction rerun. Artifacts were validated before commit and push. The final pushed commit SHA is recorded in the handover and state metadata after finalization.

Rerun evidence is recorded in `LOGS/EAI-TASK-042-terminal.log`; the validated artifacts are pushed in immutable commit `c113724d218d0397e79689edc507e7fa8de28f05`.
