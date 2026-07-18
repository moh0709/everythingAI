import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcile, RECONCILE_OUTCOMES } from '../src/crash-recovery.js';

// ---------------------------------------------------------------------------
// Helper: create a temp directory simulating a repo root
// ---------------------------------------------------------------------------

function tempRepo() {
  const base = mkdtempSync(join(tmpdir(), 'crash-recovery-test-'));
  const hermesDir = join(base, '.hermes');
  const runtimeDir = join(base, '.hermes', 'runtime');
  const reportsDir = join(base, 'REPORTS');
  const recoveryDir = join(base, '.hermes', 'recovery');
  mkdirSync(hermesDir, { recursive: true });
  mkdirSync(runtimeDir, { recursive: true });
  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(recoveryDir, { recursive: true });
  return {
    base,
    hermesDir,
    runtimeDir,
    reportsDir,
    recoveryDir,
    heartbeatPath: join(runtimeDir, 'heartbeat.json'),
    claimLockPath: join(hermesDir, 'claim.lock'),
    supervisorLockPath: join(hermesDir, 'supervisor.lock'),
    statePath: join(hermesDir, 'state.json')
  };
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function makeGhIssue({ number = 64, title = 'EAI-TASK-041', state = 'OPEN', labels = [] } = {}) {
  return {
    number,
    title,
    state,
    labels: labels.map((name) => ({ name }))
  };
}

/**
 * Create a gh harness that returns a controllable issue for view calls.
 * Supports issue edit (label manipulation) for testing.
 *
 * Supports a labelVerificationMode for testing post-edit verification:
 * - 'faithful' (default): labels actually change after edit
 * - 'stale': labels don't change after edit (simulates edit failure)
 * - 'incomplete': only some labels get set (simulates partial success)
 */
function makeGhHarness(initialIssue, { labelVerificationMode = 'faithful' } = {}) {
  const issue = { ...initialIssue, labels: [...initialIssue.labels.map((l) => ({ ...l }))] };
  const edits = [];
  const views = [];
  const runner = (args) => {
    if (args[0] === 'issue' && args[1] === 'view') {
      views.push(args);
      return JSON.stringify(issue);
    }
    if (args[0] === 'issue' && args[1] === 'edit') {
      edits.push(args);
      const addIndex = args.indexOf('--add-label');
      const removeIndex = args.indexOf('--remove-label');

      if (labelVerificationMode === 'faithful') {
        if (addIndex >= 0 && args[addIndex + 1]) {
          const labelsToAdd = args[addIndex + 1].split(',');
          for (const label of labelsToAdd) {
            if (!issue.labels.some((l) => l.name === label)) {
              issue.labels.push({ name: label });
            }
          }
        }
        if (removeIndex >= 0 && args[removeIndex + 1]) {
          const labelsToRemove = args[removeIndex + 1].split(',');
          issue.labels = issue.labels.filter((l) => !labelsToRemove.includes(l.name));
        }
      } else if (labelVerificationMode === 'stale') {
        // Don't change labels at all — simulates edit not taking effect
        // Issue remains unchanged
      } else if (labelVerificationMode === 'incomplete') {
        // Only add labels but don't remove
        if (addIndex >= 0 && args[addIndex + 1]) {
          const labelsToAdd = args[addIndex + 1].split(',');
          for (const label of labelsToAdd) {
            if (!issue.labels.some((l) => l.name === label)) {
              issue.labels.push({ name: label });
            }
          }
        }
        // Don't remove anything
      }
      return '';
    }
    throw new Error(`Unexpected gh command: ${args.join(' ')}`);
  };
  return { issue, runner, edits, views };
}

// ---------------------------------------------------------------------------
// SCENARIO 1: No state present → NO_ACTION (all clean)
// ---------------------------------------------------------------------------

test('all clean — no heartbeat, no lock, no state → NO_ACTION', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  assert.equal(result.outcomeCode, 'ALL_CLEAN');
});

