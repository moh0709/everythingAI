import test from 'node:test';
import assert from 'node:assert/strict';
import { watchLoop } from '../scripts/task-poller.mjs';

test('watchLoop continues queue watching after a claim conflict', async () => {
  let calls = 0;
  const seen = [];
  const dispatchCalls = [];

  await watchLoop({
    iterations: 2,
    pauseMs: 0,
    listIssues: async () => {
      calls += 1;
      seen.push(calls);
      if (calls === 1) {
        return [{ number: 60, title: 'EAI-TASK-038', labels: [] }];
      }
      return [];
    },
    dispatchWorker: async (issueNumber) => {
      dispatchCalls.push(issueNumber);
      return 'CLAIM_CONFLICT';
    }
  });

  assert.equal(calls, 2);
  assert.deepEqual(seen, [1, 2]);
  assert.deepEqual(dispatchCalls, [60]);
});
