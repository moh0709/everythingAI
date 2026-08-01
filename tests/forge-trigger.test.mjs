import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acquireForgeLock,
  classifyForgeMaintenanceIssue,
  claimForgeIssue,
  claimForgeMaintenanceIssue,
  FORGE_RESULTS,
  isForgeEligible,
  markForgeMaintenanceProcessed,
  recordForgeTriggerHeartbeat,
  sanitizeText,
  selectForgeMaintenanceIssue
} from '../src/forge-trigger.js';
import { pollForgeOnce } from '../scripts/forge-trigger.mjs';

function issue(labels = ['pm:ready', 'forge:ready']) {
  return { number: 801, title: 'OPS-AUTO handshake', state: 'open', url: 'https://github.com/moh0709/everythingAI/issues/801', body: 'handshake', labels: labels.map((name) => ({ name })) };
}

test('Forge eligibility accepts only open pm:ready + forge:ready issues', () => {
  assert.equal(isForgeEligible(issue()), true);
  assert.equal(isForgeEligible(issue(['pm:ready'])), false);
  assert.equal(isForgeEligible(issue(['pm:ready', 'forge:ready', 'forge:working'])), false);
  assert.equal(isForgeEligible(issue(['pm:ready', 'forge:ready', 'atlas:ready'])), false);
  assert.equal(isForgeEligible({ ...issue(), state: 'closed' }), false);
});

test('local lock gives exactly one concurrent claimant', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-concurrency-'));
  const lockPath = join(root, 'claim.lock');
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let live = issue();
  const fetch = async () => live;
  const update = async (number, labels) => { await gate; live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const comment = async () => ({ ok: true });
  const first = claimForgeIssue({ issue: live, fetchLiveIssue: fetch, updateLabels: update, postComment: comment, lockPath, repoRoot: root, projectState: 'state', bootstrap: 'bootstrap', startingSha: 'a'.repeat(40), pid: 1001, host: 'host' });
  await new Promise((resolve) => setImmediate(resolve));
  const second = await claimForgeIssue({ issue: live, fetchLiveIssue: fetch, updateLabels: update, postComment: comment, lockPath, repoRoot: root, projectState: 'state', bootstrap: 'bootstrap', startingSha: 'a'.repeat(40), pid: 1002, host: 'host' });
  release();
  const firstResult = await first;
  assert.equal(second.result, FORGE_RESULTS.CLAIM_CONFLICT);
  assert.equal(firstResult.result, FORGE_RESULTS.HUMAN_START_REQUIRED);
});

test('stale live labels reject mutation after discovery', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-stale-'));
  const lockPath = join(root, 'claim.lock');
  let reads = 0;
  const fetch = async () => { reads += 1; return issue(reads === 1 ? ['pm:ready', 'forge:ready'] : ['pm:ready', 'forge:working']); };
  let updates = 0;
  const result = await claimForgeIssue({ issue: issue(), fetchLiveIssue: fetch, updateLabels: async () => { updates += 1; }, postComment: async () => ({ ok: true }), lockPath, repoRoot: root });
  assert.equal(result.result, FORGE_RESULTS.CLAIM_CONFLICT);
  assert.equal(updates, 0);
});

test('comment failure is persisted and recovered without relabeling', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-recovery-'));
  const lockPath = join(root, 'claim.lock');
  const statePath = join(root, 'state.json');
  let live = issue();
  let comments = 0;
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const failed = await claimForgeIssue({ issue: live, fetchLiveIssue: fetch, updateLabels: update, postComment: async () => ({ ok: false }), lockPath, statePath, repoRoot: root });
  assert.equal(failed.result, FORGE_RESULTS.REPORTING_REQUIRED);
  const recovered = await claimForgeIssue({ issue: live, fetchLiveIssue: fetch, updateLabels: async () => { throw new Error('must not relabel'); }, postComment: async () => { comments += 1; return { ok: true }; }, lockPath, statePath, repoRoot: root });
  assert.equal(recovered.result, FORGE_RESULTS.CLAIMED);
  assert.equal(comments, 1);
  assert.equal(JSON.parse(readFileSync(statePath, 'utf8')).claimCommentPosted, true);
});

