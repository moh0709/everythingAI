# EAI-TASK-041: Add crash recovery and stale task reconciliation — Correction Pass

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI/`
- **Current branch:** `main`
- **Starting commit SHA:** `787a4c33`
- **Artifact commit SHA:** `6861fc4`
- **Final pushed SHA:** `6861fc4`

## Summary

Corrective iteration addressing PM QA rejection. Three defect fixes were implemented and verified:

### Fix 1: Unconditional cross-host escalation (previously unsafe)

**Problem:** `reconcile()` computed `claimPidAlive` using the local `isPidAlive()` check even when `claimLock.hostname` was different. If a remote lock's PID happened to exist locally (e.g., `process.pid`), the early cross-host escalation was skipped, and later conditions treated the lock as stale — allowing unsafe removal.

**Fix:** Cross-host checks are now unconditional and happen immediately after reading all state sources, before any PID-based liveness checks:

- **Claim lock from different host** → `CROSS_HOST_LOCK` → `MANUAL_REVIEW_REQUIRED`
- **Supervisor lock from different host** → `CROSS_HOST_SUPERVISOR_LOCK` → `MANUAL_REVIEW_REQUIRED`
- **Heartbeat from different host** → `CROSS_HOST_HEARTBEAT` → `MANUAL_REVIEW_REQUIRED`

The old pattern `if (claimLock && claimSameHost === false && !claimPidAlive)` was replaced with pure `if (claimLock && claimSameHost === false)`. No local PID lookup is ever performed on cross-host artifacts.

**New tests:**
- `cross-host claim lock with locally-existing PID → MANUAL_REVIEW_REQUIRED not stale cleanup` — uses `process.pid` on a remote host, proves lock is NOT removed
- `cross-host supervisor lock → MANUAL_REVIEW_REQUIRED`
- `cross-host heartbeat → MANUAL_REVIEW_REQUIRED`
- `both cross-host claim lock and supervisor lock → first cross-host check triggers MANUAL_REVIEW`

### Fix 2: GitHub label correction with live verification

**Problem:** The implementation called `ghEditLabels` but did not re-read GitHub after mutation to verify the labels actually changed.

**Fix:** A new `correctLabelsWithVerification()` function:
1. Calls `ghEditLabels` with target labels
2. Immediately re-reads the issue via `ghViewIssue`
3. Verifies that all added labels are present and all removed labels are absent
4. On verification failure, returns `LABEL_VERIFICATION_FAILED` → `MANUAL_REVIEW_REQUIRED` — never fabricates success

This function is used in both label correction paths (in `handleStaleHeartbeatAndLock` and `handleStaleClaimLock`).

**New tests:**
- `label correction with non-responsive edit (labels unchanged) → MANUAL_REVIEW_REQUIRED` — simulates edit that returns success but doesn't change labels
- `label correction with incomplete edit (adds labels but does not remove stale ones) → MANUAL_REVIEW_REQUIRED` — simulates partial success

Existing label tests were updated to verify that post-edit re-reads occur (`harness.views.length >= 2`).

### Fix 3: tryRemove result checking

**Problem:** `tryRemove()` returns success/failure but callers unconditionally recorded `"removed X"` actions even when `tryRemove` returned false.

**Fix:** All `tryRemove()` calls now check the return value before recording actions:
```js
if (tryRemove(paths.claimLockPath)) {
    actions.push('removed stale claim lock');
}
```

This applies to `cleanupStaleArtifacts()`, `handleStaleClaimLock()`, the stale heartbeat path, and the intentional shutdown path.

**New test:**
- `tryRemove only records action when file is actually removed` — verifies exactly one removal action for the heartbeat file that actually exists

## Files changed

- `src/crash-recovery.js` — Fixed cross-host escalation, label verification, tryRemove result checking
- `tests/crash-recovery.test.mjs` — 7 new tests (27 total), existing tests hardened for label verification views
- `REPORTS/EAI-TASK-041-CRASH-RECOVERY-RECONCILIATION.md` — Updated this report
- `LOGS/EAI-TASK-041-terminal.log` — Terminal log with validation output
- `.hermes/state.json` — Updated state

## Validation summary

| Command | Result |
|---------|--------|
| Framework doctor (`node scripts/framework-doctor.mjs`) | **PASS** (gh authenticated, state valid, all files present) |
| All tests (`node --test tests/*.test.mjs`) | **PASS** (88/88 — 61 pre-existing + 27 crash recovery tests) |
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
| **Cross-host with local PID** | **MANUAL_REVIEW** | **`cross-host claim lock with locally-existing PID → MANUAL_REVIEW_REQUIRED not stale cleanup`** |
| **Cross-host supervisor lock** | **MANUAL_REVIEW** | **`cross-host supervisor lock → MANUAL_REVIEW_REQUIRED`** |
| **Cross-host heartbeat** | **MANUAL_REVIEW** | **`cross-host heartbeat → MANUAL_REVIEW_REQUIRED`** |
| **Label verification: stale edit** | **MANUAL_REVIEW** | **`label correction with non-responsive edit (labels unchanged) → MANUAL_REVIEW_REQUIRED`** |
| **Label verification: incomplete edit** | **MANUAL_REVIEW** | **`label correction with incomplete edit (adds labels but does not remove stale ones) → MANUAL_REVIEW_REQUIRED`** |
| **tryRemove result accuracy** | **verified** | **`tryRemove only records action when file is actually removed`** |
| **Both cross-host locks** | **MANUAL_REVIEW** | **`both cross-host claim lock and supervisor lock → first cross-host check triggers MANUAL_REVIEW`** |

**Bold** rows are new in this correction pass.

## PM QA acceptance checklist

- [x] **Cross-host safety:** `reconcile()` never infers remote-process liveness from a local PID lookup.
- [x] **Cross-host safety:** Any claim/supervisor lock owned by another hostname remains untouched and returns `MANUAL_REVIEW_REQUIRED`.
- [x] **Cross-host safety:** Deterministic tests where a different-host lock uses `process.pid` prove no local artifact or GitHub label is mutated.
- [x] **Cross-host safety:** Same conservative rule applied consistently to heartbeat, claim lock, and supervisor lock combinations.
- [x] **Label verification:** GitHub labels are re-read after mutation to verify change.
- [x] **Label verification:** `hermes:working` absence and `pm:review` + `hermes:done` presence are verified.
- [x] **Label verification:** Failed verification returns `MANUAL_REVIEW_REQUIRED` (not `RECOVERED`).
- [x] **Label verification:** Tests for successful verification and simulated edit that returns success without changing labels.
- [x] **Evidence consistency:** Artifact removal is only reported when `tryRemove()` actually succeeds.
- [x] **Evidence consistency:** Report, log, handover, `.hermes/state.json` updated with new SHA and exact test count (27 crash recovery + 61 pre-existing = 88 total).
- [x] **Validation:** Framework doctor, all Node tests, `npm test`, `git diff --check`, and JSON parsing all pass.

## How existing behavior was preserved

- No product application code (`apps/`, `services/`) was modified.
- No existing Hermes framework scripts (`scripts/task-worker.mjs`, `scripts/task-poller.mjs`) were modified.
- No existing src modules were modified (only `src/crash-recovery.js` which is new).
- The crash recovery module is passive and must be explicitly invoked — it does not affect existing claim, execution, or reporting workflows.

## Risks and rollback note

- **Risk:** Crash recovery reconciliation is not yet integrated into the worker startup lifecycle — must be invoked explicitly via `reconcile()`.
- **Risk:** Cross-host artifacts always escalate to manual review (conservative), even when the issue is completed on GitHub.
- **Risk:** Evidence log grows unbounded — should be rotated or archived periodically.
- **Rollback:** Revert `src/crash-recovery.js`, `tests/crash-recovery.test.mjs`, and `.hermes/state.json` to prior commit. Remove the handover artifact. The report can stay as historical evidence.

## Follow-up

- **EAI-TASK-042:** Integrate crash recovery reconciliation into worker startup and poller watch loop (still blocked until this task is independently accepted).
