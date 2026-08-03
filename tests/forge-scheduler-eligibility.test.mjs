import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FORGE_RESULTS } from '../src/forge-trigger.js';
import { pollForgeOnce } from '../scripts/forge-trigger.mjs';

const HEAD = 'a'.repeat(40);

function candidate(number, labels, options = {}) {
  return {
    number,
    title: options.title ?? `EAI-TASK-${number}: Candidate`,
    state: options.state ?? 'OPEN',
    labels: labels.map((name) => ({ name })),
    body: options.body ?? '',
    createdAt: options.createdAt ?? `2026-07-${String(Math.min(number, 28)).padStart(2, '0')}T00:00:00Z`,
    updatedAt: options.updatedAt ?? '2026-08-01T00:00:00Z',
    url: `https://github.com/moh0709/everythingAI/issues/${number}`
  };
}

test('scheduler reports every issue and claims only the top genuinely eligible candidate', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-scheduler-report-'));
  const issues = [
    candidate(4, ['pm:ready', 'forge:ready', 'forge:done', 'pm:review']),
    candidate(5, ['pm:ready', 'forge:ready', 'forge:blocked', 'pm:review']),
    candidate(68, [], { title: 'EAI-TASK-045: Host deployment', state: 'OPEN' }),
    candidate(69, ['pm:ready', 'forge:ready'], { title: 'EAI-TASK-046: Reliability drill', body: 'Dependency: EAI-TASK-045 accepted and closed.' }),
    candidate(96, ['pm:ready', 'forge:ready'], { title: 'EAI-TASK-049: Forge scheduler maintenance' }),
    candidate(100, ['pm:ready', 'forge:ready', 'priority:critical'])
  ];
  const comments = [];
  const updates = [];
  const result = await pollForgeOnce({
    list: async () => issues,
    fetch: async (number) => issues.find((issue) => issue.number === number),
    update: async (number, labels) => {
      updates.push({ number, labels });
      const target = issues.find((issue) => issue.number === number);
      target.labels = labels.map((name) => ({ name }));
    },
    comment: async (issue, body) => { comments.push({ number: issue.number, body }); return { ok: true }; },
    reporter: async () => ({ sent: false }),
    execute: null,
    repoRoot: root,
    sha: HEAD,
    projectState: 'state',
    bootstrap: 'bootstrap',
    controllerIssueNumber: 96,
    currentExecutingIssueNumber: 96,
    now: () => new Date('2026-08-03T12:00:00Z')
  });

  assert.equal(result.result, FORGE_RESULTS.HUMAN_START_REQUIRED);
  assert.deepEqual(updates.map(({ number }) => number), [100]);
  assert.deepEqual(comments.map(({ number }) => number), [100]);
  const report = JSON.parse(readFileSync(join(root, '.hermes', 'forge', 'eligibility-report.json'), 'utf8'));
  assert.equal(report.issues.length, issues.length);
  assert.equal(report.selectedIssueNumber, 100);
  assert.ok(report.issues.find(({ issueNumber }) => issueNumber === 4).reasons.includes('pm_review'));
  assert.ok(report.issues.find(({ issueNumber }) => issueNumber === 5).reasons.includes('forge_blocked'));
  assert.ok(report.issues.find(({ issueNumber }) => issueNumber === 69).reasons.includes('dependency_blocked'));
  assert.ok(report.issues.find(({ issueNumber }) => issueNumber === 96).reasons.includes('self_controller'));
});

test('concurrent scheduler runs produce only one discovery, claim mutation, and acknowledgement', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-scheduler-concurrent-'));
  const issues = [candidate(100, ['pm:ready', 'forge:ready'])];
  let listCalls = 0;
  let updates = 0;
  let comments = 0;
  let releaseUpdate;
  const updateGate = new Promise((resolve) => { releaseUpdate = resolve; });
  const options = {
    list: async () => { listCalls += 1; return issues; },
    fetch: async () => issues[0],
    update: async (number, labels) => {
      updates += 1;
      await updateGate;
      issues[0].labels = labels.map((name) => ({ name }));
    },
    comment: async () => { comments += 1; return { ok: true }; },
    reporter: async () => ({ sent: false }),
    execute: null,
    repoRoot: root,
    sha: HEAD,
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-03T12:00:00Z')
  };

  const first = pollForgeOnce(options);
  await new Promise((resolve) => setImmediate(resolve));
  const second = await pollForgeOnce(options);
  releaseUpdate();
  const firstResult = await first;

  assert.equal(firstResult.result, FORGE_RESULTS.HUMAN_START_REQUIRED);
  assert.equal(second.result, FORGE_RESULTS.CLAIM_CONFLICT);
  assert.ok(second.evidence.some((entry) => entry.includes('issue #0')));
  assert.equal(listCalls, 2); // initial discovery plus the winner's live revalidation
  assert.equal(updates, 1);
  assert.equal(comments, 1);
});

