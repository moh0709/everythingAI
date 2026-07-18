import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claimRunnableIssue } from '../src/task-claim.js';
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
    if (args[0] === 'issue' && args[1] === 'edit') {
      const addIndex = args.indexOf('--add-label');
      if (addIndex >= 0) {
        const label = args[addIndex + 1];
        if (label && !issue.labels.some((entry) => entry.name === label)) {
          issue.labels.push({ name: label });
        }
      }
      const removeIndex = args.indexOf('--remove-label');
      if (removeIndex >= 0) {
        const label = args[removeIndex + 1];
        issue.labels = issue.labels.filter((entry) => entry.name !== label);
      }
      return '';
    }
    if (args[0] === 'issue' && args[1] === 'comment') {
      return '';
    }
    throw new Error(`Unexpected gh command: ${args.join(' ')}`);
  };
  runner.getCalls = () => calls;
  return runner;
}

function makeWebhookClaimHarness(issue = makeIssue({ number: 999, title: 'EAI-TASK-999' })) {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-webhook-claim-'));
  const lockPath = join(dir, 'claim.lock');
  const ghRunner = makeGhRunner(issue);
  let releaseLock = null;

  const claimRunner = async (options = {}) => {
    const result = await claimRunnableIssue({
      ...options,
      issue: options.issue ?? issue,
      ghRunner,
      lockPath,
      hostname: 'test-host',
      pid: process.pid,
      stateReader: () => null,
      stateWriter: () => true,
      reportExists: () => false
    });

    if (result.ok && result.result === 'CLAIMED' && typeof result.releaseLock === 'function') {
      releaseLock = result.releaseLock;
    }

    return result;
  };

  return {
    issue,
    ghRunner,
    claimRunner,
    releaseLock: () => releaseLock?.()
  };
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

test('classifyWebhookEvent returns EXECUTE only after shared claim authority claims the issue', async () => {
  const harness = makeWebhookClaimHarness();
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.EXECUTE);
  assert.equal(result.claimDecision, 'CLAIMED');
  assert.equal(result.issueNumber, 999);
  assert.equal(result.nextAction, 'claim-and-execute');
  assert.match(result.evidence.join(' | '), /labels=pm:ready, hermes:ready/);
  assert.equal(harness.issue.labels.some((entry) => entry.name === 'hermes:working'), true);
  harness.releaseLock();
});

test('classifyWebhookEvent rejects repeated delivery after the first shared claim', async () => {
  const harness = makeWebhookClaimHarness();
  const first = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner
  });

  const second = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner
  });

  assert.equal(first.result, DECISIONS.EXECUTE);
  assert.equal(first.claimDecision, 'CLAIMED');
  assert.equal(second.result, DECISIONS.IGNORED_INELIGIBLE);
  assert.equal(second.claimDecision, 'NOT_RUNNABLE');
  harness.releaseLock();
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
