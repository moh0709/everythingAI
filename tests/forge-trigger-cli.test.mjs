import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDirectRun, planLabelMutation, pollForgeOnce } from '../scripts/forge-trigger.mjs';

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

test('poller reports and skips an unreleased maintenance backlog issue', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-cli-maintenance-'));
  let live = {
    number: 78,
    title: 'OPS-FIX: Make Atlas poller claim transition atomic and idempotent',
    state: 'open',
    labels: [],
    url: 'https://github.com/moh0709/everythingAI/issues/78',
    body: 'maintenance backlog',
    updatedAt: '2000-01-01T00:00:00Z'
  };
  let updates = 0;
  let comments = 0;
  const result = await pollForgeOnce({
    list: async () => [live],
    fetch: async () => live,
    update: async () => { updates += 1; },
    comment: async () => { comments += 1; return { ok: true }; },
    reporter: async () => ({ sent: false }),
    repoRoot: root,
    sha: 'a'.repeat(40),
    projectState: 'state',
    bootstrap: 'bootstrap',
    execute: async () => {
      live = { ...live, labels: [{ name: 'forge:done' }, { name: 'pm:review' }] };
      return { ok: true, result: 'COMPLETED' };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.result, 'IDLE');
  assert.equal(result.message, 'No eligible issues found');
  assert.equal(updates, 0);
  assert.equal(comments, 0);
  const report = JSON.parse(readFileSync(join(root, '.hermes', 'forge', 'eligibility-report.json'), 'utf8'));
  assert.equal(report.selectedIssueNumber, null);
  assert.deepEqual(report.issues[0].reasons, ['missing_pm_ready', 'missing_forge_ready']);
});

test('live issue discovery includes fields required for eligibility and ordering', async () => {
  const source = readFileSync(new URL('../scripts/forge-trigger.mjs', import.meta.url), 'utf8');
  assert.match(source, /issue', 'list'.*state,labels,url,body,updatedAt,createdAt/s);
});
