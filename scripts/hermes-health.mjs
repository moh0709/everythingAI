#!/usr/bin/env node
/** Read-only Hermes runtime health and durable-history metrics snapshot. */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readHistory, redactPayload } from '../src/event-history.js';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const pathsForRoot = (root) => Object.freeze({
  state: resolve(root, '.hermes/state.json'),
  heartbeat: resolve(root, '.hermes/runtime/heartbeat.json'),
  claimLock: resolve(root, '.hermes/claim.lock'),
  supervisorLock: resolve(root, '.hermes/supervisor.lock'),
  retry: resolve(root, '.hermes/retry.json'),
  history: resolve(root, '.hermes/runtime/events.ndjson'),
  reports: resolve(root, 'REPORTS')
});
const PATHS = pathsForRoot(ROOT);
const HEALTH_STATES = Object.freeze(['HEALTHY', 'DEGRADED', 'BLOCKED', 'STALE', 'STOPPED', 'UNKNOWN']);
const safeValue = (value) => redactPayload({ value }).value;

function safeJson(path, now = () => Date.now()) {
  if (!existsSync(path)) return { present: false, value: null, error: null, ageMs: null };
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    const ageMs = Math.max(0, Math.round(now() - statSync(path).mtimeMs));
    return { present: true, value, error: null, ageMs };
  } catch (error) {
    return { present: true, value: null, error: 'invalid JSON', ageMs: null };
  }
}

function ageFromTimestamp(value, now = () => Date.now()) {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? Math.max(0, now() - parsed) : null;
}

function readHistorySnapshot(path) {
  if (!existsSync(path)) return { present: false, records: [], error: null };
  try { return { present: true, records: readHistory(path), error: null }; }
  catch { return { present: true, records: [], error: 'corrupt event history' }; }
}

function readAllHistory(path) {
  const files = [];
  if (existsSync(path)) files.push(path);
  const dir = resolve(path, '..');
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) if (name.startsWith('events.') && name !== 'events.ndjson' && name.endsWith('.ndjson')) files.push(resolve(dir, name));
  }
  return files.sort().map(readHistorySnapshot);
}

function metrics(snapshots) {
  const counts = { discovered: 0, claimed: 0, completed: 0, blocked: 0, failed: 0, recovered: 0, retried: 0 };
  for (const snapshot of snapshots) for (const event of snapshot.records) {
    if (event.type === 'discovery') counts.discovered += 1;
    if (event.type === 'claim' || event.type === 'start') counts.claimed += 1;
    if (event.type === 'completion') counts.completed += 1;
    if (event.type === 'block') counts.blocked += 1;
    if (event.type === 'recovery') counts.recovered += 1;
    if (event.type === 'retry') counts.retried += 1;
    if (event.resultCode && ['FAIL', 'FAILED', 'ERROR'].includes(String(event.resultCode).toUpperCase())) counts.failed += 1;
  }
  return counts;
}

function queueSnapshot(root = ROOT) {
  const result = spawnSync('gh', ['issue', 'list', '--repo', 'moh0709/everythingAI', '--state', 'open', '--label', 'pm:ready', '--label', 'hermes:ready', '--limit', '100', '--json', 'number,title'], { cwd: root, encoding: 'utf8', timeout: 10000 });
  if (result.status !== 0) return { available: false, ready: null };
  try { return { available: true, ready: JSON.parse(result.stdout).length }; } catch { return { available: false, ready: null }; }
}

function safeQueue(queue) {
  try {
    const value = queue();
    return value && typeof value === 'object' && typeof value.available === 'boolean'
      ? { available: value.available, ready: Number.isInteger(value.ready) ? value.ready : null }
      : { available: false, ready: null };
  } catch {
    return { available: false, ready: null };
  }
}

