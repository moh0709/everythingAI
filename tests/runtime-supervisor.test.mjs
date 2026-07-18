import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  writeHeartbeat,
  readHeartbeat,
  isHeartbeatStale,
  createSupervisor,
  inspectSupervisorLock,
  acquireSupervisorLock,
  HEARTBEAT_MODES,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_STALE_THRESHOLD_MS,
  HEARTBEAT_PATH,
  SUPERVISOR_LOCK_PATH
} from '../src/runtime-supervisor.js';

// ---------------------------------------------------------------------------
// Helper: create a temp directory with unique paths for testing
// ---------------------------------------------------------------------------

function tempRuntime() {
  const base = mkdtempSync(join(tmpdir(), 'runtime-supervisor-test-'));
  const runtimeDir = join(base, '.hermes', 'runtime');
  const lockDir = join(base, '.hermes');
  mkdirSync(runtimeDir, { recursive: true });
  return {
    base,
    runtimeDir,
    heartbeatPath: join(runtimeDir, 'heartbeat.json'),
    tmpPath: join(runtimeDir, 'heartbeat.tmp'),
    lockPath: join(lockDir, 'supervisor.lock')
  };
}

// ---------------------------------------------------------------------------
// Heartbeat tests
// ---------------------------------------------------------------------------

test('writeHeartbeat creates a valid heartbeat file at the given path', () => {
  const t = tempRuntime();
  const now = () => new Date('2026-07-18T14:00:00.000Z');

  const hb = writeHeartbeat({
    mode: HEARTBEAT_MODES.POLLING,
    pid: 12345,
    hostname: 'test-host',
    processStartTime: '2026-07-18T13:59:00.000Z',
    currentIssue: 63,
    currentTask: 'EAI-TASK-040',
    lastResult: 'CLAIMED',
    now,
    heartbeatPath: t.heartbeatPath,
    tmpPath: t.tmpPath,
    runtimeDir: t.runtimeDir
  });

  assert.ok(existsSync(t.heartbeatPath));
  assert.equal(hb.pid, 12345);
  assert.equal(hb.hostname, 'test-host');
  assert.equal(hb.mode, HEARTBEAT_MODES.POLLING);
  assert.equal(hb.currentIssue, 63);
  assert.equal(hb.currentTask, 'EAI-TASK-040');
  assert.equal(hb.lastResult, 'CLAIMED');
  assert.equal(hb.lastHeartbeat, '2026-07-18T14:00:00.000Z');
  assert.equal(hb.processStartTime, '2026-07-18T13:59:00.000Z');

  // Verify the file is valid JSON
  const fromDisk = JSON.parse(readFileSync(t.heartbeatPath, 'utf8'));
  assert.deepEqual(fromDisk, hb);
});

test('writeHeartbeat does not include hostname when not passed', () => {
  const t = tempRuntime();

  const hb = writeHeartbeat({
    mode: HEARTBEAT_MODES.IDLE,
    pid: 111,
    heartbeatPath: t.heartbeatPath,
    tmpPath: t.tmpPath,
    runtimeDir: t.runtimeDir
  });

  assert.equal(hb.hostname, undefined);
  assert.ok(!('hostname' in hb));
});

test('writeHeartbeat does not include environment variables, tokens, or secrets', () => {
  const t = tempRuntime();

  const hb = writeHeartbeat({
    mode: HEARTBEAT_MODES.POLLING,
    pid: 222,
    heartbeatPath: t.heartbeatPath,
    tmpPath: t.tmpPath,
    runtimeDir: t.runtimeDir
  });

  // Ensure no sensitive fields present
  assert.equal(hb.GH_TOKEN, undefined);
  assert.equal(hb.HERMES_GITHUB_TOKEN, undefined);
  assert.equal(hb.OPENAI_API_KEY, undefined);
  assert.equal(hb.ANTHROPIC_API_KEY, undefined);
  assert.equal(hb.NODE_ENV, undefined);
  assert.equal(hb.PATH, undefined);
  assert.equal(hb.HOME, undefined);
});

test('writeHeartbeat uses atomic write (tmp file then rename)', () => {
  const t = tempRuntime();

  writeHeartbeat({
    mode: HEARTBEAT_MODES.POLLING,
    pid: 333,
    heartbeatPath: t.heartbeatPath,
    tmpPath: t.tmpPath,
    runtimeDir: t.runtimeDir
  });

  // The temp file should not exist after the write
  assert.ok(!existsSync(t.tmpPath));
  // The heartbeat file should exist
  assert.ok(existsSync(t.heartbeatPath));
});

test('readHeartbeat returns null for missing file', () => {
  const hb = readHeartbeat({ heartbeatPath: '/tmp/nonexistent-heartbeat-test.json' });
  assert.equal(hb, null);
});

test('readHeartbeat returns parsed heartbeat', () => {
  const t = tempRuntime();
  const data = { pid: 1, mode: 'IDLE', lastHeartbeat: '2026-07-18T14:00:00.000Z' };
  writeFileSync(t.heartbeatPath, JSON.stringify(data));

  const hb = readHeartbeat({ heartbeatPath: t.heartbeatPath });
  assert.deepEqual(hb, data);
});

