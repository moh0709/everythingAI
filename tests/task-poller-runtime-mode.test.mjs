import test from 'node:test';
import assert from 'node:assert/strict';
import { runPollingEntry } from '../scripts/task-poller.mjs';
import { RUNTIME_MODES } from '../src/runtime-mode.js';

test('polling entry ignores webhook environment noise and still queries the queue', async () => {
  let queueLookups = 0;
  const result = await runPollingEntry({
    env: {
      GITHUB_EVENT_PATH: '/tmp/not-used.json',
      GITHUB_EVENT_NAME: 'issues'
    },
    argv: ['--mode', 'polling'],
    listIssues: async () => {
      queueLookups += 1;
      return [{ number: 70, title: 'EAI-TASK-039A', labels: [] }];
    }
  });

  assert.equal(queueLookups, 1);
  assert.equal(result.number, 70);
});

test('polling entry succeeds when no webhook variables are present', async () => {
  let queueLookups = 0;
  const result = await runPollingEntry({
    env: {},
    argv: ['--mode', 'polling'],
    listIssues: async () => {
      queueLookups += 1;
      return [{ number: 70, title: 'EAI-TASK-039A', labels: [] }];
    }
  });

  assert.equal(queueLookups, 1);
  assert.equal(result.number, 70);
});

test('unknown polling runtime does not query GitHub', async () => {
  let queueLookups = 0;
  const result = await runPollingEntry({
    env: {},
    argv: [],
    runtimeDetector: () => ({
      mode: RUNTIME_MODES.UNKNOWN,
      source: 'none',
      evidence: ['no explicit runtime mode found'],
      remediation: 'set a mode'
    }),
    listIssues: async () => {
      queueLookups += 1;
      return [];
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.result, 'UNKNOWN_RUNTIME_MODE');
  assert.equal(queueLookups, 0);
});
