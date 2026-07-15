import test from 'node:test';
import assert from 'node:assert/strict';
import { runTaskWorker } from '../scripts/task-worker.mjs';
import { RUNTIME_MODES } from '../src/runtime-mode.js';

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
