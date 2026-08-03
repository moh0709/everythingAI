# Forge Eligibility Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Forge claim exactly one explicitly released, dependency-satisfied issue and produce complete eligibility evidence on every scheduler run.

**Architecture:** A pure `EligibilityEngine` becomes the only issue classifier and deterministic selector. An `EligibilityReport` serializes every evaluation atomically. The trigger acquires one scheduler lock before discovery, writes selection evidence before mutation, re-evaluates against freshly fetched issue state, and then performs the existing verified claim transition.

**Tech Stack:** Node.js ES modules, built-in `node:test`, GitHub CLI adapter, atomic JSON files.

---

### Task 1: Central Eligibility Engine

**Files:**
- Create: `src/forge-eligibility.js`
- Create: `tests/forge-eligibility.test.mjs`
- Modify: `src/agent-queue-policy.js`

- [ ] **Step 1: Write failing terminal-state and explicit-release tests**

Create fixtures representing issues #4, #5, #69, #78, and #96. Assert the wished-for API:

```js
const engine = new EligibilityEngine({
  issues,
  currentHeadSha: 'a'.repeat(40),
  currentIssueNumber: 96,
  controllerIssueNumber: 96,
  cycleId: '2026-08-03',
  processedIssues: []
});

assert.deepEqual(engine.evaluate(issue4).reasons, ['forge_done', 'pm_review']);
assert.equal(engine.evaluate(issue78).eligible, false);
assert.ok(engine.evaluate(issue78).reasons.includes('missing_pm_ready'));
assert.ok(engine.evaluate(issue78).reasons.includes('missing_forge_ready'));
assert.ok(engine.evaluate(issue96).reasons.includes('currently_executing'));
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/forge-eligibility.test.mjs`

Expected: FAIL because `src/forge-eligibility.js` and `EligibilityEngine` do not exist.

- [ ] **Step 3: Implement the minimal engine contract**

Create:

```js
export class EligibilityEngine {
  constructor(options = {}) { /* normalize immutable run context */ }
  evaluate(issue) { /* all eligibility checks live here */ }
  evaluateAll() { /* map evaluate over the complete issue universe */ }
  select() { /* deterministic first eligible evaluation */ }
}
```

`evaluate()` must return:

```js
{
  issueNumber,
  eligible,
  reasons,
  primaryReason,
  dependencies,
  dependencyDepth,
  priorityRank,
  createdAt
}
```

Require `pm:ready` plus `forge:ready` by default. Accept alternate ready labels only from `approvedReadyLabels`. Reject closed, current/controller/maintenance, terminal or competing ownership, unresolved/open/cyclic dependencies, same-cycle processing, and unchanged HEAD.

Route `classifyForgeQueueIssue()` through the engine-compatible classifier rather than retaining independent predicates.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/forge-eligibility.test.mjs tests/agent-queue-policy.test.mjs`

Expected: PASS.

- [ ] **Step 5: Add failing ordering and dependency-resolution tests**

Assert exact parsing of `Dependency: #10`, `Depends on: EAI-TASK-010`, and `Blocked by: #10`; unresolved declarations and open dependencies must fail closed. Assert order by dependency depth, `priority:critical|high|medium|low`, creation date, and issue number.

- [ ] **Step 6: Verify RED, implement normalization, then verify GREEN**

Run the focused test before and after implementation. The first run must fail on ordering or dependency reasons; the second must pass.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/forge-eligibility.js src/agent-queue-policy.js tests/forge-eligibility.test.mjs
git commit -m "fix: centralize Forge issue eligibility"
```

### Task 2: Durable Eligibility Report

**Files:**
- Create: `src/forge-eligibility-report.js`
- Create: `tests/forge-eligibility-report.test.mjs`

- [ ] **Step 1: Write failing report tests**

Assert that:

```js
const report = new EligibilityReport({ runId, cycleId, headSha, startedAt });
report.record(evaluation);
report.complete({ selectedIssueNumber: null, outcome: 'IDLE', message: 'No eligible issues found' });
report.write(reportPath);
```

produces valid JSON with one entry per inspected issue, exact reason arrays, selected issue, outcome, and sanitized evidence. Also assert atomic replacement leaves no temporary file.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/forge-eligibility-report.test.mjs`

Expected: FAIL because the report component does not exist.

- [ ] **Step 3: Implement minimal report component**

