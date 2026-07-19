import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

function snapshotTree(root) {
  const result = [];
  function visit(path, relative) {
    const stat = statSync(path);
    result.push({ relative, type: stat.isDirectory() ? 'dir' : 'file', size: stat.size, mode: stat.mode, ino: stat.ino, mtimeMs: stat.mtimeMs, bytes: stat.isFile() ? readFileSync(path).toString('base64') : null });
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(join(path, name), join(relative, name));
    }
  }
  visit(root, '.');
  return result;
}

test('status precedence is total and deterministic for mixed conditions', () => {
  const cases = [
    ['corrupt overrides blocked, stale, stopped, and lock', 'DEGRADED', (f) => {
      write(f.paths.heartbeat, { lastHeartbeat: '2026-07-18T23:00:00.000Z', lastResult: 'STOPPED' });
      write(f.paths.state, { status: 'BLOCKED' }); write(f.paths.claimLock, { createdAt: '2026-07-18T23:00:00.000Z' }); writeFileSync(f.paths.retry, '{bad');
    }],
    ['blocked overrides stale, stopped, and active lock', 'BLOCKED', (f) => {
      write(f.paths.heartbeat, { lastHeartbeat: '2026-07-18T23:00:00.000Z', lastResult: 'STOPPED' }); write(f.paths.state, { status: 'BLOCKED' }); write(f.paths.claimLock, { createdAt: '2026-07-18T23:00:00.000Z' });
    }],
    ['blocked overrides missing heartbeat', 'BLOCKED', (f) => { write(f.paths.state, { status: 'BLOCKED' }); }],
    ['stale overrides stopped and active lock', 'STALE', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-18T23:00:00.000Z', lastResult: 'STOPPED' }); write(f.paths.claimLock, { createdAt: '2026-07-18T23:00:00.000Z' }); }],
    ['stopped overrides active lock', 'STOPPED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z', lastResult: 'STOPPED' }); write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z' }); }],
    ['active lock degrades fresh heartbeat', 'DEGRADED', (f) => { write(f.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:09:55.000Z' }); write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z' }); }]
  ];
  for (const [name, expected, setup] of cases) { const f = fixture(); setup(f); assert.equal(health(f).status, expected, name); }
});

