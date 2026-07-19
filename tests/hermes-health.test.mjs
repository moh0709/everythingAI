import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectHealth, formatHuman } from '../scripts/hermes-health.mjs';
import { createEvent } from '../src/event-history.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'hermes-health-'));
  const runtime = join(root, '.hermes', 'runtime');
  mkdirSync(runtime, { recursive: true });
  const paths = {
    state: join(root, '.hermes', 'state.json'),
    heartbeat: join(runtime, 'heartbeat.json'),
    claimLock: join(root, '.hermes', 'claim.lock'),
    supervisorLock: join(root, '.hermes', 'supervisor.lock'),
    retry: join(root, '.hermes', 'retry.json'),
    history: join(runtime, 'events.ndjson')
  };
  return { paths, now: () => Date.parse('2026-07-19T00:10:00.000Z') };
}
function write(path, value) { writeFileSync(path, JSON.stringify(value)); }
function healthyFixture() {
  const f = fixture();
  write(f.paths.heartbeat, { mode: 'POLLING', lastHeartbeat: '2026-07-19T00:09:55.000Z', currentTask: 'EAI-TASK-044', currentIssue: 67, lastResult: 'CLAIMED' });
  write(f.paths.state, { currentTask: 'EAI-TASK-044', currentIssue: 67 });
  return f;
}

test('reports HEALTHY with read-only JSON and durable metrics', () => {
  const f = healthyFixture();
  const event = createEvent({ type: 'completion', issueNumber: 67, taskId: 'EAI-TASK-044', correlationId: 'health-test', timestamp: '2026-07-19T00:09:00.000Z', resultCode: 'PASS' });
  writeFileSync(f.paths.history, `${JSON.stringify(event)}\n`);
  const snapshot = inspectHealth({ ...f, queue: () => ({ available: true, ready: 2 }) });
  assert.equal(snapshot.status, 'HEALTHY');
  assert.equal(snapshot.readOnly, true);
  assert.equal(snapshot.metrics.completed, 1);
  assert.equal(snapshot.lastCompletedTask, 'EAI-TASK-044');
  assert.equal(snapshot.queue.ready, 2);
});

test('reports DEGRADED for corrupt runtime artifacts', () => {
  const f = healthyFixture();
  writeFileSync(f.paths.history, '{not-json}\n');
  assert.equal(inspectHealth({ ...f, queue: () => ({ available: false, ready: null }) }).status, 'DEGRADED');
});

test('reports BLOCKED for terminal retry state', () => {
  const f = healthyFixture();
  write(f.paths.state, { retry: { terminal: true, attempt: 3, failureClass: 'PERMANENT' } });
  assert.equal(inspectHealth({ ...f, queue: () => ({ available: true, ready: 0 }) }).status, 'BLOCKED');
});

test('reports STALE when heartbeat exceeds the threshold', () => {
  const f = fixture();
  write(f.paths.heartbeat, { mode: 'POLLING', lastHeartbeat: '2026-07-18T23:00:00.000Z' });
  assert.equal(inspectHealth({ ...f, queue: () => ({ available: true, ready: 0 }) }).status, 'STALE');
});

test('reports STOPPED from a clean stopped heartbeat', () => {
  const f = fixture();
  write(f.paths.heartbeat, { mode: 'POLLING', lastHeartbeat: '2026-07-19T00:09:55.000Z', lastResult: 'STOPPED' });
  assert.equal(inspectHealth({ ...f, queue: () => ({ available: true, ready: 0 }) }).status, 'STOPPED');
});

test('reports UNKNOWN when no heartbeat exists and human output is concise', () => {
  const f = fixture();
  const snapshot = inspectHealth({ ...f, queue: () => ({ available: false, ready: null }) });
  assert.equal(snapshot.status, 'UNKNOWN');
  assert.match(formatHuman(snapshot), /^Hermes health: UNKNOWN/);
});
