import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { startForgeExecution, EXECUTION_RESULTS } from '../src/forge-execution.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'forge-execution-'));
  const contextPath = join(root, 'context.json');
  writeFileSync(contextPath, JSON.stringify({
    issue: { number: 901, title: 'Forge execution test', state: 'OPEN', labels: ['pm:ready', 'forge:working'], body: 'bounded task' },
    startingSha: 'a'.repeat(40),
    createdAt: '2026-07-29T01:00:00.000Z'
  }));
  return { root, repoRoot: root, contextPath, statePath: join(root, 'state.json'), heartbeatPath: join(root, 'heartbeat.json'), lockPath: join(root, 'execution.lock') };
}

function childHarness({ pid = 7001 } = {}) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => { child.emit('close', null, 'SIGTERM'); return true; };
  return child;
}

test('starts exactly one bounded Codex execution and clears heartbeat on exit', async () => {
  const f = fixture();
  const child = childHarness();
  let launched;
  const promise = startForgeExecution({
    ...f,
    codexPath: 'codex.exe',
    spawnProcess: (path, args, options) => { launched = { path, args, options }; return child; },
    maxRuntimeMs: 1000,
    now: () => new Date('2026-07-29T01:00:00Z')
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'RUNNING');
  assert.equal(JSON.parse(readFileSync(f.heartbeatPath, 'utf8')).issueNumber, 901);
  child.emit('close', 0, null);
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.COMPLETED);
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'COMPLETED');
  assert.equal(JSON.parse(readFileSync(f.heartbeatPath, 'utf8')).status, 'STOPPED');
  assert.equal(launched.path, 'codex.exe');
  assert.deepEqual(launched.args.slice(0, 9), ['exec', '--ephemeral', '--json', '--sandbox', 'workspace-write', '-c', 'approval_policy="never"', '-C', f.root]);
});

test('rejects duplicate execution while the recorded worker is alive', async () => {
  const f = fixture();
  writeFileSync(f.statePath, JSON.stringify({ issueNumber: 901, status: 'RUNNING', pid: process.pid, startedAt: new Date().toISOString() }));
  const result = await startForgeExecution({ ...f, spawnProcess: () => { throw new Error('must not launch'); } });
  assert.equal(result.result, EXECUTION_RESULTS.ALREADY_RUNNING);
});

test('rejects missing and stale context before launch', async () => {
  const f = fixture();
  const missing = await startForgeExecution({ ...f, contextPath: join(f.root, 'missing.json'), spawnProcess: () => { throw new Error('must not launch'); } });
  assert.equal(missing.result, EXECUTION_RESULTS.INVALID_CONTEXT);
  writeFileSync(f.contextPath, JSON.stringify({ issue: { number: 901 }, startingSha: 'old' }));
  const stale = await startForgeExecution({ ...f, spawnProcess: () => { throw new Error('must not launch'); } });
  assert.equal(stale.result, EXECUTION_RESULTS.INVALID_CONTEXT);
});

test('converts worker start failure into a blocked result', async () => {
  const f = fixture();
  const result = await startForgeExecution({ ...f, spawnProcess: () => { throw new Error('codex unavailable'); } });
  assert.equal(result.result, EXECUTION_RESULTS.START_FAILURE);
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'BLOCKED');
});

test('bounds a running worker and records timeout recovery', async () => {
  const f = fixture();
  const child = childHarness();
  const promise = startForgeExecution({ ...f, spawnProcess: () => child, maxRuntimeMs: 5 });
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.TIMEOUT);
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'TIMED_OUT');
});

test('recovers a dead stale execution lock before launch', async () => {
  const f = fixture();
  writeFileSync(f.lockPath, JSON.stringify({ issueNumber: 44, ownerPid: 7002, hostname: hostname(), startedAt: '2026-07-29T00:00:00.000Z' }));
  const child = childHarness();
  const promise = startForgeExecution({ ...f, spawnProcess: () => child, processChecker: () => false, now: () => new Date('2026-07-29T02:00:00.000Z'), maxContextAgeMs: 2 * 60 * 60 * 1000, staleLockAfterMs: 1000 });
  await new Promise((resolve) => setImmediate(resolve));
  child.emit('close', 0, null);
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.COMPLETED);
  assert.equal(existsSync(f.lockPath), false);
});
