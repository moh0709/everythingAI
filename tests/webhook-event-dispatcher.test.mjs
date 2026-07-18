import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claimRunnableIssue } from '../src/task-claim.js';
import {
  DECISIONS,
  classifyWebhookEvent,
  discoverWebhookPayload,
  runWebhookEntry
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
    lockPath,
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

test('runWebhookEntry claims exactly once and executes using the claimed ownership', async () => {
  const harness = makeWebhookClaimHarness();
  let executionCalls = 0;
  let releaseCalls = 0;

  const result = await runWebhookEntry({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner,
    executionRunner: async ({ issue, claim }) => {
      executionCalls += 1;
      assert.equal(issue.number, 999);
      assert.equal(claim.result, 'CLAIMED');
      assert.equal(typeof claim.releaseLock, 'function');
      claim.releaseLock();
      releaseCalls += 1;
      return { ok: true, result: 'PASS', issueNumber: issue.number };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, 'EXECUTED');
  assert.equal(result.claimDecision, 'CLAIMED');
  assert.equal(executionCalls, 1);
  assert.equal(releaseCalls, 1);
  assert.equal(harness.issue.labels.some((entry) => entry.name === 'hermes:working'), true);
  assert.equal(harness.issue.labels.some((entry) => entry.name === 'hermes:ready'), false);
  assert.equal(result.executionResult.ok, true);
  assert.equal(result.executionResult.result, 'PASS');
});

test('concurrent identical webhook deliveries dispatch at most one worker', async () => {
  const harness = makeWebhookClaimHarness();
  let executionCalls = 0;
  let releaseExecution;
  const executionGate = new Promise((resolve) => {
    releaseExecution = resolve;
  });

  const first = runWebhookEntry({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner,
    executionRunner: async ({ claim }) => {
      executionCalls += 1;
      await executionGate;
      claim.releaseLock();
      return { ok: true, result: 'PASS' };
    }
  });

  await new Promise((resolve) => setImmediate(resolve));

  const second = await runWebhookEntry({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner,
    executionRunner: async () => {
      executionCalls += 10;
      return { ok: true, result: 'SHOULD_NOT_RUN' };
    }
  });

  releaseExecution();
  const firstResult = await first;

  assert.equal(firstResult.result, 'EXECUTED');
  assert.equal(second.result === DECISIONS.CLAIM_CONFLICT || second.result === DECISIONS.IGNORED_INELIGIBLE, true);
  assert.equal(executionCalls, 1);
  assert.equal(harness.issue.labels.some((entry) => entry.name === 'hermes:working'), true);
});

test('runWebhookEntry rejects repeated delivery after the first execution', async () => {
  const harness = makeWebhookClaimHarness();
  let executionCalls = 0;

  const first = await runWebhookEntry({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner,
    executionRunner: async ({ claim }) => {
      executionCalls += 1;
      claim.releaseLock();
      return { ok: true, result: 'PASS' };
    }
  });

  const second = await runWebhookEntry({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--mode', 'webhook', '--stdin-json'],
    stdinText: '{"issue":{"number":999,"title":"EAI-TASK-999","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    claimRunner: harness.claimRunner,
    executionRunner: async () => {
      executionCalls += 10;
      return { ok: true, result: 'SHOULD_NOT_RUN' };
    }
  });

  assert.equal(first.result, 'EXECUTED');
  assert.equal(executionCalls, 1);
  assert.equal(second.result, DECISIONS.IGNORED_INELIGIBLE);
  assert.equal(second.claimDecision, 'NOT_RUNNABLE');
  assert.equal(harness.issue.labels.some((entry) => entry.name === 'hermes:working'), true);
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
