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
const SECRET_VALUE = /(?:^|\b)(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|https?:\/\/[^\s/@]+:[^\s/@]+@|\b(?:AWS_SECRET_ACCESS_KEY|(?:API|ACCESS|AUTH|PRIVATE|CLIENT)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET)|PASSWORD)\s*=\s*[^\s,;]+|\b(?:gh[pousr]_\w{20,}|sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/i;
const REDACTED = '[REDACTED]';
const DEFAULTS = Object.freeze({ maxBytes: 5 * 1024 * 1024, retainFiles: 3, maxPayloadBytes: 16 * 1024 });

function sanitize(value, depth = 0) {
  if (depth > 8) return '[TRUNCATED]';
  if (typeof value === 'string') {
    if (SECRET_VALUE.test(value)) return REDACTED;
    return value.length > 4096 ? `${value.slice(0, 4096)}[TRUNCATED]` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) result[key] = SECRET_KEY.test(key) ? REDACTED : sanitize(item, depth + 1);
    return result;
  }
  return value;
}

export function redactPayload(payload) { return sanitize(payload); }

export class HistoryCorruptionError extends Error {
  constructor(lineNumber, cause = 'invalid record') {
    super(`corrupt event history at line ${lineNumber}: ${cause}`);
    this.name = 'HistoryCorruptionError';
    this.lineNumber = lineNumber;
  }
}

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

function rotateIfNeeded(historyPath, config, fsOps) {
  if (!fsOps.existsSync(historyPath) || fsOps.statSync(historyPath).size < config.maxBytes) return;
  const dir = dirname(historyPath);
  const base = historyPath.endsWith('.ndjson') ? historyPath.slice(0, -7) : historyPath;
  const rotated = `${base}.${new Date().toISOString().replaceAll(':', '-')}.${process.pid}.${randomUUID()}.ndjson`;
  // Rename is deliberately performed before the append. If it fails, the active
  // file remains untouched and the append fails rather than risking data loss.
  fsOps.renameSync(historyPath, rotated);
  return { dir, base, rotated };
}

export function appendEvent(historyPath, event, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const fsOps = { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, ...options.fsOps };
  validateEvent(event);
  const line = `${JSON.stringify(event)}\n`;
  if (Buffer.byteLength(line) > config.maxPayloadBytes) throw new RangeError('event exceeds max payload size');
  fsOps.mkdirSync(dirname(historyPath), { recursive: true });
  const rotation = rotateIfNeeded(historyPath, config, fsOps);
  appendFileSync(historyPath, line, { encoding: 'utf8', flag: 'a' });
  if (rotation) {
    const files = fsOps.readdirSync(rotation.dir)
      .filter((name) => name.startsWith(`${rotation.base.split('/').pop()}.`) && name.endsWith('.ndjson'))
      .sort().reverse();
    // Retention errors are surfaced after the new active record is safely
    // appended, so neither the active file nor the complete rotated file is lost.
    for (const old of files.slice(config.retainFiles)) fsOps.unlinkSync(join(rotation.dir, old));
  }
  return event;
}

export function readHistory(historyPath) {
  if (!existsSync(historyPath)) return [];
  const records = [];
  const content = readFileSync(historyPath, 'utf8');
  const lines = content.split('\n');
  const endsWithLineTerminator = content.endsWith('\n') || content.endsWith('\r');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const lineNumber = index + 1;
    let event;
    try { event = JSON.parse(line); } catch {
      const isFinalFragment = index === lines.length - 1 && !endsWithLineTerminator;
      if (isFinalFragment) continue; // A crashed append may leave only its final fragment partial.
      throw new HistoryCorruptionError(lineNumber, 'malformed JSON');
    }
    try { validateEvent(event); } catch (error) {
      const reason = error instanceof TypeError && error.message === 'unsupported event schema version'
        ? 'unsupported event schema version' : 'schema validation failed';
      throw new HistoryCorruptionError(lineNumber, reason);
    }
    records.push(event);
  }
  return records;
}

export function historyDefaults() { return { ...DEFAULTS }; }
