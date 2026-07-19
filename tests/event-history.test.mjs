import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendEvent, createEvent, readHistory, redactPayload, validateEvent } from '../src/event-history.js';

function fixture(type = 'start', extra = {}) {
  return createEvent({ type, issueNumber: 66, taskId: 'EAI-TASK-043', correlationId: 'corr-test', timestamp: '2026-07-19T00:00:00.000Z', ...extra });
}

test('creates and validates the versioned lifecycle schema', () => {
  const event = fixture('validation', { resultCode: 'PASS', commitSha: 'abc123', validationSummary: 'tests pass' });
  assert.equal(event.schemaVersion, 1);
  assert.equal(validateEvent(event), true);
  assert.throws(() => validateEvent({ ...event, type: 'unknown' }), /invalid event type/);
});

test('redacts sensitive keys and bounds nested payloads', () => {
  const payload = redactPayload({ token: 'do-not-store', nested: { apiKey: 'also-secret', safe: 'ok' } });
  assert.deepEqual(payload, { token: '[REDACTED]', nested: { apiKey: '[REDACTED]', safe: 'ok' } });
  assert.doesNotMatch(JSON.stringify(payload), /do-not-store|also-secret/);
});

test('appends readable NDJSON and tolerates a malformed trailing line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  appendEvent(path, fixture('discovery', { payload: { safe: true } }));
  appendEvent(path, fixture('completion', { resultCode: 'PASS' }));
  writeFileSync(path, `${readFileSync(path, 'utf8')}{{partial`, 'utf8');
  assert.equal(readHistory(path).length, 2);
});

test('rotates bounded history and retains configured rotated files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  for (let i = 0; i < 4; i += 1) appendEvent(path, fixture('retry', { correlationId: `corr-${i}`, payload: { n: i } }), { maxBytes: 1, retainFiles: 2 });
  const files = readdirSync(dir).filter((name) => name.endsWith('.ndjson'));
  assert.ok(files.length <= 3);
  assert.ok(readHistory(path).length >= 1);
});

test('rejects oversized event payloads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  assert.throws(() => appendEvent(join(dir, 'events.ndjson'), fixture('block', { payload: { detail: 'x'.repeat(100) } }), { maxPayloadBytes: 50 }), /exceeds max payload/);
});