// ---------------------------------------------------------------------------
// SCENARIO 2: Active heartbeat (process alive on same host) → NO_ACTION
// ---------------------------------------------------------------------------

test('active heartbeat with alive PID on same host → NO_ACTION', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: process.pid,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T19:59:30.000Z',
    lastResult: 'CLAIMED',
    mode: 'POLLING'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: process.pid
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  assert.equal(result.outcomeCode, 'PROCESS_ALIVE');
});

// ---------------------------------------------------------------------------
// SCENARIO 3: Active claim lock (owner PID alive on same host) → NO_ACTION
// ---------------------------------------------------------------------------

test('active claim lock with alive PID on same host → NO_ACTION', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: process.pid,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T19:59:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: process.pid
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  assert.equal(result.outcomeCode, 'CLAIM_OWNER_ALIVE');
});

// ---------------------------------------------------------------------------
// SCENARIO 4: Intentional shutdown (SHUTDOWN heartbeat, clean state) → NO_ACTION
// ---------------------------------------------------------------------------

test('intentional shutdown heartbeat with clean state → NO_ACTION', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T19:55:00.000Z',
    lastResult: 'SHUTDOWN',
    mode: 'POLLING'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  assert.equal(result.outcomeCode, 'INTENTIONAL_SHUTDOWN');
  // Heartbeat should be cleaned up
  assert.ok(!existsSync(repo.heartbeatPath));
});

// ---------------------------------------------------------------------------
// SCENARIO 5: Stale heartbeat + stale claim lock + matching report → RECOVERED
// ---------------------------------------------------------------------------

test('stale heartbeat + stale claim lock + matching report → RECOVERED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // Write stale heartbeat from old PID
  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T18:00:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  // Write stale claim lock from old PID
  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  // Write a matching report
  writeJson(join(repo.reportsDir, 'EAI-TASK-041-CRASH-RECOVERY-RECONCILIATION.md'), {
    task: 'EAI-TASK-041',
    status: 'PASS'
  });

  // Create a gh harness showing the issue has hermes:done
  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:review', 'hermes:done'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  // Issue has hermes:done on GitHub → COMPLETED_ELSEWHERE
  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  assert.equal(result.outcomeCode, 'COMPLETED_ELSEWHERE');
  assert.ok(!existsSync(repo.claimLockPath), 'stale claim lock should be removed');
  assert.ok(!existsSync(repo.heartbeatPath), 'stale heartbeat should be removed');
  assert.ok(result.actions.length > 0);
});

// ---------------------------------------------------------------------------
// SCENARIO 6: Stale heartbeat + stale claim lock + IN_PROGRESS + no report
//              + issue still open → MANUAL_REVIEW_REQUIRED
// ---------------------------------------------------------------------------

test('stale artifacts + IN_PROGRESS + no report + open issue → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // Stale heartbeat
  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T18:00:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  // Stale claim lock
  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  // IN_PROGRESS state
  writeJson(repo.statePath, {
    repo: 'moh0709/everythingAI',
    branch: 'main',
    currentIssue: 64,
    currentTask: 'EAI-TASK-041',
    result: 'IN_PROGRESS',
    updatedAt: '2026-07-18T18:00:00.000Z'
  });

  // No matching report
  // Open issue with hermes:working
  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:ready', 'hermes:working'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'AMBIGUOUS_CRASH_NO_REPORT');
  // Artifacts should NOT be removed in ambiguous case
  assert.ok(existsSync(repo.claimLockPath), 'claim lock should be preserved');
  assert.ok(existsSync(repo.heartbeatPath), 'heartbeat should be preserved');
});

// ---------------------------------------------------------------------------
// SCENARIO 7: Stale claim lock (no heartbeat) + matching report → RECOVERED
// ---------------------------------------------------------------------------

