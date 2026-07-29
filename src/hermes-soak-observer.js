#!/usr/bin/env node
/** Durable 24-hour Hermes soak observer primitives. */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { hostname as osHostname } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendEvent, createEvent, readHistory, redactPayload } from './event-history.js';

export const SOAK_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_SAMPLES = 2000;
const DEFAULT_TASK_ID = 'EAI-TASK-047A';
const DEFAULT_ISSUE_NUMBER = 93;

export function observerPaths(root = process.cwd()) {
  const base = resolve(root);
  return {
    state: resolve(base, '.hermes', 'soak-observer.json'),
    stateTmp: resolve(base, '.hermes', 'soak-observer.tmp'),
    lock: resolve(base, '.hermes', 'soak-observer.lock'),
    heartbeat: resolve(base, '.hermes', 'runtime', 'heartbeat.json'),
    events: resolve(base, '.hermes', 'runtime', 'events.ndjson')
  };
}

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function safeReadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function atomicWriteJson(path, tmpPath, value) {
  ensureParent(path);
  writeFileSync(tmpPath, `${JSON.stringify(redactPayload(value), null, 2)}\n`, 'utf8');
  renameSync(tmpPath, path);
}

function isDefaultPidAlive(pid) {
  const numeric = Number(pid);
  if (!Number.isInteger(numeric) || numeric <= 0) return false;
  try {
    process.kill(numeric, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

export function acquireObserverLock({
  lockPath,
  pid = process.pid,
  hostname = osHostname(),
  now = () => new Date(),
  isPidAlive = isDefaultPidAlive
} = {}) {
  ensureParent(lockPath);
  const lock = { pid, hostname, role: 'soak-observer', createdAt: nowIso(now) };
  try {
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    return { ok: true, lock };
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      return { ok: false, result: 'OBSERVER_ERROR', evidence: [`observer lock create failed: ${error.message}`] };
    }
    const existing = safeReadJson(lockPath);
    const sameHost = existing?.hostname === hostname;
    const alive = sameHost ? isPidAlive(existing?.pid) : true;
    if (existing && sameHost && !alive) {
      try {
        unlinkSync(lockPath);
        writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
        return { ok: true, lock, recoveredStaleLock: true };
      } catch (retryError) {
        return { ok: false, result: 'OBSERVER_CONFLICT', evidence: [`stale observer lock could not be replaced: ${retryError.message}`] };
      }
    }
    return { ok: false, result: 'OBSERVER_CONFLICT', evidence: ['active observer lock present'] };
  }
}

export function releaseObserverLock({ lockPath, lock }) {
  const current = safeReadJson(lockPath);
  if (current?.pid === lock?.pid && current?.hostname === lock?.hostname && current?.role === 'soak-observer') {
    unlinkSync(lockPath);
    return true;
  }
  return false;
}

export function readObservationState(path) {
  return safeReadJson(path);
}

export function initializeObservation({
  paths,
  root = process.cwd(),
  now = () => new Date(),
  observerIdentity = `${osHostname()}:${process.pid}`,
  commitSha = null,
  issueNumber = DEFAULT_ISSUE_NUMBER,
  taskId = DEFAULT_TASK_ID
} = {}) {
  paths = { ...observerPaths(root), ...(paths ?? {}) };
  const existing = readObservationState(paths.state);
  const startedAt = existing?.startedAt ?? nowIso(now);
  const expectedCompletionAt = existing?.expectedCompletionAt ?? new Date(Date.parse(startedAt) + SOAK_DURATION_MS).toISOString();
  const observation = {
    schemaVersion: 1,
    issueNumber,
    taskId,
    status: 'OBSERVING',
    startedAt,
    expectedCompletionAt,
    observerIdentity,
    deployedCommitSha: commitSha,
    restartCount: existing ? Number(existing.restartCount ?? 0) + 1 : 0,
    lastUpdatedAt: nowIso(now),
    sampleCount: existing?.sampleCount ?? 0,
    samples: existing?.samples ?? [],
    serviceRestartCounters: existing?.serviceRestartCounters ?? [],
    queueOwnershipTransitions: existing?.queueOwnershipTransitions ?? [],
    watchdogEvents: existing?.watchdogEvents ?? [],
    failureEvents: existing?.failureEvents ?? []
  };
  atomicWriteJson(paths.state, paths.stateTmp, observation);
  return observation;
}

function readHeartbeat(path) {
  const heartbeat = safeReadJson(path);
  if (!heartbeat) return { present: false };
  return redactPayload({
    present: true,
    lastHeartbeat: heartbeat.lastHeartbeat ?? null,
    mode: heartbeat.mode ?? null,
    lastResult: heartbeat.lastResult ?? null,
    currentIssue: heartbeat.currentIssue ?? null,
    currentTask: heartbeat.currentTask ?? null
  });
}

export function defaultServiceStatus(service = 'hermes-soak-observer.service') {
  try {
    const output = execFileSync('systemctl', [
      'show',
      service,
      '--property=ActiveState',
      '--property=SubState',
      '--property=NRestarts'
    ], { encoding: 'utf8', timeout: 10_000 });
    const pairs = Object.fromEntries(output.trim().split(/\r?\n/).filter(Boolean).map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }));
    return {
      available: true,
      service,
      activeState: pairs.ActiveState ?? null,
      subState: pairs.SubState ?? null,
      nRestarts: Number.parseInt(pairs.NRestarts ?? '0', 10)
    };
  } catch {
    return { available: false, service, activeState: null, subState: null, nRestarts: null };
  }
}

