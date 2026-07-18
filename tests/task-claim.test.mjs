import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claimRunnableIssue, CLAIM_RESULTS } from '../src/task-claim.js';

function makeIssue({ number = 60, title = 'EAI-TASK-039', state = 'open', labels = ['pm:ready', 'hermes:ready'] } = {}) {
  return {
    number,
    title,
    state,
    labels: labels.map((name) => ({ name }))
  };
}

function makeGhHarness({ issue = makeIssue(), onEdit = null } = {}) {
  const edits = [];
  const comments = [];
  const runner = async (args) => {
    if (args[0] === 'issue' && args[1] === 'view') {
      return JSON.stringify(issue);
    }
    if (args[0] === 'issue' && args[1] === 'edit') {
      edits.push(args);
      if (onEdit) {
        return onEdit(args, issue);
      }
      const addIndex = args.indexOf('--add-label');
      if (addIndex >= 0) {
        const label = args[addIndex + 1];
        if (label && !issue.labels.some((entry) => entry.name === label)) {
          issue.labels.push({ name: label });
        }
      }
      const removeIndex = args.indexOf('--remove-label');
      if (removeIndex >= 0) {
        const label = args[removeIndex + 1];
        issue.labels = issue.labels.filter((entry) => entry.name !== label);
      }
      return '';
    }
    if (args[0] === 'issue' && args[1] === 'comment') {
      comments.push(args);
      return '';
    }
    throw new Error(`Unexpected gh command: ${args.join(' ')}`);
  };

  return { issue, runner, edits, comments };
}

function writeLockFile(lockPath, data) {
  writeFileSync(lockPath, `${JSON.stringify(data, null, 2)}\n`);
}

test('two claimants targeting the same issue yield exactly one CLAIMED result', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-claim-'));
  const lockPath = join(dir, 'claim.lock');
  const issue = makeIssue();
  let releaseEdit;
  const editGate = new Promise((resolve) => {
    releaseEdit = resolve;
  });
  const harness = makeGhHarness({
    issue,
    onEdit: async (args) => {
      await editGate;
      const addIndex = args.indexOf('--add-label');
      if (addIndex >= 0) {
        const label = args[addIndex + 1];
        if (label && !issue.labels.some((entry) => entry.name === label)) {
          issue.labels.push({ name: label });
        }
      }
      const removeIndex = args.indexOf('--remove-label');
      if (removeIndex >= 0) {
        const label = args[removeIndex + 1];
        issue.labels = issue.labels.filter((entry) => entry.name !== label);
      }
      return '';
    }
  });

  const firstClaim = claimRunnableIssue({
    issue,
    ghRunner: harness.runner,
    lockPath,
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false,
    now: () => new Date('2026-07-18T00:00:00Z')
  });

  await new Promise((resolve) => setImmediate(resolve));

  const secondClaim = await claimRunnableIssue({
    issue,
    ghRunner: harness.runner,
    lockPath,
    hostname: 'test-host',
    pid: process.pid + 1,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false,
    now: () => new Date('2026-07-18T00:00:00Z')
  });

  releaseEdit();
  const firstResult = await firstClaim;

  assert.equal(firstResult.result, CLAIM_RESULTS.CLAIMED);
  assert.equal(secondClaim.result, CLAIM_RESULTS.CLAIM_CONFLICT);
  assert.equal(harness.comments.length, 1);
  assert.equal(harness.edits.length, 1);
  assert.match(readFileSync(lockPath, 'utf8'), /"issueNumber": 60/);
});

test('an existing in-progress state causes a claim conflict', async () => {
  const harness = makeGhHarness();
  const result = await claimRunnableIssue({
    issue: harness.issue,
    ghRunner: harness.runner,
    lockPath: join(mkdtempSync(join(tmpdir(), 'hermes-state-')), 'claim.lock'),
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => ({ currentIssue: 60, result: 'IN_PROGRESS' }),
    stateWriter: () => true,
    reportExists: () => false
  });

  assert.equal(result.result, CLAIM_RESULTS.CLAIM_CONFLICT);
});