test('default Forge state path follows the supplied repo root', async () => {
  const originalCwd = process.cwd();
  const cwdRoot = mkdtempSync(join(tmpdir(), 'forge-cwd-'));
  const repoRoot = mkdtempSync(join(tmpdir(), 'forge-repo-root-'));
  let live = issue();
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  process.chdir(cwdRoot);
  try {
    const result = await claimForgeIssue({
      issue: live,
      fetchLiveIssue: fetch,
      updateLabels: update,
      postComment: async () => ({ ok: false }),
      lockPath: join(repoRoot, 'claim.lock'),
      repoRoot
    });
    assert.equal(result.result, FORGE_RESULTS.REPORTING_REQUIRED);
    assert.equal(existsSync(join(repoRoot, '.hermes', 'forge', 'state.json')), true);
    assert.equal(existsSync(join(cwdRoot, '.hermes', 'forge', 'state.json')), false);
  } finally {
    process.chdir(originalCwd);
  }
});

test('claimed issue is handed to the autonomous executor when configured', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-autonomous-'));
  const lockPath = join(root, 'claim.lock');
  let live = issue();
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  let execution;
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: update,
    postComment: async () => ({ ok: true }),
    lockPath,
    repoRoot: root,
    execute: async (args) => {
      execution = args;
      live = { ...live, labels: [{ name: 'forge:done' }, { name: 'pm:review' }] };
      return { ok: true, result: 'COMPLETED' };
    }
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.equal(execution.issue.number, 801);
  assert.match(execution.contextPath, /context-801\.json$/);
});

test('maintenance selection skips controller and PM-review handoff states', () => {
  const issues = [
    {
      number: 96,
      title: 'Forge maintenance controller',
      state: 'open',
      labels: [],
      updatedAt: '2026-07-20T12:00:00Z'
    },
    {
      number: 97,
      title: 'Forge blocked review',
      state: 'open',
      labels: [{ name: 'forge:blocked' }, { name: 'pm:review' }],
      updatedAt: '2026-07-30T12:00:00Z'
    },
    {
      number: 95,
      title: 'Forge done review',
      state: 'open',
      labels: [{ name: 'forge:done' }, { name: 'pm:review' }],
      updatedAt: '2026-07-31T12:00:00Z'
    },
    {
      number: 69,
      title: 'Protected reliability drill',
      state: 'open',
      labels: [],
      updatedAt: '2026-07-01T12:00:00Z'
    },
    {
      number: 82,
      title: 'already owned maintenance issue',
      state: 'open',
      labels: [{ name: 'forge:working' }],
      updatedAt: '2026-07-19T12:00:00Z'
    },
    {
      number: 78,
      title: 'OPS-FIX: Make Atlas poller claim transition atomic and idempotent',
      state: 'open',
      labels: [],
      updatedAt: '2026-07-24T12:07:15Z'
    }
  ];
  const selected = selectForgeMaintenanceIssue(issues, { now: () => new Date('2026-08-01T12:00:00Z') });
  assert.equal(selected.issue.number, 78);
  assert.equal(selected.priority, 'stale_open_issue');
  assert.deepEqual(
    issues.map((candidate) => classifyForgeMaintenanceIssue(candidate, { now: () => new Date('2026-08-01T12:00:00Z') })?.skipReason ?? null),
    ['self_controller', 'awaiting_pm_review', 'awaiting_pm_review', 'dependency_blocked', 'active_owner', null]
  );
});