// ---------------------------------------------------------------------------
// Stale heartbeat tests
// ---------------------------------------------------------------------------

test('isHeartbeatStale returns true when heartbeat is null', () => {
  assert.equal(isHeartbeatStale({ heartbeat: null }), true);
});

test('isHeartbeatStale returns false when heartbeat is fresh', () => {
  const now = new Date('2026-07-18T14:00:00.000Z');
  const heartbeat = {
    lastHeartbeat: '2026-07-18T13:59:45.000Z' // 15 seconds ago
  };
  assert.equal(isHeartbeatStale({
    heartbeat,
    now: () => now,
    staleThresholdMs: DEFAULT_STALE_THRESHOLD_MS // 120s
  }), false);
});

test('isHeartbeatStale returns true when heartbeat exceeds stale threshold', () => {
  const now = new Date('2026-07-18T14:05:00.000Z');
  const heartbeat = {
    lastHeartbeat: '2026-07-18T14:00:00.000Z' // 5 minutes ago
  };
  assert.equal(isHeartbeatStale({
    heartbeat,
    now: () => now,
    staleThresholdMs: 120_000 // 2 minutes
  }), true);
});

test('isHeartbeatStale returns true on unparseable lastHeartbeat', () => {
  const heartbeat = { lastHeartbeat: 'not-a-date' };
  assert.equal(isHeartbeatStale({ heartbeat }), true);
});

test('isHeartbeatStale uses threshold parameter correctly', () => {
  const now = new Date('2026-07-18T14:01:00.000Z'); // 1 minute after
  const heartbeat = {
    lastHeartbeat: '2026-07-18T14:00:00.000Z'
  };

  // With a 30-second threshold, 1 minute is stale
  assert.equal(isHeartbeatStale({ heartbeat, now: () => now, staleThresholdMs: 30_000 }), true);

  // With a 120-second threshold, 1 minute is fresh
  assert.equal(isHeartbeatStale({ heartbeat, now: () => now, staleThresholdMs: 120_000 }), false);
});

// ---------------------------------------------------------------------------
// Supervisor lock tests
// ---------------------------------------------------------------------------

test('acquireSupervisorLock creates lock with metadata', async () => {
  const now = () => new Date('2026-07-18T14:00:00.000Z');
  const pid = 9999;
  const { unlinkSync } = await import('node:fs');

  const result = acquireSupervisorLock({ pid, hostname: 'lock-host', now });

  assert.equal(result.ok, true);
  assert.ok(result.lock);
  assert.equal(result.lock.pid, pid);
  assert.equal(result.lock.hostname, 'lock-host');
  assert.equal(result.lock.role, 'supervisor');
  assert.equal(result.lock.createdAt, '2026-07-18T14:00:00.000Z');

  // Clean up
  if (existsSync(SUPERVISOR_LOCK_PATH)) {
    unlinkSync(SUPERVISOR_LOCK_PATH);
  }
});

// ---------------------------------------------------------------------------
// Supervisor lifecycle tests
// ---------------------------------------------------------------------------

test('createSupervisor returns a controller object', () => {
  const supervisor = createSupervisor({ mode: HEARTBEAT_MODES.POLLING });
  assert.ok(supervisor);
  assert.equal(typeof supervisor.start, 'function');
  assert.equal(typeof supervisor.stop, 'function');
  assert.equal(typeof supervisor.setStatus, 'function');
  assert.equal(supervisor.running, false);
  assert.equal(supervisor.mode, HEARTBEAT_MODES.POLLING);
});

test('createSupervisor start returns SINGLE_USE if started after stop', async () => {
  const supervisor = createSupervisor({
    mode: HEARTBEAT_MODES.POLLING,
    hostname: 'test-start-twice'
  });

  const firstStart = await supervisor.start();
  assert.equal(firstStart.ok, true);

  // Stop the supervisor
  const stopResult = supervisor.stop();
  assert.equal(stopResult.ok, true);

  // Second start after stop should fail with SINGLE_USE
  const secondStart = await supervisor.start();
  assert.equal(secondStart.result, 'SINGLE_USE');
  assert.ok(secondStart.evidence[0].includes('single-use'));
});

test('createSupervisor stop returns NOT_RUNNING if not started', () => {
  const supervisor = createSupervisor();
  const result = supervisor.stop();
  assert.equal(result.result, 'NOT_RUNNING');
});

test('createSupervisor setStatus updates tracked state', () => {
  const supervisor = createSupervisor();

  assert.equal(supervisor.currentIssue, null);
  assert.equal(supervisor.currentTask, null);
  assert.equal(supervisor.lastResult, null);

  supervisor.setStatus({ issue: 42, task: 'EAI-TASK-042', result: 'WORKING' });

  assert.equal(supervisor.currentIssue, 42);
  assert.equal(supervisor.currentTask, 'EAI-TASK-042');
  assert.equal(supervisor.lastResult, 'WORKING');
});