test('stale claim lock with matching report → RECOVERED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  // Matching report
  writeJson(join(repo.reportsDir, 'EAI-TASK-041-CRASH-RECOVERY-RECONCILIATION.md'), {
    task: 'EAI-TASK-041',
    status: 'PASS'
  });

  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:review', 'hermes:done'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  assert.equal(result.outcomeCode, 'STALE_LOCK_WITH_REPORT');
  assert.ok(!existsSync(repo.claimLockPath), 'stale claim lock should be removed');
});

// ---------------------------------------------------------------------------
// SCENARIO 8: Stale claim lock + IN_PROGRESS state (no heartbeat) → MANUAL_REVIEW
// ---------------------------------------------------------------------------

test('stale claim lock with IN_PROGRESS state (no heartbeat) → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  writeJson(repo.statePath, {
    currentIssue: 64,
    currentTask: 'EAI-TASK-041',
    result: 'IN_PROGRESS'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'STALE_LOCK_IN_PROGRESS');
  // Lock should NOT be removed
  assert.ok(existsSync(repo.claimLockPath));
});

// ---------------------------------------------------------------------------
// SCENARIO 9: State IN_PROGRESS without lock or heartbeat → MANUAL_REVIEW
// ---------------------------------------------------------------------------

test('IN_PROGRESS state without claim lock or heartbeat → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.statePath, {
    currentIssue: 64,
    currentTask: 'EAI-TASK-041',
    result: 'IN_PROGRESS'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'IN_PROGRESS_ALONE');
});

// ---------------------------------------------------------------------------
// SCENARIO 10: Claim lock from different host → MANUAL_REVIEW
// ---------------------------------------------------------------------------

test('claim lock from different host → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'other-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'CROSS_HOST_LOCK');
  // Lock should NOT be removed
  assert.ok(existsSync(repo.claimLockPath));
});

// ---------------------------------------------------------------------------
// SCENARIO 11: Stale artifacts from different host are escalated
// ---------------------------------------------------------------------------

test('stale artifacts from different host are escalated for manual review', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'old-host',
    lastHeartbeat: '2026-07-18T12:00:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'old-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T12:00:00.000Z'
  });

  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:review', 'hermes:done'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  // Cross-host artifacts cannot be verified — escalation required
  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'CROSS_HOST_LOCK');
  // Artifacts should NOT be removed since they're from a different host
  assert.ok(existsSync(repo.claimLockPath));
  assert.ok(existsSync(repo.heartbeatPath));
});

// ---------------------------------------------------------------------------
// SCENARIO 12: Stale artifacts with label correction
// ---------------------------------------------------------------------------

test('recovery corrects stale hermes:working on GitHub when report exists', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // No heartbeat, stale claim lock
  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T12:00:00.000Z'
  });

  // Matching report
  writeJson(join(repo.reportsDir, 'EAI-TASK-041.md'), {
    task: 'EAI-TASK-041',
    status: 'PASS'
  });

  // Issue still shows hermes:working (stale label)
  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:ready', 'hermes:working'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  // Should have attempted label correction
  const labelEdits = harness.edits.filter((args) => args.includes('--add-label'));
  assert.ok(labelEdits.length >= 1, 'should have attempted at least one label edit');
  // Should have also verified by re-reading
  assert.ok(harness.views.length >= 2, 'should have re-read issue to verify labels');
  // The harness issue should now have pm:review and hermes:done
  const finalLabels = harness.issue.labels.map((l) => l.name);
  assert.ok(finalLabels.includes('pm:review'), 'should have added pm:review');
  assert.ok(finalLabels.includes('hermes:done'), 'should have added hermes:done');
  assert.ok(!finalLabels.includes('hermes:working'), 'should have removed hermes:working');
});

// ---------------------------------------------------------------------------
// SCENARIO 13: Recovery evidence is preserved
// ---------------------------------------------------------------------------

