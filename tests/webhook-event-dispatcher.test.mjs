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

function makeTempJson(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-webhook-'));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

test('discoverWebhookPayload prefers GITHUB_EVENT_PATH over other sources', () => {
  const path = makeTempJson('event.json', '{"source":"file"}');
  const result = discoverWebhookPayload({
    env: { GITHUB_EVENT_PATH: path },
    argv: ['--event-path', '/tmp/ignored.json', '--stdin-json'],
    stdinText: '{"source":"stdin"}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'GITHUB_EVENT_PATH');
  assert.equal(result.rawText, '{"source":"file"}');
});

test('discoverWebhookPayload blocks when no payload source exists', () => {
  const result = discoverWebhookPayload({ env: {}, argv: [], stdinText: '' });

  assert.equal(result.ok, false);
  assert.equal(result.result, DECISIONS.BLOCKED_RUNTIME_CONTRACT);
  assert.match(result.evidence.join(' | '), /GITHUB_EVENT_PATH missing/);
});

test('classifyWebhookEvent returns INVALID_EVENT_PAYLOAD for malformed JSON', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--stdin-json'],
    stdinText: '{not-json'
  });

  assert.equal(result.ok, false);
  assert.equal(result.result, DECISIONS.INVALID_EVENT_PAYLOAD);
});

test('classifyWebhookEvent ignores non-issues events', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'push' },
    argv: ['--stdin-json'],
    stdinText: '{"issue":{"number":60,"labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.IGNORED_EVENT);
});

test('classifyWebhookEvent ignores issue events missing readiness labels', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--stdin-json'],
    stdinText: '{"issue":{"number":60,"labels":[{"name":"pm:ready"}]}}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.IGNORED_INELIGIBLE);
});

test('classifyWebhookEvent executes only after live queue revalidation', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--stdin-json'],
    stdinText: '{"issue":{"number":60,"title":"EAI-TASK-038","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    issueLister: async () => [{ number: 60, title: 'EAI-TASK-038: Correct Hermes trigger contract and complete Operating Manual RC1', labels: [{ name: 'pm:ready' }, { name: 'hermes:ready' }] }],
    reportExists: () => false,
    stateReader: () => ({ currentIssue: 60, result: 'IN_PROGRESS' })
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.EXECUTE);
  assert.equal(result.issueNumber, 60);
  assert.equal(result.nextAction, 'claim-and-execute');
});

test('classifyWebhookEvent reports claim conflict when live revalidation fails', async () => {
  const result = await classifyWebhookEvent({
    env: { GITHUB_EVENT_NAME: 'issues' },
    argv: ['--stdin-json'],
    stdinText: '{"issue":{"number":60,"title":"EAI-TASK-038","labels":[{"name":"pm:ready"},{"name":"hermes:ready"}]}}',
    issueLister: async () => [],
    reportExists: () => false,
    stateReader: () => ({ currentIssue: 60, result: 'IN_PROGRESS' })
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, DECISIONS.CLAIM_CONFLICT);
  assert.match(result.evidence.join(' | '), /state=currentIssue:60/);
});