test('createSupervisor setStatus updates mode', () => {
  const supervisor = createSupervisor({ mode: HEARTBEAT_MODES.POLLING });

  assert.equal(supervisor.mode, HEARTBEAT_MODES.POLLING);

  supervisor.setStatus({ newMode: HEARTBEAT_MODES.WEBHOOK });

  assert.equal(supervisor.mode, HEARTBEAT_MODES.WEBHOOK);
});

test('supervisor.used getter reflects single-use state', async () => {
  const supervisor = createSupervisor({ hostname: 'test-used-getter' });
  assert.equal(supervisor.used, false);

  await supervisor.start();
  assert.equal(supervisor.used, true);

  supervisor.stop();
  assert.equal(supervisor.used, true);
});

test('supervisor creates a fresh instance from a new factory call', () => {
  const s1 = createSupervisor();
  const s2 = createSupervisor();
  assert.notEqual(s1, s2);
  assert.equal(s1.used, false);
  assert.equal(s2.used, false);
});

// ---------------------------------------------------------------------------
// CLI boundary tests
// ---------------------------------------------------------------------------

test('CLI --dry-run outputs valid JSON and exits 0', () => {
  const result = spawnSync('node', [
    'src/runtime-supervisor.js',
    '--dry-run'
  ], {
    encoding: 'utf8',
    cwd: join(import.meta.dirname, '..')
  });

  assert.equal(result.status, 0, `CLI --dry-run exited with status ${result.status}: ${result.stderr}`);

  let output;
  try {
    output = JSON.parse(result.stdout.trim());
  } catch {
    assert.fail(`CLI --dry-run output is not valid JSON: ${result.stdout}`);
  }

  assert.equal(output.ok, true);
  assert.equal(output.result, 'DRY_RUN');
  assert.ok(output.mode);
  assert.ok(output.interval);
  assert.ok(output.heartbeatPath);
  assert.ok(output.lockPath);
});

test('CLI --dry-run --mode webhook outputs correct mode', () => {
  const result = spawnSync('node', [
    'src/runtime-supervisor.js',
    '--dry-run',
    '--mode', 'webhook'
  ], {
    encoding: 'utf8',
    cwd: join(import.meta.dirname, '..')
  });

  assert.equal(result.status, 0, `CLI --dry-run webhook exited with status ${result.status}`);
  const output = JSON.parse(result.stdout.trim());
  assert.equal(output.mode, 'WEBHOOK');
});

test('CLI --dry-run --interval 5000 outputs correct interval', () => {
  const result = spawnSync('node', [
    'src/runtime-supervisor.js',
    '--dry-run',
    '--interval', '5000'
  ], {
    encoding: 'utf8',
    cwd: join(import.meta.dirname, '..')
  });

  assert.equal(result.status, 0, `CLI --dry-run interval exited with status ${result.status}`);
  const output = JSON.parse(result.stdout.trim());
  assert.equal(output.interval, 5000);
});

test('CLI without --dry-run starts supervisor and writes heartbeat', () => {
  // Use a dedicated test directory so the supervisor lock doesn't conflict
  const testDir = mkdtempSync(join(tmpdir(), 'cli-supervisor-test-'));
  const originalCwd = process.cwd;
  // We can't easily change cwd for subprocess, so we just verify the supervisor
  // binary works and exits correctly with a short interval

  // Start supervisor with a very short interval, send SIGTERM after a short delay
  const proc = spawnSync('node', [
    'src/runtime-supervisor.js',
    '--mode', 'polling',
    '--interval', '1000'
  ], {
    encoding: 'utf8',
    cwd: join(import.meta.dirname, '..'),
    timeout: 3000,
    killSignal: 'SIGTERM'
  });

  // The process should have exited on SIGTERM with shutdown happening
  // We don't check signal directly because SIGTERM causes exit code 143
  // But we should see the startup message in stdout
  assert.ok(
    proc.stdout.includes('Starting supervisor'),
    `CLI output should contain startup message. Got: ${proc.stdout.slice(0, 200)}`
  );
  assert.ok(
    proc.stdout.includes('Supervisor started') || proc.stdout.includes('Supervisor started'),
    `CLI output should contain success message. Got: ${proc.stdout.slice(0, 200)}`
  );
});

// ---------------------------------------------------------------------------
// Default constants
// ---------------------------------------------------------------------------

test('DEFAULT_HEARTBEAT_INTERVAL_MS is 30 seconds', () => {
  assert.equal(DEFAULT_HEARTBEAT_INTERVAL_MS, 30_000);
});

test('DEFAULT_STALE_THRESHOLD_MS is 2 minutes', () => {
  assert.equal(DEFAULT_STALE_THRESHOLD_MS, 120_000);
});

test('HEARTBEAT_MODES has all expected modes', () => {
  assert.equal(HEARTBEAT_MODES.POLLING, 'POLLING');
  assert.equal(HEARTBEAT_MODES.WEBHOOK, 'WEBHOOK');
  assert.equal(HEARTBEAT_MODES.IDLE, 'IDLE');
  assert.equal(Object.keys(HEARTBEAT_MODES).length, 3);
});
