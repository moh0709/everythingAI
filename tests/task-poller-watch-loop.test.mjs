import test from 'node:test';
import assert from 'node:assert/strict';
import { watchLoop } from '../scripts/task-poller.mjs';

test('watchLoop resumes queue watching after a poll cycle', async () => {
  let calls = 0;
  const seen = [];

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
    }
  });

  assert.equal(calls, 2);
  assert.deepEqual(seen, [1, 2]);
});