test('an existing valid local lock causes a claim conflict', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-lock-'));
  const lockPath = join(dir, 'claim.lock');
  writeLockFile(lockPath, {
    issueNumber: 60,
    taskId: 'EAI-TASK-039',
    pid: process.pid,
    hostname: 'test-host',
    createdAt: '2026-07-18T00:00:00.000Z'
  });

  const result = await claimRunnableIssue({
    issue: makeIssue(),
    ghRunner: makeGhHarness().runner,
    lockPath,
    hostname: 'test-host',
    pid: process.pid + 2,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false
  });

  assert.equal(result.result, CLAIM_RESULTS.CLAIM_CONFLICT);
});

test('stale lock recovery is conservative and replaces a dead owner lock', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-stale-'));
  const lockPath = join(dir, 'claim.lock');
  writeLockFile(lockPath, {
    issueNumber: 60,
    taskId: 'EAI-TASK-039',
    pid: 999999,
    hostname: 'test-host',
    createdAt: '2026-07-18T00:00:00.000Z'
  });

  const result = await claimRunnableIssue({
    issue: makeIssue(),
    ghRunner: makeGhHarness().runner,
    lockPath,
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false,
    now: () => new Date('2026-07-18T01:00:00Z')
  });

  assert.equal(result.result, CLAIM_RESULTS.CLAIMED);
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  assert.equal(lock.issueNumber, 60);
  assert.equal(lock.pid, process.pid);
  assert.equal(lock.hostname, 'test-host');
});

test('losing hermes:ready between discovery and claim returns NOT_RUNNABLE', async () => {
  const harness = makeGhHarness({
    issue: makeIssue({ labels: ['pm:ready'] })
  });

  const result = await claimRunnableIssue({
    issue: makeIssue(),
    ghRunner: harness.runner,
    lockPath: join(mkdtempSync(join(tmpdir(), 'hermes-ready-')), 'claim.lock'),
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false
  });

  assert.equal(result.result, CLAIM_RESULTS.NOT_RUNNABLE);
});

test('an issue already marked hermes:working or hermes:done is not runnable', async () => {
  const workingResult = await claimRunnableIssue({
    issue: makeIssue({ labels: ['pm:ready', 'hermes:ready', 'hermes:working'] }),
    ghRunner: makeGhHarness().runner,
    lockPath: join(mkdtempSync(join(tmpdir(), 'hermes-working-')), 'claim.lock'),
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false
  });

  const doneResult = await claimRunnableIssue({
    issue: makeIssue({ labels: ['pm:ready', 'hermes:ready', 'hermes:done'] }),
    ghRunner: makeGhHarness().runner,
    lockPath: join(mkdtempSync(join(tmpdir(), 'hermes-done-')), 'claim.lock'),
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false
  });

  assert.equal(workingResult.result, CLAIM_RESULTS.NOT_RUNNABLE);
  assert.equal(doneResult.result, CLAIM_RESULTS.NOT_RUNNABLE);
});

test('a matching report short-circuits with ALREADY_COMPLETED', async () => {
  const result = await claimRunnableIssue({
    issue: makeIssue(),
    ghRunner: makeGhHarness().runner,
    lockPath: join(mkdtempSync(join(tmpdir(), 'hermes-report-')), 'claim.lock'),
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => true
  });

  assert.equal(result.result, CLAIM_RESULTS.ALREADY_COMPLETED);
});

test('failed label verification releases the local lock', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-fail-'));
  const lockPath = join(dir, 'claim.lock');
  const harness = makeGhHarness({
    onEdit: async () => ''
  });

  const result = await claimRunnableIssue({
    issue: harness.issue,
    ghRunner: harness.runner,
    lockPath,
    hostname: 'test-host',
    pid: process.pid,
    stateReader: () => null,
    stateWriter: () => true,
    reportExists: () => false
  });

  assert.equal(result.result, CLAIM_RESULTS.RUNTIME_ERROR);
  assert.equal(existsSync(lockPath), false);
});
