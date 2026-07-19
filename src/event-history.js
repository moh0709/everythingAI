#!/usr/bin/env node
/** Versioned, append-only Hermes operational event history. */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const HISTORY_SCHEMA_VERSION = 1;
export const HISTORY_EVENTS = Object.freeze([
  'discovery', 'claim', 'start', 'validation', 'retry', 'completion', 'block', 'recovery', 'shutdown'
]);
const SECRET_KEY = /(token|secret|password|passwd|api[-_]?key|authorization|cookie|credential|env|environment)/i;
const REDACTED = '[REDACTED]';
const DEFAULTS = Object.freeze({ maxBytes: 5 * 1024 * 1024, retainFiles: 3, maxPayloadBytes: 16 * 1024 });

function sanitize(value, depth = 0) {
  if (depth > 8) return '[TRUNCATED]';
  if (typeof value === 'string') return value.length > 4096 ? `${value.slice(0, 4096)}[TRUNCATED]` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) result[key] = SECRET_KEY.test(key) ? REDACTED : sanitize(item, depth + 1);
    return result;
  }
  return value;
}

export function redactPayload(payload) { return sanitize(payload); }

export function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('event must be an object');
  if (event.schemaVersion !== HISTORY_SCHEMA_VERSION) throw new TypeError('unsupported event schema version');
  if (!HISTORY_EVENTS.includes(event.type)) throw new TypeError('invalid event type');
  for (const field of ['timestamp', 'correlationId']) {
    if (typeof event[field] !== 'string' || !event[field]) throw new TypeError(`event ${field} is required`);
  }
  if (!Number.isInteger(event.issueNumber) || event.issueNumber < 1) throw new TypeError('event issueNumber must be a positive integer');
  if (typeof event.taskId !== 'string' || !/^EAI-TASK-\d+[A-Z]?$/.test(event.taskId)) throw new TypeError('event taskId is required');
  return true;
}

export function createEvent({ type, issueNumber, taskId, correlationId = randomUUID(), timestamp = new Date().toISOString(), resultCode = null, commitSha = null, validationSummary = null, payload = {} } = {}) {
  const event = { schemaVersion: HISTORY_SCHEMA_VERSION, type, timestamp, correlationId, issueNumber, taskId, resultCode, commitSha, validationSummary, payload: redactPayload(payload) };
  validateEvent(event);
  return event;
}

function rotateIfNeeded(historyPath, config) {
  if (!existsSync(historyPath) || statSync(historyPath).size < config.maxBytes) return;
  const dir = dirname(historyPath);
  const base = historyPath.endsWith('.ndjson') ? historyPath.slice(0, -7) : historyPath;
  const rotated = `${base}.${new Date().toISOString().replaceAll(':', '-')}.${process.pid}.${randomUUID()}.ndjson`;
  renameSync(historyPath, rotated);
  const files = readdirSync(dir).filter((name) => name.startsWith(`${base.split('/').pop()}.`) && name.endsWith('.ndjson')).sort().reverse();
  for (const old of files.slice(config.retainFiles)) { try { unlinkSync(join(dir, old)); } catch {} }
}

export function appendEvent(historyPath, event, options = {}) {
  const config = { ...DEFAULTS, ...options };
  validateEvent(event);
  const line = `${JSON.stringify(event)}\n`;
  if (Buffer.byteLength(line) > config.maxPayloadBytes) throw new RangeError('event exceeds max payload size');
  mkdirSync(dirname(historyPath), { recursive: true });
  rotateIfNeeded(historyPath, config);
  appendFileSync(historyPath, line, { encoding: 'utf8', flag: 'a' });
  return event;
}

export function readHistory(historyPath) {
  if (!existsSync(historyPath)) return [];
  const records = [];
  for (const line of readFileSync(historyPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const event = JSON.parse(line); if (validateEvent(event)) records.push(event); } catch { /* tolerate corrupt or partial records */ }
  }
  return records;
}

export function historyDefaults() { return { ...DEFAULTS }; }