test('reconciliation writes recovery evidence log', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  // Evidence log should exist
  const evidencePath = join(repo.recoveryDir, 'recovery-evidence.log');
  assert.ok(existsSync(evidencePath), 'recovery evidence log should exist');
  const content = readFileSync(evidencePath, 'utf8');
  assert.ok(content.includes('ALL_CLEAN') || content.includes('all state sources clean'), 'evidence should document the outcome');
});

// ---------------------------------------------------------------------------
// SCENARIO 14: Active supervisor lock → NO_ACTION
// ---------------------------------------------------------------------------

test('active supervisor lock with alive PID → NO_ACTION', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.supervisorLockPath, {
    pid: process.pid,
    hostname: 'test-host',
    role: 'supervisor',
    createdAt: '2026-07-18T19:55:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: process.pid
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  assert.equal(result.outcomeCode, 'SUPERVISOR_ALIVE');
});

// ---------------------------------------------------------------------------
// SCENARIO 15: Stale heartbeat (no claim lock) → RECOVERED
// ---------------------------------------------------------------------------

test('stale heartbeat without claim lock → RECOVERED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T12:00:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  assert.equal(result.outcomeCode, 'STALE_HEARTBEAT_CLEANED');
  assert.ok(!existsSync(repo.heartbeatPath), 'stale heartbeat should be removed');
});

// ---------------------------------------------------------------------------
// SCENARIO 16: Stale heartbeat + IN_PROGRESS (no claim lock) → MANUAL_REVIEW
// ---------------------------------------------------------------------------

test('stale heartbeat with IN_PROGRESS state (no claim lock) → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T12:00:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  writeJson(repo.statePath, {
    currentIssue: 64,
    currentTask: 'EAI-TASK-041',
    result: 'IN_PROGRESS'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'IN_PROGRESS_WITHOUT_LOCK');
});

// ---------------------------------------------------------------------------
// SCENARIO 17: Stale claim lock (no heartbeat, no IN_PROGRESS) → RECOVERED
// ---------------------------------------------------------------------------

test('stale claim lock without IN_PROGRESS state → RECOVERED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T12:00:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  assert.equal(result.outcomeCode, 'STALE_LOCK_CLEANED');
  assert.ok(!existsSync(repo.claimLockPath));
});

// ---------------------------------------------------------------------------
// SCENARIO 18: STOPPED heartbeat (clean state) → NO_ACTION
// ---------------------------------------------------------------------------

test('STOPPED heartbeat with clean state → NO_ACTION', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T19:55:00.000Z',
    lastResult: 'STOPPED',
    mode: 'POLLING'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  assert.equal(result.outcomeCode, 'INTENTIONAL_SHUTDOWN');
});

// ---------------------------------------------------------------------------
// SCENARIO 19: Complete lifecycle — heartbeat, lock, state, and cleanup
// ---------------------------------------------------------------------------