test('maintenance poller default controller exclusion skips issue 96 and selects next older eligible issue', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-controller-'));
  const issues = [
    {
      number: 96,
      title: 'Forge maintenance controller',
      state: 'open',
      url: 'https://github.com/moh0709/everythingAI/issues/96',
      body: 'maintenance controller',
      labels: [],
      updatedAt: '2026-07-20T12:00:00Z'
    },
    {
      number: 78,
      title: 'OPS-FIX: Make Atlas poller claim transition atomic and idempotent',
      state: 'open',
      url: 'https://github.com/moh0709/everythingAI/issues/78',
      body: 'maintenance backlog',
      labels: [],
      updatedAt: '2026-07-24T12:07:15Z'
    }
  ];
  let claimed;
  const update = async (number, labels) => {
    claimed = number;
    const target = issues.find((candidate) => candidate.number === number);
    target.labels = labels.map((name) => ({ name }));
  };
  const result = await pollForgeOnce({
    list: async () => [],
    listMaintenance: async () => issues,
    fetch: async (number) => issues.find((candidate) => candidate.number === number),
    update,
    comment: async () => ({ ok: true }),
    reporter: async () => ({ sent: false }),
    repoRoot: root,
    sha: 'a'.repeat(40),
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-01T12:00:00Z'),
    execute: async ({ issue: target }) => {
      await update(target.number, ['forge:done', 'pm:review']);
      return { ok: true, result: 'COMPLETED' };
    }
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.equal(claimed, 78);
  assert.match(result.evidence.join('\n'), /maintenance_skip_reasons=self_controller/);
});

test('maintenance poller records processed issue and advances on repeated ticks', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-cycle-'));
  const issues = [
    {
      number: 80,
      title: 'older maintenance issue',
      state: 'open',
      url: 'https://github.com/moh0709/everythingAI/issues/80',
      body: 'maintenance backlog',
      labels: [],
      updatedAt: '2026-07-20T12:00:00Z'
    },
    {
      number: 81,
      title: 'next maintenance issue',
      state: 'open',
      url: 'https://github.com/moh0709/everythingAI/issues/81',
      body: 'maintenance backlog',
      labels: [],
      updatedAt: '2026-07-21T12:00:00Z'
    }
  ];
  const comments = [];
  const executions = [];
  const update = async (number, labels) => {
    const target = issues.find((candidate) => candidate.number === number);
    target.labels = labels.map((name) => ({ name }));
  };
  const first = await pollForgeOnce({
    list: async () => [],
    listMaintenance: async () => issues,
    fetch: async (number) => issues.find((candidate) => candidate.number === number),
    update,
    comment: async (target, body) => { comments.push({ number: target.number, body }); return { ok: true }; },
    reporter: async () => ({ sent: false }),
    repoRoot: root,
    sha: 'a'.repeat(40),
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-01T12:00:00Z'),
    execute: async ({ issue: target }) => {
      executions.push(target.number);
      await update(target.number, ['forge:done', 'pm:review']);
      return { ok: true, result: 'COMPLETED' };
    }
  });
  const second = await pollForgeOnce({
    list: async () => [],
    listMaintenance: async () => issues,
    fetch: async (number) => issues.find((candidate) => candidate.number === number),
    update,
    comment: async (target, body) => { comments.push({ number: target.number, body }); return { ok: true }; },
    reporter: async () => ({ sent: false }),
    repoRoot: root,
    sha: 'a'.repeat(40),
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-01T12:01:00Z'),
    execute: async ({ issue: target }) => {
      executions.push(target.number);
      await update(target.number, ['forge:done', 'pm:review']);
      return { ok: true, result: 'COMPLETED' };
    }
  });
  assert.equal(first.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.equal(second.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.deepEqual(executions, [80, 81]);
  assert.deepEqual(comments.map(({ number }) => number), [80, 81]);
});

test('maintenance restart cooldown prevents duplicate claim comments and execution commits', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-restart-'));
  const statePath = join(root, 'maintenance-state.json');
  markForgeMaintenanceProcessed({
    statePath,
    issueNumber: 80,
    cycleId: '2026-08-01',
    result: 'SUBMITTED_FOR_PM_REVIEW',
    now: () => new Date('2026-08-01T12:00:00Z')
  });
  const staleIssue = {
    number: 80,
    title: 'already submitted maintenance issue',
    state: 'open',
    labels: [],
    updatedAt: '2026-07-20T12:00:00Z'
  };
  let comments = 0;
  let executions = 0;
  const result = await claimForgeMaintenanceIssue({
    issue: staleIssue,
    fetchLiveIssue: async () => staleIssue,
    updateLabels: async () => { throw new Error('must not relabel processed issue'); },
    postComment: async () => { comments += 1; return { ok: true }; },
    lockPath: join(root, 'claim.lock'),
    statePath,
    repoRoot: root,
    startingSha: 'a'.repeat(40),
    now: () => new Date('2026-08-01T12:05:00Z'),
    execute: async () => { executions += 1; return { ok: true, result: 'COMPLETED' }; }
  });
  assert.equal(result.result, FORGE_RESULTS.IGNORED_INELIGIBLE);
  assert.match(result.evidence.join('\n'), /already_processed/);
  assert.equal(comments, 0);
  assert.equal(executions, 0);
});

test('maintenance classification skips the currently executing issue even without owner labels', () => {
  const candidate = {
    number: 97,
    title: 'EAI-TASK-050: Prevent duplicate Forge claims',
    state: 'open',
    labels: [],
    updatedAt: '2026-07-20T12:00:00Z'
  };
  const classified = classifyForgeMaintenanceIssue(candidate, {
    currentExecutingIssueNumber: 97,
    now: () => new Date('2026-08-01T12:00:00Z')
  });
  assert.equal(classified.skipReason, 'currently_executing');
});

test('maintenance classification skips previously processed issue when HEAD is unchanged', () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-head-'));
  const statePath = join(root, 'maintenance-state.json');
  markForgeMaintenanceProcessed({
    statePath,
    issueNumber: 80,
    cycleId: '2026-07-30',
    result: 'SUBMITTED_FOR_PM_REVIEW',
    headSha: 'b'.repeat(40),
    now: () => new Date('2026-07-30T12:00:00Z')
  });
  const candidate = {
    number: 80,
    title: 'stale maintenance issue',
    state: 'open',
    labels: [],
    updatedAt: '2026-07-20T12:00:00Z'
  };
  const classified = classifyForgeMaintenanceIssue(candidate, {
    statePath,
    currentHeadSha: 'b'.repeat(40),
    now: () => new Date('2026-08-01T12:00:00Z'),
    cooldownMs: 1
  });
  assert.equal(classified.skipReason, 'head_unchanged');
});

