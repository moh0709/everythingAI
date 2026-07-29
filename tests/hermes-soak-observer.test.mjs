import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  acquireObserverLock,
  collectObservationSample,
  initializeObservation,
  readObservationState,
  SOAK_DURATION_MS
} from '../src/hermes-soak-observer.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'hermes-soak-observer-'));
  mkdirSync(join(root, '.hermes', 'runtime'), { recursive: true });
  return {
    root,
    paths: {
      state: join(root, '.hermes', 'soak-observer.json'),
      lock: join(root, '.hermes', 'soak-observer.lock'),
      heartbeat: join(root, '.hermes', 'runtime', 'heartbeat.json'),
      events: join(root, '.hermes', 'runtime', 'events.ndjson')
    }
  };
}

test('initializeObservation persists an immutable start and expected completion at least 24h later', () => {
  const f = fixture();
  const first = initializeObservation({
    ...f,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    observerIdentity: 'forge-test',
    commitSha: 'abc123'
  });
  const second = initializeObservation({
    ...f,
    now: () => new Date('2026-07-29T12:05:00.000Z'),
    observerIdentity: 'forge-test-restart',
    commitSha: 'def456'
  });

  assert.equal(first.startedAt, '2026-07-29T12:00:00.000Z');
  assert.equal(second.startedAt, first.startedAt);
  assert.equal(second.expectedCompletionAt, first.expectedCompletionAt);
  assert.equal(Date.parse(first.expectedCompletionAt) - Date.parse(first.startedAt), SOAK_DURATION_MS);
  assert.equal(second.restartCount, 1);
  assert.equal(second.observerIdentity, 'forge-test-restart');
  assert.equal(second.deployedCommitSha, 'def456');
});

test('acquireObserverLock prevents duplicate observers', () => {
  const f = fixture();
  const first = acquireObserverLock({
    lockPath: f.paths.lock,
    pid: 111,
    hostname: 'host-a',
    now: () => new Date('2026-07-29T12:00:00.000Z')
  });
  const second = acquireObserverLock({
    lockPath: f.paths.lock,
    pid: 222,
    hostname: 'host-a',
    now: () => new Date('2026-07-29T12:01:00.000Z'),
    isPidAlive: () => true
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.result, 'OBSERVER_CONFLICT');
  assert.match(second.evidence.join('\n'), /active observer lock present/);
});

test('collectObservationSample records sanitized heartbeat, queue, watchdog, and service counters', () => {
  const f = fixture();
  writeFileSync(f.paths.heartbeat, JSON.stringify({
    lastHeartbeat: '2026-07-29T12:00:00.000Z',
    mode: 'POLLING',
    secret: 'ghp_SUPERSECRET012345678901'
  }));
  writeFileSync(f.paths.events, [
    JSON.stringify({ schemaVersion: 1, type: 'claim', timestamp: '2026-07-29T12:00:01.000Z', correlationId: 'c1', issueNumber: 93, taskId: 'EAI-TASK-047A', resultCode: null, commitSha: null, validationSummary: null, payload: { token: 'ghp_SUPERSECRET012345678901' } }),
    JSON.stringify({ schemaVersion: 1, type: 'recovery', timestamp: '2026-07-29T12:00:02.000Z', correlationId: 'c2', issueNumber: 93, taskId: 'EAI-TASK-047A', resultCode: 'WATCHDOG', commitSha: null, validationSummary: 'Bearer abc.def.ghi', payload: {} })
  ].join('\n') + '\n');
  const observation = initializeObservation({
    ...f,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    observerIdentity: 'forge-test',
    commitSha: 'abc123'
  });

  const sample = collectObservationSample({
    ...f,
    observation,
    now: () => new Date('2026-07-29T12:01:00.000Z'),
    serviceStatus: () => ({ available: true, activeState: 'active', nRestarts: 2 }),
    queueStatus: () => ({ available: true, readyCount: 0, workingIssues: [93] })
  });

  const stored = readObservationState(f.paths.state);
  const json = JSON.stringify(stored);
  assert.equal(sample.heartbeat.present, true);
  assert.equal(sample.service.nRestarts, 2);
  assert.equal(sample.queue.workingIssues[0], 93);
  assert.equal(stored.samples.length, 1);
  assert.equal(stored.queueOwnershipTransitions.length, 1);
  assert.equal(stored.watchdogEvents.length, 1);
  assert.equal(json.includes('SUPERSECRET'), false);
  assert.equal(json.includes('Bearer abc.def.ghi'), false);
});

test('CLI --dry-run emits parseable sanitized JSON without creating runtime files', () => {
  const f = fixture();
  const result = spawnSync(process.execPath, [
    'scripts/hermes-soak-observer.mjs',
    '--root', f.root,
    '--dry-run'
  ], {
    cwd: join(import.meta.dirname, '..'),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.result, 'DRY_RUN');
  assert.equal(output.durationMs, SOAK_DURATION_MS);
  assert.equal(existsSync(f.paths.state), false);
  assert.equal(existsSync(f.paths.lock), false);
});
