import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  acquireForgeLock,
  claimForgeIssue,
  FORGE_RESULTS,
  isForgeEligible,
  recordForgeTriggerHeartbeat,
  sanitizeText
} from '../src/forge-trigger.js';

const HEAD = 'a'.repeat(40);

function issue(labels = ['pm:ready', 'forge:ready']) {
  return {
    number: 801,
    title: 'OPS-AUTO handshake',
    state: 'open',
    url: 'https://github.com/moh0709/everythingAI/issues/801',
    body: 'handshake',
    labels: labels.map((name) => ({ name }))
  };
}

test('Forge eligibility accepts only explicitly released open issues', () => {
  assert.equal(isForgeEligible(issue()), true);
  assert.equal(isForgeEligible(issue(['pm:ready'])), false);
  assert.equal(isForgeEligible(issue(['pm:ready', 'forge:ready', 'forge:working'])), false);
  assert.equal(isForgeEligible(issue(['pm:ready', 'forge:ready', 'atlas:ready'])), false);
  assert.equal(isForgeEligible({ ...issue(), state: 'closed' }), false);
  assert.equal(isForgeEligible(issue(['pm:ready', 'forge:ready', 'forge:done', 'pm:review'])), false);
  assert.equal(isForgeEligible(issue(['pm:ready', 'forge:ready', 'forge:blocked', 'pm:review'])), false);
});

test('local lock gives exactly one concurrent claimant', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-concurrency-'));
  const lockPath = join(root, 'claim.lock');
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let live = issue();
  const fetch = async () => live;
  const update = async (number, labels) => { await gate; live = { ...live, labels: labels.map((name) => ({ name })) }; };
  const options = {
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: update,
    postComment: async () => ({ ok: true }),
    lockPath,
    repoRoot: root,
    projectState: 'state',
    bootstrap: 'bootstrap',
    startingSha: HEAD,
    host: 'host'
  };
  const first = claimForgeIssue({ ...options, pid: 1001 });
  await new Promise((resolve) => setImmediate(resolve));
  const second = await claimForgeIssue({ ...options, pid: 1002 });
  release();
  const firstResult = await first;

  assert.equal(second.result, FORGE_RESULTS.CLAIM_CONFLICT);
  assert.equal(firstResult.result, FORGE_RESULTS.HUMAN_START_REQUIRED);
});

test('stale live labels reject mutation after discovery', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-stale-'));
  let reads = 0;
  const fetch = async () => {
    reads += 1;
    return issue(reads === 1 ? ['pm:ready', 'forge:ready'] : ['pm:ready', 'forge:working']);
  };
  let updates = 0;
  const result = await claimForgeIssue({
    issue: issue(),
    fetchLiveIssue: fetch,
    updateLabels: async () => { updates += 1; },
    postComment: async () => ({ ok: true }),
    lockPath: join(root, 'claim.lock'),
    repoRoot: root
  });

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

  const recovered = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: fetch,
    updateLabels: async () => { throw new Error('must not relabel'); },
    postComment: async () => { comments += 1; return { ok: true }; },
    lockPath,
    statePath,
    repoRoot: root
  });
  assert.equal(recovered.result, FORGE_RESULTS.CLAIMED);
  assert.equal(comments, 1);
  assert.equal(JSON.parse(readFileSync(statePath, 'utf8')).claimCommentPosted, true);
});

test('default Forge state path follows the supplied repo root', async () => {
  const originalCwd = process.cwd();
  const cwdRoot = mkdtempSync(join(tmpdir(), 'forge-cwd-'));
  const repoRoot = mkdtempSync(join(tmpdir(), 'forge-repo-root-'));
  let live = issue();
  process.chdir(cwdRoot);
  try {
    const result = await claimForgeIssue({
      issue: live,
      fetchLiveIssue: async () => live,
      updateLabels: async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; },
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
  let live = issue();
  let execution;
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: async () => live,
    updateLabels: async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; },
    postComment: async () => ({ ok: true }),
    lockPath: join(root, 'claim.lock'),
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

test('worker launch failure transitions the claimed issue to blocked PM review', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-autonomous-blocked-'));
  let live = issue();
  const comments = [];
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: async () => live,
    updateLabels: async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; },
    postComment: async (target, body) => { comments.push(body); return { ok: true }; },
    lockPath: join(root, 'claim.lock'),
    repoRoot: root,
    execute: async () => ({ ok: false, result: 'START_FAILURE', evidence: ['Codex process could not start'] })
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_BLOCKED);
  assert.deepEqual(live.labels.map(({ name }) => name).sort(), ['forge:blocked', 'pm:review']);
  assert.equal(comments.length, 2);
});

test('zero-exit worker without verified review labels is treated as blocked', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-unverified-success-'));
  let live = issue();
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: async () => live,
    updateLabels: async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; },
    postComment: async () => ({ ok: true }),
    lockPath: join(root, 'claim.lock'),
    repoRoot: root,
    execute: async () => ({ ok: true, result: 'COMPLETED', evidence: ['worker exited zero'] })
  });
  assert.equal(result.result, FORGE_RESULTS.AUTONOMOUS_BLOCKED);
  assert.deepEqual(live.labels.map(({ name }) => name).sort(), ['forge:blocked', 'pm:review']);
});

test('stale timeout does not downgrade an already submitted Forge result', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-stale-timeout-'));
  let live = issue();
  const comments = [];
  const result = await claimForgeIssue({
    issue: live,
    fetchLiveIssue: async () => live,
    updateLabels: async (number, labels) => { live = { ...live, labels: labels.map((name) => ({ name })) }; },
    postComment: async (target, body) => { comments.push(body); return { ok: true }; },
    lockPath: join(root, 'claim.lock'),
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
  assert.equal(acquireForgeLock({ lockPath: cross, issueNumber: 801, host: 'other-host', pid: 10 }).ok, true);
  const blocked = acquireForgeLock({ lockPath: cross, issueNumber: 801, host: 'this-host', pid: 11, now: () => new Date('2026-07-29T01:00:00Z') });
  assert.equal(blocked.result, FORGE_RESULTS.CLAIM_CONFLICT);

  const stale = join(root, 'stale.lock');
  assert.equal(acquireForgeLock({ lockPath: stale, issueNumber: 801, host: 'this-host', pid: 10, now: () => new Date('2026-07-29T00:00:00Z') }).ok, true);
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