test('maintenance poller reports processed and skipped issue summary', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-summary-'));
  const issues = [
    {
      number: 96,
      title: 'Forge maintenance controller',
      state: 'open',
      url: 'https://github.com/moh0709/everythingAI/issues/96',
      body: 'maintenance controller',
      labels: [],
      updatedAt: '2026-07-20T12:00:00Z'
    },
    {
      number: 80,
      title: 'older maintenance issue',
      state: 'open',
      url: 'https://github.com/moh0709/everythingAI/issues/80',
      body: 'maintenance backlog',
      labels: [],
      updatedAt: '2026-07-20T12:00:00Z'
    }
  ];
  const update = async (number, labels) => {
    const target = issues.find((candidate) => candidate.number === number);
    target.labels = labels.map((name) => ({ name }));
  };
  const result = await pollForgeOnce({
    list: async () => [],
    listMaintenance: async () => issues,
    fetch: async (number) => issues.find((candidate) => candidate.number === number),
    update,
    comment: async () => ({ ok: true }),
    reporter: async () => ({ sent: false }),
    repoRoot: root,
    sha: 'c'.repeat(40),
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-01T12:00:00Z'),
    execute: async ({ issue: target }) => {
      await update(target.number, ['forge:done', 'pm:review']);
      return { ok: true, result: 'COMPLETED' };
    }
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.match(result.evidence.join('\n'), /maintenance_summary=processed:80 skipped:96:self_controller/);
});

test('maintenance stale label re-read aborts when PM review appears before mutation', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-stale-'));
  let reads = 0;
  const fetch = async () => {
    reads += 1;
    return {
      number: 80,
      title: 'maintenance issue',
      state: 'open',
      labels: reads < 3 ? [] : [{ name: 'forge:done' }, { name: 'pm:review' }],
      updatedAt: '2026-07-20T12:00:00Z'
    };
  };
  let updates = 0;
  const result = await claimForgeMaintenanceIssue({
    issue: await fetch(),
    fetchLiveIssue: fetch,
    updateLabels: async () => { updates += 1; },
    postComment: async () => ({ ok: true }),
    lockPath: join(root, 'claim.lock'),
    repoRoot: root,
    now: () => new Date('2026-08-01T12:00:00Z')
  });
  assert.equal(result.result, FORGE_RESULTS.CLAIM_CONFLICT);
  assert.match(result.evidence.join('\n'), /awaiting_pm_review/);
  assert.equal(updates, 0);
});

test('maintenance claim marks unowned stale issue working and preserves verified done review submission', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-maintenance-'));
  const lockPath = join(root, 'claim.lock');
  let live = {
    number: 78,
    title: 'OPS-FIX: Make Atlas poller claim transition atomic and idempotent',
    state: 'open',
    url: 'https://github.com/moh0709/everythingAI/issues/78',
    body: 'maintenance backlog',
    labels: [],
    updatedAt: '2026-07-24T12:07:15Z'
  };
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const result = await claimForgeMaintenanceIssue({
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: update,
    postComment: async () => ({ ok: true }),
    lockPath,
    repoRoot: root,
    startingSha: 'a'.repeat(40),
    projectState: 'state',
    bootstrap: 'bootstrap',
    now: () => new Date('2026-08-01T12:00:00Z'),
    execute: async () => {
      live = { ...live, labels: [{ name: 'forge:done' }, { name: 'pm:review' }] };
      return { ok: true, result: 'COMPLETED' };
    }
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.deepEqual(live.labels.map(({ name }) => name).sort(), ['forge:done', 'pm:review']);
});

test('worker launch failure transitions the claimed issue to blocked PM review', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-autonomous-blocked-'));
  const lockPath = join(root, 'claim.lock');
  let live = issue();
  const comments = [];
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: update,
    postComment: async (target, body) => { comments.push(body); return { ok: true }; },
    lockPath,
    repoRoot: root,
    execute: async () => ({ ok: false, result: 'START_FAILURE', evidence: ['Codex process could not start'] })
  });
  const labels = live.labels.map(({ name }) => name);
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_BLOCKED);
  assert.deepEqual(labels.sort(), ['forge:blocked', 'pm:review']);
  assert.equal(comments.length, 2);
  assert.match(comments[1], /START_FAILURE/);
});

