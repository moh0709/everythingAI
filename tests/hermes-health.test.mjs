import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectHealth, formatHuman } from '../scripts/hermes-health.mjs';
import { createEvent } from '../src/event-history.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'hermes-health-'));
  const hermes = join(root, '.hermes');
  const runtime = join(hermes, 'runtime');
  mkdirSync(runtime, { recursive: true });
  return { root, now: () => Date.parse('2026-07-19T00:10:00.000Z'), paths: {
    state: join(hermes, 'state.json'), heartbeat: join(runtime, 'heartbeat.json'),
    claimLock: join(hermes, 'claim.lock'), supervisorLock: join(hermes, 'supervisor.lock'),
    retry: join(hermes, 'retry.json'), history: join(runtime, 'events.ndjson')
  }};
}
const write = (path, value) => writeFileSync(path, JSON.stringify(value));
const healthy = () => { const f = fixture(); write(f.paths.heartbeat, { mode: 'POLLING', lastHeartbeat: '2026-07-19T00:09:55.000Z', lastResult: 'CLAIMED' }); return f; };
const health = (f) => inspectHealth({ ...f, queue: () => ({ available: true, ready: 2 }) });
const event = (type, timestamp, extra = {}) => createEvent({ type, issueNumber: 67, taskId: 'EAI-TASK-044', correlationId: `${type}-${timestamp}`, timestamp, ...extra });

for (const [name, expected, setup] of [
  ['healthy', 'HEALTHY', (f) => write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' })],
  ['blocked state', 'BLOCKED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' }); write(f.paths.state, { status: 'BLOCKED' }); }],
  ['terminal retry', 'BLOCKED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' }); write(f.paths.retry, { terminal: true }); }],
  ['stale heartbeat', 'STALE', (f) => write(f.paths.heartbeat, { lastHeartbeat: '2026-07-18T23:00:00.000Z' })],
  ['exact stale boundary remains fresh', 'HEALTHY', (f) => write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:08:00.000Z' })],
  ['stopped heartbeat', 'STOPPED', (f) => write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z', lastResult: 'STOPPED' })],
  ['missing heartbeat', 'UNKNOWN', () => {}],
  ['corrupt state', 'DEGRADED', (f) => writeFileSync(f.paths.state, '{bad')],
  ['corrupt heartbeat', 'DEGRADED', (f) => writeFileSync(f.paths.heartbeat, '{bad')],
  ['corrupt retry', 'DEGRADED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' }); writeFileSync(f.paths.retry, '{bad'); }],
  ['active retry', 'DEGRADED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' }); write(f.paths.retry, { retry: true, attempt: 2 }); }],
  ['claim lock', 'DEGRADED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' }); write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z' }); }]
]) test(`status matrix: ${name}`, () => {
  const f = fixture(); setup(f); assert.equal(health(f).status, expected);
});

test('120001ms is stale and injected clock controls lock age', () => {
  const f = fixture(); write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:08:00.000Z' });
  write(f.paths.claimLock, { createdAt: '2026-07-19T00:08:00.001Z' });
  const snapshot = inspectHealth({ ...f, now: () => Date.parse('2026-07-19T00:10:00.001Z'), queue: () => ({ available: true, ready: 0 }) });
  assert.equal(snapshot.status, 'STALE'); assert.equal(snapshot.locks.claim.ageMs, 120000);
});

test('history accepts a partial trailing record but rejects corrupt middle records', () => {
  const f = healthy(); writeFileSync(f.paths.history, `${JSON.stringify(event('completion', '2026-07-19T00:09:00.000Z'))}\n{"partial"`);
  assert.equal(health(f).status, 'HEALTHY');
  writeFileSync(f.paths.history, `${JSON.stringify(event('completion', '2026-07-19T00:09:00.000Z'))}\n{bad}\n`);
  assert.equal(health(f).status, 'DEGRADED');
});

test('unsupported history schema degrades without exposing record contents', () => {
  const f = healthy(); writeFileSync(f.paths.history, '{"schemaVersion":999,"payload":{"token":"CANARY"}}\n');
  const snapshot = health(f); assert.equal(snapshot.status, 'DEGRADED'); assert.equal(JSON.stringify(snapshot).includes('CANARY'), false);
});

test('last events are selected chronologically across rotated files', () => {
  const f = healthy(); writeFileSync(f.paths.history, `${JSON.stringify(event('completion', '2026-07-19T00:09:00.000Z', { taskId: 'EAI-TASK-044' }))}\n`);
  writeFileSync(f.paths.history.replace('events.ndjson', 'events.000000000001.ndjson'), `${JSON.stringify(event('completion', '2026-07-19T00:09:30.000Z', { taskId: 'EAI-TASK-044A' }))}\n`);
  const snapshot = health(f); assert.equal(snapshot.lastCompletedTask, 'EAI-TASK-044A');
});

test('JSON and human output are concise, stable, redacted, and read-only', () => {
  const f = healthy(); write(f.paths.state, { currentTask: 'API_KEY=CANARY' });
  const before = readdirSync(join(f.root, '.hermes', 'runtime')).sort().map((name) => [name, readFileSync(join(f.root, '.hermes', 'runtime', name)), statSync(join(f.root, '.hermes', 'runtime', name)).mtimeMs]);
  const snapshot = health(f); const json = JSON.stringify(snapshot); const human = formatHuman(snapshot);
  const after = readdirSync(join(f.root, '.hermes', 'runtime')).sort().map((name) => [name, readFileSync(join(f.root, '.hermes', 'runtime', name)), statSync(join(f.root, '.hermes', 'runtime', name)).mtimeMs]);
  assert.equal(json.includes('CANARY'), false); assert.equal(human.includes('CANARY'), false); assert.deepEqual(after, before);
  assert.equal(snapshot.readOnly, true); assert.match(human, /^Hermes health: /); assert.equal(snapshot.queue.ready, 2);
});

test('metrics derive from durable history and not mutable state', () => {
  const f = healthy(); write(f.paths.state, { metrics: { completed: 999 } });
  writeFileSync(f.paths.history, [event('discovery', '2026-07-19T00:01:00.000Z'), event('claim', '2026-07-19T00:02:00.000Z'), event('retry', '2026-07-19T00:03:00.000Z'), event('completion', '2026-07-19T00:04:00.000Z'), event('block', '2026-07-19T00:05:00.000Z'), event('recovery', '2026-07-19T00:06:00.000Z'), event('validation', '2026-07-19T00:07:00.000Z', { resultCode: 'FAIL' })].map(JSON.stringify).join('\n') + '\n');
  assert.deepEqual(health(f).metrics, { discovered: 1, claimed: 1, completed: 1, blocked: 1, failed: 1, recovered: 1, retried: 1 });
});
