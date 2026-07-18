import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync } from 'node:fs';
import { runTaskWorker } from '../scripts/task-worker.mjs';
import { RUNTIME_MODES } from '../src/runtime-mode.js';

function makeIssue({ number = 60, title = 'EAI-TASK-039', state = 'open', labels = ['pm:ready', 'hermes:ready'] } = {}) {
  return {
    number,
    title,
    state,
    labels: labels.map((name) => ({ name }))
  };
}

function makeGhHarness(issue) {
  return async (args) => {
    if (args[0] === 'issue' && args[1] === 'view') {
      return JSON.stringify(issue);
    }
    if (args[0] === 'issue' && args[1] === 'edit') {
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
      return '';
    }
    throw new Error(`Unexpected gh command: ${args.join(' ')}`);
  };
}

test('unknown runtime mode causes no GitHub mutation or issue selection', async () => {
  let issueSelections = 0;
  let ghCalls = 0;
  let stateWrites = 0;
  let artifactWrites = 0;

  const result = await runTaskWorker({
    runtimeDetector: () => ({
      mode: RUNTIME_MODES.UNKNOWN,
      source: 'none',
      evidence: ['no explicit runtime mode found'],
      remediation: 'set a mode'
    }),
    issueSelector: async () => {
      issueSelections += 1;
      return null;
    },
    ghRunner: () => {
      ghCalls += 1;
      return '';
    },
    stateWriter: () => {
      stateWrites += 1;
      return true;
    },
    artifactWriter: () => {
      artifactWrites += 1;
      return { logPath: '', reportPath: '' };
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.result, 'UNKNOWN_RUNTIME_MODE');
  assert.equal(issueSelections, 0);
  assert.equal(ghCalls, 0);
  assert.equal(stateWrites, 0);
  assert.equal(artifactWrites, 0);
});

test('polling worker claims through shared authority without a ReferenceError', async () => {
  const claimLockPath = '/root/.hermes/projects/everythingAI/.hermes/claim.lock';
  if (existsSync(claimLockPath)) {
    unlinkSync(claimLockPath);
  }

  const issue = makeIssue({ number: 999, title: 'EAI-TASK-999' });
  const ghRunner = makeGhHarness(issue);
  let issueSelections = 0;
  let stateWrites = 0;
  let artifactWrites = 0;

  const result = await runTaskWorker({
    env: {},
    argv: ['--mode', 'polling'],
    issueSelector: async () => {
      issueSelections += 1;
      return issue;
    },
    ghRunner,
    stateWriter: () => {
      stateWrites += 1;
      return true;
    },
    artifactWriter: () => {
      artifactWrites += 1;
      return { logPath: '', reportPath: '' };
    }
  });

  assert.equal(result.claim.result, 'CLAIMED');
  assert.equal(issueSelections, 1);
  assert.ok(stateWrites > 0);
  assert.equal(artifactWrites, 1);
});
