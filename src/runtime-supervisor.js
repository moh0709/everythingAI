#!/usr/bin/env node
/**
 * runtime-supervisor.js — Hermes runtime supervisor and heartbeat foundation
 *
 * Provides a narrow supervisor/heartbeat foundation that exposes machine-readable
 * liveness and process lifecycle state without changing product application behavior.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { hostname as getHostname } from 'node:os';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const RUNTIME_DIR = resolve('.hermes', 'runtime');
const HEARTBEAT_PATH = resolve(RUNTIME_DIR, 'heartbeat.json');
const HEARTBEAT_TMP_PATH = resolve(RUNTIME_DIR, 'heartbeat.tmp');
const SUPERVISOR_LOCK_PATH = resolve('.hermes', 'supervisor.lock');

export const HEARTBEAT_MODES = Object.freeze({
  POLLING: 'POLLING',
  WEBHOOK: 'WEBHOOK',
  IDLE: 'IDLE'
});

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
export const DEFAULT_STALE_THRESHOLD_MS = 120_000; // 2 minutes

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function safeReadJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Supervisor lock — uses the same claim/lock pattern from task-claim.js
// ---------------------------------------------------------------------------

function acquireSupervisorLock({ pid = process.pid, hostname = getHostname(), now = () => new Date() } = {}) {
  ensureDir(dirname(SUPERVISOR_LOCK_PATH));
  const metadata = {
    pid,
    hostname,
    role: 'supervisor',
    createdAt: nowIso(now)
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(SUPERVISOR_LOCK_PATH, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
      return { ok: true, lock: metadata };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        return { ok: false, result: 'RUNTIME_ERROR', evidence: [`supervisor lock create failed: ${error.message}`] };
      }

      const inspected = inspectSupervisorLock({ hostname, now });
      if (!inspected.present || !inspected.lock) {
        continue;
      }
      if (inspected.stale) {
        try {
          unlinkSync(SUPERVISOR_LOCK_PATH);
          continue;
        } catch (removeError) {
          return {
            ok: false,
            result: 'SUPERVISOR_CONFLICT',
            evidence: [`stale supervisor lock could not be removed: ${removeError.message}`]
          };
        }
      }

      return {
        ok: false,
        result: 'SUPERVISOR_CONFLICT',
        evidence: [
          'active supervisor lock present',
          inspected.reason ?? 'lock already exists'
        ]
      };
    }
  }

  return {
    ok: false,
    result: 'SUPERVISOR_CONFLICT',
    evidence: ['unable to acquire supervisor lock after stale-lock recovery attempt']
  };
}

export function inspectSupervisorLock({ hostname = getHostname(), now = () => new Date(), staleAfterMs = DEFAULT_STALE_THRESHOLD_MS } = {}) {
  if (!existsSync(SUPERVISOR_LOCK_PATH)) {
    return { present: false, stale: false, lock: null };
  }

  let lock;
  try {
    lock = safeReadJson(SUPERVISOR_LOCK_PATH);
  } catch {
    return { present: true, stale: false, lock: null, reason: 'invalid supervisor lock file' };
  }

  if (!lock) {
    return { present: true, stale: false, lock: null, reason: 'unparseable supervisor lock' };
  }

  const createdAtMs = Date.parse(lock?.createdAt ?? '');
  const ageMs = Number.isFinite(createdAtMs) ? Math.max(0, now().getTime() - createdAtMs) : null;
  const sameHost = lock?.hostname && lock.hostname === hostname;
  const processAlive = sameHost ? isPidAlive(lock?.pid) : false;

  if (!sameHost) {
    // Different host — conservative: treat as active unless stale by time
    if (ageMs !== null && ageMs > staleAfterMs) {
      return { present: true, stale: true, lock, ageMs, reason: 'lock exceeded stale threshold on different host' };
    }
    return { present: true, stale: false, lock, ageMs, reason: 'active lock from different host' };
  }

  if (!processAlive) {
    return { present: true, stale: true, lock, ageMs, reason: 'owner process is not alive on this host' };
  }

  return { present: true, stale: false, lock, ageMs, reason: 'active supervisor lock' };
}

function releaseSupervisorLock(expectedLock) {
  if (!existsSync(SUPERVISOR_LOCK_PATH)) {
    return false;
  }
  try {
    const current = safeReadJson(SUPERVISOR_LOCK_PATH);
    const sameOwner = current?.pid === expectedLock?.pid && current?.hostname === expectedLock?.hostname;
    if (sameOwner && current?.role === 'supervisor') {
      unlinkSync(SUPERVISOR_LOCK_PATH);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isPidAlive(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }
  try {
    process.kill(numericPid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Heartbeat — atomic file writes
// ---------------------------------------------------------------------------

function buildHeartbeat({
  mode = HEARTBEAT_MODES.IDLE,
  pid = process.pid,
  hostname,
  processStartTime,
  currentIssue = null,
  currentTask = null,
  lastResult = null,
  now = () => new Date()
} = {}) {
  const heartbeat = {
    pid,
    processStartTime: processStartTime ?? nowIso(now),
    lastHeartbeat: nowIso(now),
    mode,
    currentIssue,
    currentTask,
    lastResult
  };

  // Never record environment variables, tokens, or secrets
  // hostname is only included when explicitly passed (safe contexts)
  if (hostname !== undefined) {
    heartbeat.hostname = hostname;
  }

  return heartbeat;
}

export function writeHeartbeat({
  mode = HEARTBEAT_MODES.IDLE,
  pid = process.pid,
  hostname,
  processStartTime,
  currentIssue = null,
  currentTask = null,
  lastResult = null,
  now = () => new Date(),
  heartbeatPath = HEARTBEAT_PATH,
  tmpPath = HEARTBEAT_TMP_PATH,
  runtimeDir = RUNTIME_DIR
} = {}) {
  ensureDir(runtimeDir);

  const heartbeat = buildHeartbeat({ mode, pid, hostname, processStartTime, currentIssue, currentTask, lastResult, now });

  // Atomic write: write to temp file, then rename
  writeFileSync(tmpPath, `${JSON.stringify(heartbeat, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, heartbeatPath);

  return heartbeat;
}

export function readHeartbeat({ heartbeatPath = HEARTBEAT_PATH } = {}) {
  return safeReadJson(heartbeatPath);
}

export function isHeartbeatStale({
  heartbeat,
  now = () => new Date(),
  staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS
} = {}) {
  if (!heartbeat || !heartbeat.lastHeartbeat) {
    return true;
  }
  const lastHb = Date.parse(heartbeat.lastHeartbeat);
  if (!Number.isFinite(lastHb)) {
    return true;
  }
  return (now().getTime() - lastHb) > staleThresholdMs;
}

// ---------------------------------------------------------------------------
// Supervisor — lifecycle controller
// ---------------------------------------------------------------------------

export function createSupervisor({
  mode = HEARTBEAT_MODES.IDLE,
  heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS,
  hostname,
  pid = process.pid,
  now = () => new Date(),
  onHeartbeat = null,
  onShutdown = null
} = {}) {
  let timerId = null;
  let running = false;
  let shutdownHappened = false;
  let processStartTime = nowIso(now);
  let currentIssue = null;
  let currentTask = null;
  let lastResult = null;
  let signalHandlerAttached = false;

  const supervisor = {
    get running() { return running; },
    get mode() { return mode; },
    get currentIssue() { return currentIssue; },
    get currentTask() { return currentTask; },
    get lastResult() { return lastResult; },

    setStatus({ issue, task, result, newMode } = {}) {
      if (issue !== undefined) currentIssue = issue;
      if (task !== undefined) currentTask = task;
      if (result !== undefined) lastResult = result;
      if (newMode !== undefined) mode = newMode;
    },

    async start() {
      if (running) {
        return { ok: false, result: 'ALREADY_RUNNING', evidence: ['supervisor is already running'] };
      }

      // Acquire supervisor lock to prevent two supervisors
      const lockAttempt = acquireSupervisorLock({ pid, hostname, now });
      if (!lockAttempt.ok) {
        return lockAttempt;
      }

      running = true;
      shutdownHappened = false;
      processStartTime = nowIso(now);

      // Write initial heartbeat
      const initialHeartbeat = writeHeartbeat({
        mode,
        pid,
        hostname,
        processStartTime,
        currentIssue,
        currentTask,
        lastResult,
        now
      });

      // Set up periodic heartbeat
      timerId = setInterval(() => {
        if (!running) return;
        const hb = writeHeartbeat({
          mode,
          pid,
          hostname,
          processStartTime,
          currentIssue,
          currentTask,
          lastResult,
          now
        });
        if (onHeartbeat) {
          onHeartbeat(hb);
        }
      }, heartbeatIntervalMs);

      // Handle graceful shutdown signals
      if (!signalHandlerAttached) {
        signalHandlerAttached = true;
        const handleSignal = (signal) => {
          if (shutdownHappened) return;
          shutdownHappened = true;
          running = false;

          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }

          // Write final heartbeat before shutdown
          writeHeartbeat({
            mode,
            pid,
            hostname,
            processStartTime,
            currentIssue,
            currentTask,
            lastResult: 'SHUTDOWN',
            now
          });

          // Release supervisor lock
          releaseSupervisorLock(lockAttempt.lock);

          if (onShutdown) {
            onShutdown(signal);
          }
        };

        process.on('SIGTERM', () => handleSignal('SIGTERM'));
        process.on('SIGINT', () => handleSignal('SIGINT'));
      }

      return {
        ok: true,
        result: 'STARTED',
        lock: lockAttempt.lock,
        heartbeat: initialHeartbeat
      };
    },

    stop() {
      if (!running) return { ok: false, result: 'NOT_RUNNING' };
      shutdownHappened = true;
      running = false;

      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }

      // Write final heartbeat
      writeHeartbeat({
        mode,
        pid,
        hostname,
        processStartTime,
        currentIssue,
        currentTask,
        lastResult: 'STOPPED',
        now
      });

      // Release supervisor lock
      const lockData = { pid, hostname };
      releaseSupervisorLock(lockData);

      return { ok: true, result: 'STOPPED' };
    }
  };

  return supervisor;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseArgs(args = process.argv.slice(2)) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--mode' && args[i + 1]) {
      parsed.mode = args[i + 1].toUpperCase();
      i += 1;
    } else if (args[i] === '--interval' && args[i + 1]) {
      parsed.interval = parseInt(args[i + 1], 10);
      i += 1;
    } else if (args[i] === '--dry-run') {
      parsed.dryRun = true;
    }
  }
  return parsed;
}

function runSupervisorCli() {
  const args = parseArgs();
  const mode = args.mode === 'WEBHOOK' ? HEARTBEAT_MODES.WEBHOOK : HEARTBEAT_MODES.POLLING;
  const interval = Number.isFinite(args.interval) && args.interval > 0 ? args.interval : DEFAULT_HEARTBEAT_INTERVAL_MS;

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      result: 'DRY_RUN',
      mode,
      interval,
      heartbeatPath: HEARTBEAT_PATH,
      lockPath: SUPERVISOR_LOCK_PATH
    }, null, 2));
    process.exit(0);
  }

  console.log(`[runtime-supervisor] Starting supervisor in ${mode} mode (interval=${interval}ms)`);

  const supervisor = createSupervisor({ mode, heartbeatIntervalMs: interval });
  const result = supervisor.start();

  if (!result.ok) {
    console.error(`[runtime-supervisor] Failed to start: ${result.result}`);
    if (result.evidence) {
      for (const line of result.evidence) {
        console.error(`[runtime-supervisor]   ${line}`);
      }
    }
    process.exit(1);
  }

  console.log(`[runtime-supervisor] Supervisor started (pid=${result.lock.pid}, lock=${SUPERVISOR_LOCK_PATH})`);
  console.log(`[runtime-supervisor] Initial heartbeat: ${HEARTBEAT_PATH}`);

  // Keep process alive — signals will handle shutdown
  process.on('beforeExit', () => {
    supervisor.stop();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSupervisorCli();
}

export {
  acquireSupervisorLock,
  releaseSupervisorLock,
  SUPERVISOR_LOCK_PATH,
  HEARTBEAT_PATH,
  HEARTBEAT_TMP_PATH,
  RUNTIME_DIR
};
