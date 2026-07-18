import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DECISIONS,
  classifyWebhookEvent,
  discoverWebhookPayload
} from '../scripts/webhook-event-dispatcher.mjs';
import { RUNTIME_MODES } from '../src/runtime-mode.js';

function makeTempJson(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-webhook-'));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

function makeIssue({ number = 60, title = 'EAI-TASK-039', state = 'open', labels = ['pm:ready', 'hermes:ready'] } = {}) {
  return {
    number,
    title,
    state,
    labels: labels.map((name) => ({ name }))
  };
}

function makeGhRunner(issue) {
  let calls = 0;
  const runner = (args) => {
    calls += 1;
    if (args[0] === 'issue' && args[1] === 'view') {
      return JSON.stringify(issue);
    }
    throw new Error(`Unexpected gh command: ${args.join(' ')}`);
  };
  runner.getCalls = () => calls;
  return runner;
}

test('discoverWebhookPayload prefers GITHUB_EVENT_PATH over other sources', () => {
  const path = makeTempJson('event.json', '{"source":"file"}');
  const result = discoverWebhookPayload({
    env: { GITHUB_EVENT_PATH: path },
    argv: ['--mode', 'webhook', '--event-path', '/tmp/ignored.json', '--stdin-json'],
    stdinText: '{"source":"stdin"}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'GITHUB_EVENT_PATH');
  assert.equal(result.rawText, '{"source":"file"}');
});

test('discoverWebhookPayload blocks when no payload source exists', () => {
  const result = discoverWebhookPayload({ env: {}, argv: ['--mode', 'webhook'], stdinText: '' });

  assert.equal(result.ok, false);
  assert.equal(result.result, DECISIONS.BLOCKED_RUNTIME_CONTRACT);
  assert.match(result.evidence.join(' | '), /GITHUB_EVENT_PATH missing/);
});

test('classifyWebhookEvent returns INVALID_EVENT_PAYLOAD for malformed JSON', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{not-json'
  });

  assert.equal(result.ok, false);
  assert.equal(result.result, DECISIONS.INVALID_EVENT_PAYLOAD);
});

test('classifyWebhookEvent ignores non-issues events', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'push' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":60,"labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.IGNORED_EVENT);
});

test('classifyWebhookEvent ignores issue events missing readiness labels', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":60,"labels":[{"name":"pm:ready"}]}}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.IGNORED_INELIGIBLE);
});

test('classifyWebhookEvent returns EXECUTE only when live claim checks pass', async () => {
  const issue = makeIssue();
  const ghRunner = makeGhRunner(issue);
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":60,"title":"EAI-TASK-039","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    ghRunner,
    stateReader: () => null,
    reportExists: () => false
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.EXECUTE);
  assert.equal(result.claimDecision, 'ELIGIBLE');
  assert.equal(result.issueNumber, 60);
  assert.equal(result.nextAction, 'claim-and-execute');
  assert.match(result.evidence.join(' | '), /no local state file present/);
  assert.equal(ghRunner.getCalls(), 1);
});

test('classifyWebhookEvent returns claim conflict when live state is in progress', async () => {
  const issue = makeIssue();
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":60,"title":"EAI-TASK-039","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    ghRunner: makeGhRunner(issue),
    stateReader: () => ({ currentIssue: 60, result: 'IN_PROGRESS' }),
    reportExists: () => false
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.CLAIM_CONFLICT);
  assert.equal(result.claimDecision, 'CLAIM_CONFLICT');
  assert.match(result.evidence.join(' | '), /state=currentIssue:60/);
});

test('classifyWebhookEvent treats repeated delivery as non-executable after the first claim', async () => {
  const issue = makeIssue();
  const state = { currentIssue: null, result: null };
  const first = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":60,"title":"EAI-TASK-039","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    ghRunner: makeGhRunner(issue),
    stateReader: () => (state.currentIssue ? state : null),
    reportExists: () => false
  });

  state.currentIssue = 60;
  state.result = 'IN_PROGRESS';

  const second = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":60,"title":"EAI-TASK-039","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    ghRunner: makeGhRunner(issue),
    stateReader: () => (state.currentIssue ? state : null),
    reportExists: () => false
  });

  assert.equal(first.result, DECISIONS.EXECUTE);
  assert.equal(second.result, DECISIONS.CLAIM_CONFLICT);
  assert.equal(second.claimDecision, 'CLAIM_CONFLICT');
});

test('unknown runtime mode causes no payload inspection or GitHub lookup', async () => {
  let payloadReads = 0;
  let issueLookups = 0;
  const result = await classifyWebhookEvent({
    env: {},
    argv: [],
    stdinText: '{"issue":{"number":60}}',
    runtimeDetector: () => ({
      mode: RUNTIME_MODES.UNKNOWN,
      source: 'none',
      evidence: ['no explicit runtime mode found'],
      remediation: 'set a mode'
    }),
    readFile: () => {
      payloadReads += 1;
      throw new Error('should not read');
    },
    ghRunner: () => {
      issueLookups += 1;
      throw new Error('should not look up issues');
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.result, DECISIONS.UNKNOWN_RUNTIME_MODE);
  assert.equal(payloadReads, 0);
  assert.equal(issueLookups, 0);
});