Use schema version `1`, existing secret-redaction behavior, and same-directory temporary write plus rename. Expose `record`, `complete`, `toJSON`, and `write`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/forge-eligibility-report.test.mjs`

```bash
git add src/forge-eligibility-report.js tests/forge-eligibility-report.test.mjs
git commit -m "feat: record Forge eligibility reports"
```

### Task 3: Replace Divergent Scheduler Selection

**Files:**
- Modify: `scripts/forge-trigger.mjs`
- Modify: `src/forge-trigger.js`
- Modify: `tests/forge-trigger.test.mjs`

- [ ] **Step 1: Write failing scheduler regression tests**

Replace maintenance-fallback expectations with tests proving:

```js
assert.equal(result.message, 'No eligible issues found');
assert.equal(labelUpdates.length, 0); // unreleased #78
assert.equal(comments.length, 0);
```

Also assert every supplied issue appears in the persisted report, #4/#5/#69/#96 have exact reasons, and only the top sorted eligible issue reaches `claimForgeIssue`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/forge-trigger.test.mjs`

Expected: FAIL because the current poller falls through to unlabeled maintenance issues and does not persist the new report.

- [ ] **Step 3: Integrate the engine and report**

Change GitHub discovery to fetch the complete issue universe needed for reporting and dependency resolution. Remove `listMaintenanceIssues`, `selectForgeMaintenanceIssue`, and stale/governance eligibility from the scheduler path.

`pollForgeOnce()` must:

```text
acquire scheduler lock
  -> list issues
  -> evaluate every issue
  -> prewrite eligibility report
  -> return exact idle message when selection is empty
  -> otherwise call the verified claim path
  -> finalize report and release lock
```

Preserve legacy exported maintenance helpers only when required by existing consumers; they must not be reachable from scheduler selection.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/forge-trigger.test.mjs tests/forge-eligibility*.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/forge-trigger.mjs src/forge-trigger.js tests/forge-trigger.test.mjs
git commit -m "fix: restrict Forge scheduler to eligible issues"
```

### Task 4: Claim Revalidation and Duplicate Prevention

**Files:**
- Modify: `src/forge-trigger.js`
- Modify: `scripts/forge-trigger.mjs`
- Modify: `tests/forge-trigger.test.mjs`

- [ ] **Step 1: Write failing claim-path tests**

Add tests where two concurrent `pollForgeOnce()` calls target one ready issue. Assert exactly one label transition, one acknowledgement, and one execution. Add a stale-state test where `pm:review` or dependency blockage appears between selection and mutation; assert zero mutation and a claim conflict.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/forge-trigger.test.mjs`

Expected: FAIL because the existing lock begins after scheduler selection and live dependency context is not rebuilt.

- [ ] **Step 3: Extend the lock and live engine boundary**

Allow `claimForgeIssue()` to use a lock already owned by `pollForgeOnce()`. Re-fetch the issue universe, rebuild `EligibilityEngine`, and call `evaluate()` for the selected issue immediately before mutation. Do not mutate labels, comment, or execute when that result is ineligible.

After verified claim mutation, record the issue and HEAD in processing state so later ticks fail `already_processed` or `head_unchanged` even if labels are manually made ready again.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/forge-trigger.test.mjs`

```bash
git add src/forge-trigger.js scripts/forge-trigger.mjs tests/forge-trigger.test.mjs
git commit -m "fix: make Forge claim selection idempotent"
```

### Task 5: Full Verification and Delivery

**Files:**
- Modify only if required by verified failures in Task 1-4.

- [ ] **Step 1: Run focused tests**

```bash
node --test tests/forge-eligibility.test.mjs tests/forge-eligibility-report.test.mjs tests/forge-trigger.test.mjs
```

Expected: all pass.

- [ ] **Step 2: Run repository validation**

```bash
npm run framework:doctor
node --test tests/*.test.mjs
npm test
git diff --check
```

Expected: all pass with no test failures or diff errors.

- [ ] **Step 3: Verify repository and scheduler safety**

Confirm the worktree contains only intended changes, the original checkout's unrelated files remain untouched, no live issue was mutated by tests, and `EverythingAI Forge Trigger` remains disabled.

- [ ] **Step 4: Review the complete diff**

Check every changed line against the PM requirements and confirm the implementation does not retain a runnable maintenance bypass.

- [ ] **Step 5: Push the branch**

```bash
git push -u origin codex/forge-eligibility-engine
```

Report the pushed commit, exact validation results, remaining operational boundary, and the fact that the scheduler remains disabled pending controlled live acceptance.