export function defaultQueueStatus(root = process.cwd()) {
  const result = spawnSync('gh', [
    'issue',
    'list',
    '--repo',
    'moh0709/everythingAI',
    '--state',
    'open',
    '--label',
    'forge:working',
    '--limit',
    '100',
    '--json',
    'number'
  ], { cwd: root, encoding: 'utf8', timeout: 10_000 });
  if (result.status !== 0) return { available: false, readyCount: null, workingIssues: [] };
  try {
    const issues = JSON.parse(result.stdout);
    return { available: true, readyCount: null, workingIssues: issues.map((issue) => issue.number).sort((a, b) => a - b) };
  } catch {
    return { available: false, readyCount: null, workingIssues: [] };
  }
}

function readRelevantEvents(path) {
  try {
    return readHistory(path).filter((event) => event.issueNumber === DEFAULT_ISSUE_NUMBER || event.taskId === DEFAULT_TASK_ID);
  } catch {
    return [];
  }
}

function appendUniqueByTimestamp(list, item) {
  if (!list.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) list.push(item);
}

export function collectObservationSample({
  paths,
  root = process.cwd(),
  observation,
  now = () => new Date(),
  serviceStatus = () => defaultServiceStatus(),
  queueStatus = () => defaultQueueStatus(),
  issueNumber = DEFAULT_ISSUE_NUMBER,
  taskId = DEFAULT_TASK_ID
} = {}) {
  paths = { ...observerPaths(root), ...(paths ?? {}) };
  const current = readObservationState(paths.state) ?? observation;
  const timestamp = nowIso(now);
  const service = redactPayload(serviceStatus());
  const queue = redactPayload(queueStatus());
  const heartbeat = readHeartbeat(paths.heartbeat);
  const sample = { timestamp, heartbeat, service, queue };
  const events = readRelevantEvents(paths.events).map(redactPayload);

  const next = {
    ...current,
    status: 'OBSERVING',
    lastUpdatedAt: timestamp,
    sampleCount: Number(current.sampleCount ?? 0) + 1,
    samples: [...(current.samples ?? []), sample].slice(-MAX_SAMPLES),
    serviceRestartCounters: [...(current.serviceRestartCounters ?? []), { timestamp, service }].slice(-MAX_SAMPLES),
    queueOwnershipTransitions: [...(current.queueOwnershipTransitions ?? [])],
    watchdogEvents: [...(current.watchdogEvents ?? [])],
    failureEvents: [...(current.failureEvents ?? [])]
  };

  for (const event of events) {
    if (['claim', 'start', 'completion', 'block'].includes(event.type)) appendUniqueByTimestamp(next.queueOwnershipTransitions, event);
    if (event.type === 'recovery') appendUniqueByTimestamp(next.watchdogEvents, event);
    if (event.resultCode && ['FAIL', 'FAILED', 'ERROR'].includes(String(event.resultCode).toUpperCase())) appendUniqueByTimestamp(next.failureEvents, event);
  }

  atomicWriteJson(paths.state, paths.stateTmp, next);
  try {
    appendEvent(paths.events, createEvent({
      type: 'validation',
      issueNumber,
      taskId,
      resultCode: 'OBSERVER_SAMPLE',
      validationSummary: 'durable soak observer sample recorded',
      payload: { service, queue, heartbeat },
      timestamp
    }));
  } catch {
    // Observation state is the primary artifact; event-history append failure is
    // reflected in the next sample through sanitized failureEvents when present.
  }
  return sample;
}