test('zero-exit worker without verified review labels is treated as blocked', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-unverified-success-'));
  const lockPath = join(root, 'claim.lock');
  let live = issue();
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: update,
    postComment: async () => ({ ok: true }),
    lockPath,
    repoRoot: root,
    execute: async () => ({ ok: true, result: 'COMPLETED', evidence: ['worker exited zero'] })
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_BLOCKED);
  assert.deepEqual(live.labels.map(({ name }) => name).sort(), ['forge:blocked', 'pm:review']);
});

test('stale autonomous timeout does not downgrade already submitted Forge evidence', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-stale-timeout-'));
  const lockPath = join(root, 'claim.lock');
  let live = issue();
  const comments = [];
  const fetch = async () => live;
  const update = async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: update,
    postComment: async (target, body) => { comments.push(body); return { ok: true }; },
    lockPath,
    repoRoot: root,
    execute: async () => {
      live = { ...live, labels: [{ name: 'forge:done' }, { name: 'pm:review' }] };
      return { ok: false, result: 'TIMEOUT', evidence: ['outer execution timeout after pushed evidence'] };
    }
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_STARTED);
  assert.deepEqual(live.labels.map(({ name }) => name).sort(), ['forge:done', 'pm:review']);
  assert.equal(comments.length, 1);
});

test('cross-host and dead same-host locks are handled conservatively', () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-lock-'));
  const cross = join(root, 'cross.lock');
  const first = acquireForgeLock({ lockPath: cross, issueNumber: 801, host: 'other-host', pid: 10 });
  assert.equal(first.ok, true);
  const blocked = acquireForgeLock({ lockPath: cross, issueNumber: 801, host: 'this-host', pid: 11, now: () => new Date('2026-07-29T01:00:00Z') });
  assert.equal(blocked.result, FORGE_RESULTS.CLAIM_CONFLICT);
  const stale = join(root, 'stale.lock');
  const old = acquireForgeLock({ lockPath: stale, issueNumber: 801, host: 'this-host', pid: 10, now: () => new Date('2026-07-29T00:00:00Z') });
  assert.equal(old.ok, true);
  const recovered = acquireForgeLock({ lockPath: stale, issueNumber: 801, host: 'this-host', pid: 11, now: () => new Date('2026-07-29T01:00:00Z'), processChecker: () => false });
  assert.equal(recovered.ok, true);
});

test('sanitized reports redact tokens, bot tokens and private keys', () => {
  const output = sanitizeText('gho_abcdefghijklmnopqrstuvwxyz 8995460068:AAFfFakeTokenLongEnoughForRedaction -----BEGIN PRIVATE KEY-----secret-----END PRIVATE KEY-----');
  assert.doesNotMatch(output, /gho_|8995460068|PRIVATE KEY-----secret/);
});

test('idle polling records a durable sanitized trigger heartbeat', () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-trigger-heartbeat-'));
  const heartbeatPath = join(root, 'trigger-heartbeat.json');
  recordForgeTriggerHeartbeat({
    heartbeatPath,
    result: { ok: true, result: FORGE_RESULTS.IDLE, evidence: ['token=gho_secret_should_not_leak'] },
    now: () => new Date('2026-07-29T07:00:00.000Z')
  });
  const heartbeat = JSON.parse(readFileSync(heartbeatPath, 'utf8'));
  assert.equal(heartbeat.status, 'HEALTHY');
  assert.equal(heartbeat.result, FORGE_RESULTS.IDLE);
  assert.equal(heartbeat.lastPollAt, '2026-07-29T07:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(heartbeat), /gho_secret_should_not_leak/);
});