test('scheduler aborts claim when a dependency becomes open before mutation', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-scheduler-stale-dependency-'));
  const dependency = candidate(68, [], { title: 'EAI-TASK-045: Host deployment', state: 'CLOSED' });
  const target = candidate(69, ['pm:ready', 'forge:ready'], {
    title: 'EAI-TASK-046: Reliability drill',
    body: 'Dependency: EAI-TASK-045 accepted and closed.'
  });
  let listCalls = 0;
  let updates = 0;
  let comments = 0;
  const result = await pollForgeOnce({
    list: async () => {
      listCalls += 1;
      if (listCalls > 1) dependency.state = 'OPEN';
      return [dependency, target];
    },
    fetch: async () => target,
    update: async () => { updates += 1; },
    comment: async () => { comments += 1; return { ok: true }; },
    reporter: async () => ({ sent: false }),
    execute: null,
    repoRoot: root,
    sha: HEAD,
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-03T12:00:00Z')
  });

  assert.equal(result.result, FORGE_RESULTS.CLAIM_CONFLICT);
  assert.ok(result.evidence.some((entry) => entry.includes('dependency_blocked')));
  assert.equal(listCalls, 2);
  assert.equal(updates, 0);
  assert.equal(comments, 0);
});

test('scheduler cannot claim the same issue twice in one cycle at unchanged HEAD', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-scheduler-repeat-'));
  const target = candidate(100, ['pm:ready', 'forge:ready']);
  let comments = 0;
  let updates = 0;
  const options = {
    list: async () => [target],
    fetch: async () => target,
    update: async (number, labels) => {
      updates += 1;
      target.labels = labels.map((name) => ({ name }));
    },
    comment: async () => { comments += 1; return { ok: true }; },
    reporter: async () => ({ sent: false }),
    execute: null,
    repoRoot: root,
    sha: HEAD,
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-03T12:00:00Z')
  };

  const first = await pollForgeOnce(options);
  target.labels = [{ name: 'pm:ready' }, { name: 'forge:ready' }];
  const second = await pollForgeOnce(options);

  assert.equal(first.result, FORGE_RESULTS.HUMAN_START_REQUIRED);
  assert.equal(second.result, FORGE_RESULTS.IDLE);
  assert.equal(second.message, 'No eligible issues found');
  assert.ok(second.evidence.some((entry) => entry.includes('already_processed')));
  assert.ok(second.evidence.some((entry) => entry.includes('head_unchanged')));
  assert.equal(updates, 1);
  assert.equal(comments, 1);
});

test('scheduler fails closed when processing history is corrupt', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-scheduler-corrupt-state-'));
  const statePath = join(root, '.hermes', 'forge', 'maintenance-state.json');
  mkdirSync(join(root, '.hermes', 'forge'), { recursive: true });
  writeFileSync(statePath, '{invalid', 'utf8');
  const target = candidate(100, ['pm:ready', 'forge:ready']);
  let updates = 0;
  let comments = 0;

  const result = await pollForgeOnce({
    list: async () => [target],
    fetch: async () => target,
    update: async () => { updates += 1; },
    comment: async () => { comments += 1; return { ok: true }; },
    reporter: async () => ({ sent: false }),
    execute: null,
    repoRoot: root,
    processingStatePath: statePath,
    sha: HEAD,
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-03T12:00:00Z')
  });

  assert.equal(result.result, FORGE_RESULTS.RUNTIME_ERROR);
  assert.ok(result.evidence.some((entry) => entry.includes('processing state')));
  assert.equal(updates, 0);
  assert.equal(comments, 0);
  const report = JSON.parse(readFileSync(join(root, '.hermes', 'forge', 'eligibility-report.json'), 'utf8'));
  assert.equal(report.outcome, FORGE_RESULTS.RUNTIME_ERROR);
});
