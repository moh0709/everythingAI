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

test('poller falls through to maintenance backlog when released Forge queue is empty', async () => {
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
  const result = await pollForgeOnce({
    list: async () => [],
    listMaintenance: async () => [live],
    fetch: async () => live,
    update: async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; },
    comment: async () => ({ ok: true }),
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
  assert.deepEqual(live.labels.map(({ name }) => name).sort(), ['forge:done', 'pm:review']);
});

test('live maintenance issue reads include timestamps required for stale eligibility', async () => {
  const source = readFileSync(new URL('../scripts/forge-trigger.mjs', import.meta.url), 'utf8');
  assert.match(source, /issue', 'view'.*updatedAt,createdAt/s);
});