export function inspectHealth({ paths = PATHS, now = () => Date.now(), queue = queueSnapshot } = {}) {
  const state = safeJson(paths.state, now);
  const heartbeat = safeJson(paths.heartbeat, now);
  const claimLock = safeJson(paths.claimLock, now);
  const supervisorLock = safeJson(paths.supervisorLock, now);
  const retry = safeJson(paths.retry, now);
  const history = readAllHistory(paths.history);
  const allRecords = history.flatMap((item) => item.records)
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const byTime = Date.parse(left.event.timestamp) - Date.parse(right.event.timestamp);
      return Number.isNaN(byTime) || byTime === 0 ? left.index - right.index : byTime;
    })
    .map(({ event }) => event);
  const heartbeatAgeMs = heartbeat.value ? (() => { const at = Date.parse(heartbeat.value.lastHeartbeat ?? ''); return Number.isFinite(at) ? Math.max(0, now() - at) : null; })() : null;
  const retryState = (retry.value?.retry && typeof retry.value.retry === 'object') ? retry.value.retry : retry.value ?? state.value?.retry ?? null;
  const lockAge = (item) => item.value?.createdAt ? ageFromTimestamp(item.value.createdAt, now) : item.ageMs;
  const historyCorrupt = history.some((item) => item.error);
  const artifactCorrupt = Boolean(state.error || heartbeat.error || claimLock.error || supervisorLock.error || retry.error || historyCorrupt);
  let status = 'UNKNOWN';
  // Total precedence (highest first): corrupt data, terminal/block, no heartbeat,
  // stale heartbeat, clean stop, active retry/lock, healthy.
  if (artifactCorrupt) status = 'DEGRADED';
  else if (state.value?.result === 'BLOCKED' || state.value?.status === 'BLOCKED' || retryState?.terminal === true) status = 'BLOCKED';
  else if (!heartbeat.value) status = 'UNKNOWN';
  else if (heartbeatAgeMs === null || heartbeatAgeMs > 120000) status = 'STALE';
  else if (heartbeat.value.lastResult === 'STOPPED' || heartbeat.value.mode === 'IDLE') status = 'STOPPED';
  else if (retryState?.retry === true || claimLock.value || supervisorLock.value) status = 'DEGRADED';
  else status = 'HEALTHY';
  return {
    status: HEALTH_STATES.includes(status) ? status : 'UNKNOWN',
    readOnly: true,
    generatedAt: new Date(now()).toISOString(),
    queue: safeQueue(queue),
    currentTask: safeValue(state.value?.currentTask ?? heartbeat.value?.currentTask ?? null),
    currentIssue: safeValue(state.value?.currentIssue ?? heartbeat.value?.currentIssue ?? null),
    lastCompletedTask: allRecords.filter((event) => event.type === 'completion').at(-1)?.taskId ?? null,
    lastFailure: safeValue(allRecords.filter((event) => event.resultCode && ['FAIL', 'FAILED', 'ERROR'].includes(String(event.resultCode).toUpperCase())).at(-1)?.validationSummary ?? null),
    heartbeat: { present: heartbeat.present, ageMs: heartbeatAgeMs, mode: heartbeat.value?.mode ?? null, lastResult: heartbeat.value?.lastResult ?? null },
    locks: { claim: { present: claimLock.present, ageMs: lockAge(claimLock) }, supervisor: { present: supervisorLock.present, ageMs: lockAge(supervisorLock) } },
    retry: retryState ? { attempt: retryState.attempt ?? null, retry: retryState.retry ?? null, terminal: retryState.terminal ?? null, failureClass: safeValue(retryState.failureClass ?? null) } : null,
    metrics: metrics(history),
    artifacts: { state: state.present, heartbeat: heartbeat.present, history: history.some((item) => item.present), corrupt: artifactCorrupt }
  };
}

export function formatHuman(snapshot) {
  return [`Hermes health: ${snapshot.status}`, `Queue ready: ${snapshot.queue.ready ?? 'unknown'}`, `Current task: ${snapshot.currentTask ?? 'none'}`, `Last completed: ${snapshot.lastCompletedTask ?? 'none'}`, `Heartbeat age: ${snapshot.heartbeat.ageMs == null ? 'unknown' : `${Math.round(snapshot.heartbeat.ageMs / 1000)}s`}`, `Retry: ${snapshot.retry ? `${snapshot.retry.failureClass ?? 'unknown'} attempt ${snapshot.retry.attempt ?? '?'}` : 'none'}`, `Metrics: ${Object.entries(snapshot.metrics).map(([key, value]) => `${key}=${value}`).join(', ')}`].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootFlag = process.argv.indexOf('--root');
  const requestedRoot = rootFlag >= 0 && process.argv[rootFlag + 1] ? resolve(process.argv[rootFlag + 1]) : ROOT;
  const snapshot = inspectHealth({ paths: pathsForRoot(requestedRoot), queue: () => queueSnapshot(requestedRoot) });
  process.stdout.write(process.argv.includes('--json') ? `${JSON.stringify(snapshot, null, 2)}\n` : `${formatHuman(snapshot)}\n`);
  process.exitCode = snapshot.status === 'HEALTHY' ? 0 : 1;
}