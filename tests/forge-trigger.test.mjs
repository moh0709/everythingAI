import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireForgeLock, claimForgeIssue, FORGE_RESULTS, isForgeEligible, recordForgeTriggerHeartbeat, sanitizeText } from '../src/forge-trigger.js';

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