test('crash recovery handles full stale lifecycle gracefully', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // Simulate a full stale state from a previous crash
  writeJson(repo.heartbeatPath, {
    pid: 11111,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T10:00:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  writeJson(repo.claimLockPath, {
    pid: 11111,
    hostname: 'test-host',
    issueNumber: 999,
    taskId: 'EAI-TASK-999',
    createdAt: '2026-07-18T10:00:00.000Z'
  });

  writeJson(repo.supervisorLockPath, {
    pid: 11111,
    hostname: 'test-host',
    role: 'supervisor',
    createdAt: '2026-07-18T10:00:00.000Z'
  });

  writeJson(repo.statePath, {
    currentIssue: 999,
    currentTask: 'EAI-TASK-999',
    result: 'IN_PROGRESS'
  });

  // Let's provide a harness with a completed issue
  const ghIssue = makeGhIssue({ number: 999, labels: ['pm:review', 'hermes:done'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  // Should be COMPLETED_ELSEWHERE since GitHub shows hermes:done
  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  assert.equal(result.outcomeCode, 'COMPLETED_ELSEWHERE');
  assert.ok(!existsSync(repo.claimLockPath));
  assert.ok(!existsSync(repo.heartbeatPath));
  assert.ok(!existsSync(repo.supervisorLockPath));
});

// ---------------------------------------------------------------------------
// SCENARIO 20: Hermes:working stale label correction on GitHub
// ---------------------------------------------------------------------------

test('recovery corrects hermes:working when report exists and issue still shows working', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // Stale claim lock
  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 42,
    taskId: 'EAI-TASK-042',
    createdAt: '2026-07-18T06:00:00.000Z'
  });

  // Matching report
  writeJson(join(repo.reportsDir, 'EAI-TASK-042-DUMMY.md'), { task: 'EAI-TASK-042' });

  // GitHub issue still has hermes:working
  const ghIssue = makeGhIssue({ number: 42, labels: ['pm:ready', 'hermes:working'] });
  const harness = makeGhHarness(ghIssue);

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.RECOVERED);
  // Verify label correction was attempted
  assert.ok(harness.edits.length > 0, 'should have attempted label edit');
  // Verify post-edit verification was done (at least 2 views: pre and post edit)
  assert.ok(harness.views.length >= 2, 'should have re-read issue to verify labels');
  const finalLabels = harness.issue.labels.map((l) => l.name);
  assert.ok(finalLabels.includes('pm:review'));
  assert.ok(finalLabels.includes('hermes:done'));
  assert.ok(!finalLabels.includes('hermes:working'));
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 21: Cross-host claim lock with PID that exists locally
//                  → MANUAL_REVIEW (not stale cleanup)
// ---------------------------------------------------------------------------

test('cross-host claim lock with locally-existing PID → MANUAL_REVIEW_REQUIRED not stale cleanup', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // Claim lock from different host, but the PID happens to exist on THIS host
  writeJson(repo.claimLockPath, {
    pid: process.pid,      // PID exists locally!
    hostname: 'remote-host', // But from a different host
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: process.pid,       // Test is running on the same PID
    ghRunner: undefined     // No gh runner needed — should escalate before gh check
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'CROSS_HOST_LOCK');
  // Lock must NOT be removed even though PID exists locally
  assert.ok(existsSync(repo.claimLockPath), 'cross-host lock must not be removed');
  // No actions should be taken
  assert.equal(result.actions.length, 0, 'no actions should be taken for cross-host lock');
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 22: Cross-host supervisor lock → MANUAL_REVIEW_REQUIRED
// ---------------------------------------------------------------------------

test('cross-host supervisor lock → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.supervisorLockPath, {
    pid: process.pid,
    hostname: 'remote-host',
    role: 'supervisor',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: process.pid
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'CROSS_HOST_SUPERVISOR_LOCK');
  assert.ok(existsSync(repo.supervisorLockPath), 'cross-host supervisor lock must not be removed');
  assert.equal(result.actions.length, 0);
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 23: Cross-host heartbeat → MANUAL_REVIEW_REQUIRED
// ---------------------------------------------------------------------------

test('cross-host heartbeat → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.heartbeatPath, {
    pid: process.pid,
    hostname: 'remote-host',
    lastHeartbeat: '2026-07-18T19:55:00.000Z',
    lastResult: 'WORKING',
    mode: 'POLLING'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: process.pid
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'CROSS_HOST_HEARTBEAT');
  assert.ok(existsSync(repo.heartbeatPath), 'cross-host heartbeat must not be removed');
  assert.equal(result.actions.length, 0);
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 24: Label correction verification failure → MANUAL_REVIEW
// ---------------------------------------------------------------------------

test('label correction with non-responsive edit (labels unchanged) → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T12:00:00.000Z'
  });

  // Matching report
  writeJson(join(repo.reportsDir, 'EAI-TASK-041.md'), {
    task: 'EAI-TASK-041',
    status: 'PASS'
  });

  // Issue still shows hermes:working
  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:ready', 'hermes:working'] });
  // Use 'stale' verification mode — edit succeeds but labels don't change
  const harness = makeGhHarness(ghIssue, { labelVerificationMode: 'stale' });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  // Label correction failed verification → MUST escalate
  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'LABEL_VERIFICATION_FAILED');
  // Labels should still be unchanged in the harness
  const labels = harness.issue.labels.map((l) => l.name);
  assert.ok(labels.includes('hermes:working'), 'hermes:working should still be present');
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 25: Label correction with incomplete edit (add but no remove)
// → MANUAL_REVIEW_REQUIRED
// ---------------------------------------------------------------------------

test('label correction with incomplete edit (adds labels but does not remove stale ones) → MANUAL_REVIEW_REQUIRED', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'test-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T12:00:00.000Z'
  });

  writeJson(join(repo.reportsDir, 'EAI-TASK-041.md'), {
    task: 'EAI-TASK-041',
    status: 'PASS'
  });

  const ghIssue = makeGhIssue({ number: 64, labels: ['pm:ready', 'hermes:working'] });
  // 'incomplete' mode adds labels but does NOT remove
  const harness = makeGhHarness(ghIssue, { labelVerificationMode: 'incomplete' });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999,
    ghRunner: harness.runner
  });

  // hermes:working should still be present → verification fails → escalate
  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'LABEL_VERIFICATION_FAILED');
  const labels = harness.issue.labels.map((l) => l.name);
  assert.ok(labels.includes('hermes:working'), 'hermes:working should not have been removed');
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 26: tryRemove results are only recorded when actual removal happens
// ---------------------------------------------------------------------------

