#!/usr/bin/env node
/** Durable systemd-friendly Hermes 24-hour soak observer. */

import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  acquireObserverLock,
  collectObservationSample,
  initializeObservation,
  observerPaths,
  releaseObserverLock,
  SOAK_DURATION_MS
} from '../src/hermes-soak-observer.js';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function flag(name) {
  return process.argv.includes(name);
}

function currentCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: 10_000 }).trim();
  } catch {
    return null;
  }
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  const root = resolve(arg('--root', process.cwd()));
  const intervalMs = Number.parseInt(arg('--interval-ms', '60000'), 10);
  const once = flag('--once');
  const paths = observerPaths(root);

  if (flag('--dry-run')) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      result: 'DRY_RUN',
      root,
      statePath: paths.state,
      lockPath: paths.lock,
      durationMs: SOAK_DURATION_MS
    }, null, 2)}\n`);
    return;
  }

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('--interval-ms must be a positive integer');
  }

  const lockAttempt = acquireObserverLock({ lockPath: paths.lock });
  if (!lockAttempt.ok) {
    process.stderr.write(`${JSON.stringify(lockAttempt, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const observation = initializeObservation({
    paths,
    observerIdentity: `${lockAttempt.lock.hostname}:${lockAttempt.lock.pid}`,
    commitSha: currentCommit(root)
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    result: 'OBSERVING',
    startedAt: observation.startedAt,
    expectedCompletionAt: observation.expectedCompletionAt,
    statePath: paths.state
  }, null, 2)}\n`);

  const shutdown = () => {
    releaseObserverLock({ lockPath: paths.lock, lock: lockAttempt.lock });
  };
  process.once('SIGTERM', () => {
    shutdown();
    process.exit(0);
  });
  process.once('SIGINT', () => {
    shutdown();
    process.exit(0);
  });
  process.once('exit', shutdown);

  do {
    collectObservationSample({ paths, observation });
    if (once) break;
    await sleep(intervalMs);
  } while (true);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ ok: false, result: 'OBSERVER_ERROR', evidence: [error.message] }, null, 2)}\n`);
  process.exit(1);
});
