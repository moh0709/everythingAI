import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveCodexLaunch, startForgeExecution, EXECUTION_RESULTS } from '../src/forge-execution.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'forge-execution-'));
  const contextPath = join(root, 'context.json');
  writeFileSync(contextPath, JSON.stringify({
    issue: { number: 901, title: 'Forge execution test', state: 'OPEN', labels: ['pm:ready', 'forge:working'], body: 'bounded task' },
    startingSha: 'a'.repeat(40),
    createdAt: new Date().toISOString()
  }));
  return {
    root,
    repoRoot: root,
    contextPath,
    statePath: join(root, 'state.json'),
    heartbeatPath: join(root, 'heartbeat.json'),
    lockPath: join(root, 'execution.lock'),
    outputPath: join(root, 'execution-result.json'),
    schemaPath: join(root, 'execution-result.schema.json'),
    codexPath: 'C:\\tools\\codex.exe',
    environment: { ComSpec: 'C:\\Windows\\System32\\cmd.exe', PATH: '' },
    executableExists: () => true
  };
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
    codexPath: 'C:\\tools\\codex.exe',
    spawnProcess: (path, args, options) => { launched = { path, args, options }; return child; },
    maxRuntimeMs: 1000,
    now: () => new Date('2026-07-29T01:00:00Z')
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'RUNNING');
  assert.equal(JSON.parse(readFileSync(f.heartbeatPath, 'utf8')).issueNumber, 901);
  writeFileSync(f.outputPath, JSON.stringify({ status: 'SUBMITTED_FOR_PM_REVIEW', evidence: ['commit pushed and labels verified'] }));
  child.emit('close', 0, null);
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.COMPLETED);
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'COMPLETED');
  assert.equal(JSON.parse(readFileSync(f.heartbeatPath, 'utf8')).status, 'STOPPED');
  assert.equal(launched.path, 'C:\\tools\\codex.exe');
  assert.equal(launched.args[4], 'danger-full-access');
  assert.deepEqual(launched.args.slice(5, 9), ['--output-schema', f.schemaPath, '--output-last-message', f.outputPath]);
});

test('launches Windows .cmd and .bat shims through cmd.exe', () => {
  for (const shim of ['codex.cmd', 'codex.bat']) {
    const launch = resolveCodexLaunch({
      codexPath: `C:\\Program Files\\Codex\\${shim}`,
      args: ['exec', 'path with spaces'],
      platformName: 'win32',
      environment: { ComSpec: 'C:\\Windows\\System32\\cmd.exe', PATH: '' },
      executableExists: (path) => path.endsWith(shim)
    });
    assert.equal(launch.ok, true);
    assert.equal(launch.launcherExecutable, 'C:\\Windows\\System32\\cmd.exe');
    assert.deepEqual(launch.finalArgs.slice(0, 3), ['/d', '/s', '/c']);
    assert.match(launch.finalArgs[3], /^""C:\\Program Files\\Codex\\codex\.(cmd|bat)"/);
    assert.match(launch.finalArgs[3], /"path with spaces"/);
    assert.equal(launch.windowsVerbatimArguments, true);
  }
});

test('launches Windows .exe directly and keeps non-Windows paths direct', () => {
  const windowsExe = resolveCodexLaunch({
    codexPath: 'C:\\Program Files\\Codex\\codex.exe',
    args: ['--version'],
    platformName: 'win32',
    environment: { ComSpec: 'C:\\Windows\\System32\\cmd.exe', PATH: '' },
    executableExists: () => true
  });
  assert.equal(windowsExe.launcherExecutable, windowsExe.resolvedExecutable);
  assert.deepEqual(windowsExe.finalArgs, ['--version']);

  const unix = resolveCodexLaunch({
    codexPath: '/opt/codex/codex.cmd',
    args: ['--version'],
    platformName: 'linux',
    environment: { PATH: '' },
    executableExists: () => true
  });
  assert.equal(unix.launcherExecutable, '/opt/codex/codex.cmd');
  assert.deepEqual(unix.finalArgs, ['--version']);
});

test('falls back from an invalid override to a CLI shim on PATH', () => {
  const launch = resolveCodexLaunch({
    codexPath: 'C:\\missing\\codex.cmd',
    args: ['--version'],
    platformName: 'win32',
    environment: { ComSpec: 'C:\\Windows\\System32\\cmd.exe', PATH: 'C:\\nvm4w\\nodejs;C:\\Windows\\System32' },
    executableExists: (path) => path === 'C:\\nvm4w\\nodejs\\codex.cmd'
  });
  assert.equal(launch.ok, true);
  assert.equal(launch.resolvedExecutable, 'C:\\nvm4w\\nodejs\\codex.cmd');
  assert.equal(launch.warnings.length, 1);
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

test('returns complete telemetry when the child emits a spawn error', async () => {
  const f = fixture();
  const child = childHarness();
  const promise = startForgeExecution({ ...f, spawnProcess: () => child });
  await new Promise((resolve) => setImmediate(resolve));
  child.emit('error', Object.assign(new Error('spawn failed'), { code: 'ENOENT' }));
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.START_FAILURE);
  assert.equal(result.telemetry.resolvedExecutable, 'C:\\tools\\codex.exe');
  assert.equal(result.telemetry.launcherExecutable, 'C:\\tools\\codex.exe');
  assert.equal(result.telemetry.workingDirectory, f.repoRoot);
  assert.equal(result.telemetry.platform, process.platform);
  assert.equal(result.telemetry.spawnErrorCode, 'ENOENT');
  assert.equal(result.telemetry.exitCode, null);
  assert.equal(result.telemetry.signal, null);
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).telemetry.spawnErrorCode, 'ENOENT');
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
  writeFileSync(f.outputPath, JSON.stringify({ status: 'SUBMITTED_FOR_PM_REVIEW', evidence: [] }));
  child.emit('close', 0, null);
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.COMPLETED);
  assert.equal(existsSync(f.lockPath), false);
});

test('zero process exit without submitted structured result is worker failure', async () => {
  const f = fixture();
  const child = childHarness();
  const promise = startForgeExecution({ ...f, spawnProcess: () => child });
  await new Promise((resolve) => setImmediate(resolve));
  child.emit('close', 0, null);
  const result = await promise;
  assert.equal(result.result, EXECUTION_RESULTS.WORKER_FAILED);
  assert.equal(JSON.parse(readFileSync(f.statePath, 'utf8')).status, 'BLOCKED');
});
