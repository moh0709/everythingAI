# EAI-TASK-041: Add crash recovery and stale task reconciliation

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI/`
- **Current branch:** `main`
- **Starting commit SHA:** `787a4c33`
- **Artifact commit SHA:** recorded in issue comment
- **Final SHA source of truth:** GitHub issue comment after artifact push

## Summary

Added a crash recovery and stale task reconciliation module (`src/crash-recovery.js`)
that provides a conservative, evidence-based startup reconciliation routine.

### What was built

The `reconcile()` function inspects all local runtime state sources:
- Heartbeat file (`.hermes/runtime/heartbeat.json`)
- Claim lock (`.hermes/claim.lock`)
- Supervisor lock (`.hermes/supervisor.lock`)
- State file (`.hermes/state.json`)

It cross-references with GitHub issue state and existing reports, and produces
a machine-readable outcome:

| Outcome | Code | Meaning |
|---------|------|---------|
| NO_ACTION | ALL_CLEAN, PROCESS_ALIVE, INTENTIONAL_SHUTDOWN | Clean state, no recovery needed |
| RECOVERED | COMPLETED_ELSEWHERE, REPORT_EXISTS_STALE_ARTIFACTS, STALE_LOCK_CLEANED, etc. | Stale state successfully cleaned up |
| MANUAL_REVIEW_REQUIRED | AMBIGUOUS_CRASH_NO_REPORT, CROSS_HOST_LOCK, IN_PROGRESS_ALONE, etc. | Ambiguous — human must review |
| RUNTIME_ERROR | GITHUB_UNAVAILABLE | Unexpected error during reconciliation |

### Key design decisions

1. **Never silently resume** — An ambiguous crash (stale heartbeat + stale claim lock + IN_PROGRESS state without matching report) always escalates to `MANUAL_REVIEW_REQUIRED`.
2. **Conservative cross-host handling** — Artifacts from a different host are always escalated since the remote PID cannot be verified.
3. **Evidence preserved** — All reconciliation evidence is appended to `.hermes/recovery/recovery-evidence.log` (never overwritten).
4. **Label correction after live revalidation** — If a matching report exists but GitHub still shows `hermes:working`, labels are corrected to `pm:review` + `hermes:done`.

## Files changed

- `src/crash-recovery.js` — New crash recovery reconciliation module
- `tests/crash-recovery.test.mjs` — 20 deterministic tests covering all scenarios
- `docs/HERMES_OPERATING_MANUAL_RC1.md` — Updated with crash recovery documentation and operator remediation guidelines
- `docs/HANDOVER_2026-07-18_EAI_TASK_041.json` — Handover artifact
- `LOGS/EAI-TASK-041-terminal.log` — Terminal log with validation output
- `REPORTS/EAI-TASK-041-CRASH-RECOVERY-RECONCILIATION.md` — This report
- `.hermes/state.json` — Updated state

## Validation summary

| Command | Result |
|---------|--------|
| Framework doctor (`node scripts/framework-doctor.mjs`) | **PASS** (gh authenticated, state valid, all files present) |
| All tests (`node --test tests/*.test.mjs`) | **PASS** (81/81 — 61 pre-existing + 20 crash recovery tests) |
| `npm test` | **PASS** (identical to node --test) |
| `git diff --check` | **PASS** (no whitespace errors) |
| JSON parse checks | **PASS** (handover JSON, state JSON all valid) |

## Test coverage

| Scenario | Outcome | Test name |
|----------|---------|-----------|
| All clean | NO_ACTION | `all clean — no heartbeat, no lock, no state → NO_ACTION` |
| Active process alive | NO_ACTION | `active heartbeat with alive PID on same host → NO_ACTION` |
| Active claim lock owner alive | NO_ACTION | `active claim lock with alive PID on same host → NO_ACTION` |
| Active supervisor alive | NO_ACTION | `active supervisor lock with alive PID → NO_ACTION` |
| Intentional shutdown | NO_ACTION | `intentional shutdown heartbeat with clean state → NO_ACTION` |
| STOPPED heartbeat | NO_ACTION | `STOPPED heartbeat with clean state → NO_ACTION` |
| Stale hb + lock + report | RECOVERED | `stale heartbeat + stale claim lock + matching report → RECOVERED` |
| Stale lock + report | RECOVERED | `stale claim lock with matching report → RECOVERED` |
| Stale hb only | RECOVERED | `stale heartbeat without claim lock → RECOVERED` |
| Stale lock (no IN_PROGRESS) | RECOVERED | `stale claim lock without IN_PROGRESS state → RECOVERED` |
| Full stale lifecycle (completed issue) | RECOVERED | `crash recovery handles full stale lifecycle gracefully` |
| Label correction on report mismatch | RECOVERED | `recovery corrects stale hermes:working on GitHub when report exists` |
| Label correction (stale hermes:working) | RECOVERED | `recovery corrects hermes:working when report exists and issue still shows working` |
| Ambiguous crash (no report) | MANUAL_REVIEW | `stale artifacts + IN_PROGRESS + no report + open issue → MANUAL_REVIEW_REQUIRED` |
| Stale lock + IN_PROGRESS | MANUAL_REVIEW | `stale claim lock with IN_PROGRESS state (no heartbeat) → MANUAL_REVIEW_REQUIRED` |
| IN_PROGRESS alone | MANUAL_REVIEW | `IN_PROGRESS state without claim lock or heartbeat → MANUAL_REVIEW_REQUIRED` |
| Cross-host claim lock | MANUAL_REVIEW | `claim lock from different host → MANUAL_REVIEW_REQUIRED` |
| Cross-host artifacts | MANUAL_REVIEW | `stale artifacts from different host are escalated for manual review` |
| Stale hb + IN_PROGRESS (no lock) | MANUAL_REVIEW | `stale heartbeat with IN_PROGRESS state (no claim lock) → MANUAL_REVIEW_REQUIRED` |
| Evidence log preserved | verified | `reconciliation writes recovery evidence log` |

## How existing behavior was preserved

- No product application code (`apps/`, `services/`) was modified.
- No existing Hermes framework scripts (`scripts/task-worker.mjs`, `scripts/task-poller.mjs`) were modified.
- No existing src modules were modified.
- The crash recovery module is passive and must be explicitly invoked — it does not affect existing claim, execution, or reporting workflows.

## Risks and rollback note

- **Risk:** Crash recovery reconciliation is not yet integrated into the worker startup lifecycle — must be invoked explicitly via `reconcile()`.
- **Risk:** Cross-host artifacts always escalate to manual review (conservative), even when the issue is completed on GitHub.
- **Risk:** Evidence log grows unbounded — should be rotated or archived periodically.
- **Rollback:** Remove `src/crash-recovery.js`, `tests/crash-recovery.test.mjs`, revert `docs/HERMES_OPERATING_MANUAL_RC1.md` to prior state, and remove the handover/report artifacts.

## Follow-up

- **EAI-TASK-042:** Integrate crash recovery reconciliation into worker startup and poller watch loop.