test('tryRemove only records action when file is actually removed', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  // Create heartbeat but ensure claim lock file does NOT exist
  writeJson(repo.heartbeatPath, {
    pid: 12345,
    hostname: 'test-host',
    lastHeartbeat: '2026-07-18T19:55:00.000Z',
    lastResult: 'SHUTDOWN',
    mode: 'POLLING'
  });

  // No claim lock, but the INTENTIONAL_SHUTDOWN path tries to remove heartbeat
  // and we can verify that the action only appears once

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  assert.equal(result.outcome, RECONCILE_OUTCOMES.NO_ACTION);
  // Should have exactly one 'removed' action for heartbeat
  const removalActions = result.actions.filter((a) => a.startsWith('removed'));
  assert.equal(removalActions.length, 1, 'should have exactly one removal action');
  assert.ok(removalActions[0].includes('heartbeat'), 'should mention heartbeat');
  assert.ok(!existsSync(repo.heartbeatPath), 'heartbeat should be removed');
});

// ---------------------------------------------------------------------------
// NEW SCENARIO 27: Both cross-host locks present (claim + supervisor)
// → claim lock check triggers first
// ---------------------------------------------------------------------------

test('both cross-host claim lock and supervisor lock → first cross-host check triggers MANUAL_REVIEW', async () => {
  const repo = tempRepo();
  const now = () => new Date('2026-07-18T20:00:00.000Z');

  writeJson(repo.claimLockPath, {
    pid: 12345,
    hostname: 'remote-host',
    issueNumber: 64,
    taskId: 'EAI-TASK-041',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  writeJson(repo.supervisorLockPath, {
    pid: 12345,
    hostname: 'another-remote',
    role: 'supervisor',
    createdAt: '2026-07-18T18:00:00.000Z'
  });

  const result = await reconcile({
    repoRoot: repo.base,
    now,
    hostname: 'test-host',
    pid: 99999
  });

  // Claim lock check is first, so CROSS_HOST_LOCK
  assert.equal(result.outcome, RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED);
  assert.equal(result.outcomeCode, 'CROSS_HOST_LOCK');
  assert.ok(existsSync(repo.claimLockPath));
  assert.ok(existsSync(repo.supervisorLockPath));
});
