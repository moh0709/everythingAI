import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendEvent, createEvent, HistoryCorruptionError, readHistory, redactPayload, validateEvent } from '../src/event-history.js';

function fixture(type = 'start', extra = {}) {
  return createEvent({ type, issueNumber: 66, taskId: 'EAI-TASK-043', correlationId: 'corr-test', timestamp: '2026-07-19T00:00:00.000Z', ...extra });
}

test('creates and validates the versioned lifecycle schema', () => {
  const event = fixture('validation', { resultCode: 'PASS', commitSha: 'abc123', validationSummary: 'tests pass' });
  assert.equal(event.schemaVersion, 1);
  assert.equal(validateEvent(event), true);
  assert.throws(() => validateEvent({ ...event, type: 'unknown' }), /invalid event type/);
});

test('redacts sensitive keys and secret-shaped nested values', () => {
  const payload = redactPayload({ token: 'do-not-store', nested: { apiKey: 'also-secret', safe: 'ok', auth: 'Bearer abc.secret-value' }, values: ['https://user:password@example.test/a', '-----BEGIN PRIVATE KEY-----\nsecret'] });
  assert.deepEqual(payload, { token: '[REDACTED]', nested: { apiKey: '[REDACTED]', safe: 'ok', auth: '[REDACTED]' }, values: ['[REDACTED]', '[REDACTED]'] });
  assert.doesNotMatch(JSON.stringify(payload), /do-not-store|also-secret|secret-value|password|PRIVATE KEY/);
});

test('appends readable NDJSON and tolerates a malformed trailing line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  appendEvent(path, fixture('discovery', { payload: { safe: true } }));
  appendEvent(path, fixture('completion', { resultCode: 'PASS' }));
  writeFileSync(path, `${readFileSync(path, 'utf8')}{{partial`, 'utf8');
  assert.equal(readHistory(path).length, 2);
});

test('surfaces corruption in the middle without leaking its contents', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\nnot-json-secret\n${JSON.stringify(fixture('completion'))}\n`, 'utf8');
  assert.throws(() => readHistory(path), (error) => error instanceof HistoryCorruptionError && error.lineNumber === 2 && !error.message.includes('secret'));
});

test('rejects schema-invalid and unsupported final records while tolerating malformed final records', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\n{"schemaVersion":99}\n`, 'utf8');
  assert.throws(() => readHistory(path), /line 2: unsupported event schema version/);
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\n{"broken":`, 'utf8');
  assert.equal(readHistory(path).length, 1);
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\n{"broken":}\n`, 'utf8');
  assert.equal(readHistory(path).length, 1);
});

test('preserves rapid append ordering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  for (let i = 0; i < 25; i += 1) appendEvent(path, fixture('validation', { correlationId: `rapid-${i}`, resultCode: 'PASS' }));
  assert.deepEqual(readHistory(path).map((event) => event.correlationId), Array.from({ length: 25 }, (_, i) => `rapid-${i}`));
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
