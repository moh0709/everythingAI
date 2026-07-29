import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { isDirectRun, planLabelMutation } from '../scripts/forge-trigger.mjs';

test('Windows script paths are recognized as direct Forge trigger execution', () => {
  const scriptPath = 'C:\\temp\\EverythingAI\\scripts\\forge-trigger.mjs';
  assert.equal(isDirectRun(pathToFileURL(scriptPath).href, scriptPath), true);
});

test('blocked execution label plan removes active ownership and requests PM review', () => {
  const plan = planLabelMutation(
    ['pm:ready', 'forge:working', 'priority:critical'],
    ['forge:blocked', 'pm:review', 'priority:critical']
  );
  assert.deepEqual(plan.add.sort(), ['forge:blocked', 'pm:review']);
  assert.deepEqual(plan.remove.sort(), ['forge:working', 'pm:ready']);
});
