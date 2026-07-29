import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isAtlasEligible,
  isForgeEligibleForQueue,
  isHermesEligibleForQueue
} from '../src/agent-queue-policy.js';

function issue({ state = 'open', labels = [], body = '' } = {}) {
  return {
    number: 900,
    title: 'Queue policy fixture',
    state,
    labels: labels.map((name) => ({ name })),
    body
  };
}

const atlasContract = [
  'Atlas Delegation Contract',
  'Parent Forge Issue: #85',
  'Starting SHA: 538e38c62a10fe5693354db356a3965799e8d443',
  'Final SHA: pending',
  'Allowed Files: scripts/atlas-cron-poller.py, tests/agent-queue-policy.test.mjs',
  'Forbidden Files: PROJECT_STATE.md, AI_BOOTSTRAP.md',
  'Validation Commands: npm test',
  'Reporting Destination: issue #85'
].join('\n');

test('Forge accepts only open pm:ready + forge:ready without competing agent labels', () => {
  assert.equal(isForgeEligibleForQueue(issue({ labels: ['pm:ready', 'forge:ready'] })), true);
  assert.equal(isForgeEligibleForQueue(issue({ labels: ['pm:ready', 'hermes:ready'] })), false);
  assert.equal(isForgeEligibleForQueue(issue({ labels: ['pm:ready', 'forge:ready', 'hermes:ready'] })), false);
  assert.equal(isForgeEligibleForQueue(issue({ labels: ['pm:ready', 'forge:ready', 'atlas:ready'] })), false);
  assert.equal(isForgeEligibleForQueue(issue({ state: 'closed', labels: ['pm:ready', 'forge:ready'] })), false);
});

test('Hermes accepts only open pm:ready + hermes:ready without competing agent labels', () => {
  assert.equal(isHermesEligibleForQueue(issue({ labels: ['pm:ready', 'hermes:ready'] })), true);
  assert.equal(isHermesEligibleForQueue(issue({ labels: ['pm:ready', 'forge:ready'] })), false);
  assert.equal(isHermesEligibleForQueue(issue({ labels: ['pm:ready', 'hermes:ready', 'forge:ready'] })), false);
  assert.equal(isHermesEligibleForQueue(issue({ labels: ['pm:ready', 'hermes:ready', 'atlas:working'] })), false);
  assert.equal(isHermesEligibleForQueue(issue({ state: 'closed', labels: ['pm:ready', 'hermes:ready'] })), false);
});

test('Atlas rejects queue items without explicit PM-approved delegation contract', () => {
  assert.equal(isAtlasEligible(issue({ labels: ['pm:ready', 'atlas:ready'], body: atlasContract })), false);
  assert.equal(isAtlasEligible(issue({ labels: ['pm:ready', 'hermes:ready'], body: atlasContract })), false);
  assert.equal(isAtlasEligible(issue({ labels: ['pm:ready', 'atlas:ready', 'pm:approved-delegation'], body: '' })), false);
});

test('Atlas accepts only explicit PM-approved delegation issues', () => {
  assert.equal(isAtlasEligible(issue({
    labels: ['pm:ready', 'atlas:ready', 'pm:approved-delegation'],
    body: atlasContract
  })), true);
});

test('Atlas cron poller is fenced to PM-approved delegation issues', () => {
  const source = readFileSync(new URL('../scripts/atlas-cron-poller.py', import.meta.url), 'utf8');
  assert.match(source, /pm:approved-delegation/);
  assert.match(source, /atlas_delegation_contract_present/);
  assert.doesNotMatch(source, /labels=pm:ready,hermes:ready/);
});