test('exact 120000ms heartbeat boundary is fresh and 120001ms is stale', () => {
  const exact = fixture(); write(exact.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:08:00.000Z' });
  assert.equal(inspectHealth({ ...exact, now: () => Date.parse('2026-07-19T00:10:00.000Z'), queue: () => ({ available: true, ready: 0 }) }).status, 'HEALTHY');
  const over = fixture(); write(over.paths.heartbeat, { lastHeartbeat: '2026-07-19T00:07:59.999Z' });
  assert.equal(inspectHealth({ ...over, now: () => Date.parse('2026-07-19T00:10:00.000Z'), queue: () => ({ available: true, ready: 0 }) }).status, 'STALE');
});

test('each malformed runtime JSON artifact degrades and reports corruption', () => {
  for (const key of ['state', 'heartbeat', 'claimLock', 'supervisorLock', 'retry']) {
    const f = healthy(); writeFileSync(f.paths[key], '{malformed');
    const snapshot = health(f);
    assert.equal(snapshot.status, 'DEGRADED', key);
    assert.equal(snapshot.artifacts.corrupt, true, key);
  }
});

test('each individually missing optional artifact remains safe', () => {
  for (const key of ['state', 'claimLock', 'supervisorLock', 'retry', 'history']) {
    const f = healthy();
    if (key !== 'state') write(f.paths.state, { currentTask: 'EAI-TASK-044' });
    if (key !== 'claimLock' && key !== 'supervisorLock' && key !== 'state') write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z' });
    if (key !== 'claimLock' && key !== 'supervisorLock' && key !== 'state') write(f.paths.supervisorLock, { createdAt: '2026-07-19T00:09:00.000Z' });
    if (key !== 'retry') write(f.paths.retry, { retry: false, attempt: 0 });
    if (key !== 'history') writeFileSync(f.paths.history, `${JSON.stringify(event('discovery', '2026-07-19T00:09:00.000Z'))}\n`);
    assert.equal(health(f).status, key === 'retry' || key === 'history' ? 'DEGRADED' : 'HEALTHY', key);
  }
  const f = fixture();
  assert.equal(health(f).status, 'UNKNOWN');
});

test('read-only snapshot preserves every runtime byte, metadata, directory entry, and absence', () => {
  const f = healthy();
  write(f.paths.state, { currentTask: 'EAI-TASK-044', nested: { token: 'BEARER_CANARY' } });
  write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z' });
  const before = snapshotTree(join(f.root, '.hermes'));
  const snapshot = health(f); formatHuman(snapshot);
  const after = snapshotTree(join(f.root, '.hermes'));
  assert.deepEqual(after, before);
  assert.equal(snapshot.readOnly, true);
});

test('secret canaries never appear in JSON, human output, stderr, or thrown errors', () => {
  const f = healthy();
  write(f.paths.state, { currentTask: 'https://user:pass@example.test/x', currentIssue: 'Bearer SUPER_SECRET_CANARYTOKEN', secret: 'SUPER_SECRET_CANARY', nested: 'Bearer abc.def.ghi' });
  write(f.paths.retry, { failureClass: 'Bearer MIDDLE_SECRET_CANARYTOKEN', token: 'SUPER_SECRET_CANARY' });
  write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z', credential: 'SUPER_SECRET_CANARY' });
  write(f.paths.supervisorLock, { createdAt: '2026-07-19T00:09:00.000Z', authorization: 'SUPER_SECRET_CANARY' });
  writeFileSync(f.paths.history, '{"schemaVersion":999,"payload":{"token":"MIDDLE_SECRET_CANARY"}}\n');
  const snapshot = health(f); const json = JSON.stringify(snapshot); const human = formatHuman(snapshot);
  assert.equal(json.includes('SUPER_SECRET_CANARY'), false);
  assert.equal(json.includes('MIDDLE_SECRET_CANARY'), false);
  assert.equal(human.includes('SUPER_SECRET_CANARY'), false);
  const cliJson = spawnSync(process.execPath, ['scripts/hermes-health.mjs', '--root', f.root, '--json'], { cwd: join(import.meta.dirname, '..'), env: { PATH: '/nonexistent' }, encoding: 'utf8' });
  const cliHuman = spawnSync(process.execPath, ['scripts/hermes-health.mjs', '--root', f.root], { cwd: join(import.meta.dirname, '..'), env: { PATH: '/nonexistent' }, encoding: 'utf8' });
  for (const cli of [cliJson, cliHuman]) {
    assert.equal(cli.error, undefined);
    assert.equal(cli.stdout.includes('SUPER_SECRET_CANARY'), false);
    assert.equal(cli.stdout.includes('MIDDLE_SECRET_CANARY'), false);
    assert.equal(cli.stderr.includes('SUPER_SECRET_CANARY'), false);
    assert.equal(cli.stderr.includes('MIDDLE_SECRET_CANARY'), false);
  }
  assert.doesNotThrow(() => inspectHealth({ ...f, queue: () => { throw new Error('SUPER_SECRET_CANARY'); } }));
});

test('queue unavailable and queue exceptions are deterministic and non-fatal to inspection', () => {
  const f = healthy();
  const unavailable = inspectHealth({ ...f, queue: () => ({ available: false, ready: null }) });
  const thrown = inspectHealth({ ...f, queue: () => { throw new Error('queue secret failure'); } });
  assert.deepEqual(unavailable.queue, { available: false, ready: null });
  assert.deepEqual(thrown.queue, { available: false, ready: null });
  assert.equal(unavailable.status, 'HEALTHY');
  assert.equal(thrown.status, 'HEALTHY');
});

test('claim and supervisor lock ages, including mtime fallback, use the injected clock', () => {
  const f = healthy();
  write(f.paths.claimLock, { createdAt: '2026-07-19T00:08:00.000Z' });
  write(f.paths.supervisorLock, {});
  const mtime = Date.parse('2026-07-19T00:08:00.001Z') / 1000;
  utimesSync(f.paths.supervisorLock, mtime, mtime);
  const snapshot = inspectHealth({ ...f, now: () => Date.parse('2026-07-19T00:10:00.001Z'), queue: () => ({ available: true, ready: 0 }) });
  assert.equal(snapshot.locks.claim.ageMs, 120001);
  assert.equal(snapshot.locks.supervisor.ageMs, 120000);
});

test('actual JSON and human CLI modes preserve an isolated runtime tree', () => {
  const f = healthy();
  write(f.paths.state, { currentTask: 'EAI-TASK-044' });
  write(f.paths.claimLock, { createdAt: '2026-07-19T00:09:00.000Z' });
  const before = snapshotTree(join(f.root, '.hermes'));
  for (const args of [['--json'], []]) {
    const result = spawnSync(process.execPath, ['scripts/hermes-health.mjs', '--root', f.root, ...args], { cwd: join(import.meta.dirname, '..'), env: { PATH: '/nonexistent' }, encoding: 'utf8' });
    assert.equal(result.error, undefined);
    assert.deepEqual(snapshotTree(join(f.root, '.hermes')), before, args.join(' ') || 'human');
  }
});
