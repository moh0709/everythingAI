import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
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

test('rejects schema-invalid and newline-terminated malformed final records', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\n{"schemaVersion":99}\n`, 'utf8');
  assert.throws(() => readHistory(path), /line 2: unsupported event schema version/);
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\n{"broken":`, 'utf8');
  assert.equal(readHistory(path).length, 1);
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\n{"broken":}\n`, 'utf8');
  assert.throws(() => readHistory(path), /line 2: malformed JSON/);
});

test('uses physical line numbers and tolerates a partial CRLF trailing fragment', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\r\n\r\n{"broken":`, 'utf8');
  assert.equal(readHistory(path).length, 1);
  writeFileSync(path, `${JSON.stringify(fixture('start'))}\r\nnot-json\r\n${JSON.stringify(fixture('completion'))}\r\n`, 'utf8');
  assert.throws(() => readHistory(path), (error) => error instanceof HistoryCorruptionError && error.lineNumber === 2);
});

test('preserves rapid append ordering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  for (let i = 0; i < 25; i += 1) appendEvent(path, fixture('validation', { correlationId: `rapid-${i}`, resultCode: 'PASS' }));
  assert.deepEqual(readHistory(path).map((event) => event.correlationId), Array.from({ length: 25 }, (_, i) => `rapid-${i}`));
});

test('preserves complete records from concurrent independent writers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  const moduleUrl = pathToFileURL(join(process.cwd(), 'src/event-history.js')).href;
  const script = `import { appendEvent, createEvent } from ${JSON.stringify(moduleUrl)};
const [historyPath, writer] = process.argv.slice(1);
for (let i = 0; i < 20; i += 1) appendEvent(historyPath, createEvent({ type: 'validation', issueNumber: 66, taskId: 'EAI-TASK-043', correlationId: writer + '-' + i, timestamp: '2026-07-19T00:00:00.000Z' }), { maxBytes: 1024 * 1024 });`;
  const children = Array.from({ length: 4 }, (_, writer) => spawn(process.execPath, ['--input-type=module', '-e', script, path, `writer-${writer}`]));
  const results = await Promise.all(children.map(async (child) => {
    const [code] = await once(child, 'close');
    return code;
  }));
  assert.deepEqual(results, [0, 0, 0, 0]);
  const ids = readHistory(path).map((event) => event.correlationId);
  assert.equal(ids.length, 80);
  assert.equal(new Set(ids).size, 80);
});

test('rotates bounded history and retains configured rotated files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  for (let i = 0; i < 4; i += 1) appendEvent(path, fixture('retry', { correlationId: `corr-${i}`, payload: { n: i } }), { maxBytes: 1, retainFiles: 2 });
  const files = readdirSync(dir).filter((name) => name.endsWith('.ndjson'));
  const rotated = files.filter((name) => name !== 'events.ndjson').sort();
  assert.deepEqual(rotated, ['events.000000000002.ndjson', 'events.000000000003.ndjson']);
  assert.ok(readHistory(path).length >= 1);
  assert.deepEqual(readHistory(join(dir, rotated[0])).map((event) => event.correlationId), ['corr-1']);
  assert.deepEqual(readHistory(join(dir, rotated[1])).map((event) => event.correlationId), ['corr-2']);
});

test('rotation rename failure leaves the active history unchanged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  const first = fixture('start');
  appendEvent(path, first);
  const before = readFileSync(path, 'utf8');
  assert.throws(() => appendEvent(path, fixture('completion'), {
    maxBytes: 1,
    fsOps: { renameSync() { throw new Error('simulated rename failure'); } },
  }), /simulated rename failure/);
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.equal(readdirSync(dir).filter((name) => name.endsWith('.ndjson')).length, 1);
});

test('retention failure is explicit after preserving active and rotated records', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  const path = join(dir, 'events.ndjson');
  appendEvent(path, fixture('start'));
  assert.throws(() => appendEvent(path, fixture('completion'), {
    maxBytes: 1,
    retainFiles: 0,
    fsOps: { unlinkSync() { throw new Error('simulated retention failure'); } },
  }), /simulated retention failure/);
  assert.equal(readHistory(path).length, 1);
  const rotated = readdirSync(dir).filter((name) => name.endsWith('.ndjson') && name !== 'events.ndjson');
  assert.equal(rotated.length, 1);
  assert.equal(readHistory(join(dir, rotated[0])).length, 1);
  assert.ok(statSync(path).size > 0);
});

test('rejects oversized event payloads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-history-'));
  assert.throws(() => appendEvent(join(dir, 'events.ndjson'), fixture('block', { payload: { detail: 'x'.repeat(100) } }), { maxPayloadBytes: 50 }), /exceeds max payload/);
});
