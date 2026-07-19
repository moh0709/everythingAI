#!/usr/bin/env node
/**
 * Deterministic, bounded retry policy for Hermes runtime operations.
 *
 * This module is deliberately passive: callers decide when to invoke an
 * operation and must identify whether it is idempotent or live-revalidated.
 * It never retries GitHub/Git mutations by itself.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const FAILURE_CLASSES = Object.freeze({
  TRANSIENT: 'TRANSIENT',
  PERMANENT: 'PERMANENT',
  CLAIM_CONFLICT: 'CLAIM_CONFLICT',
  VALIDATION_FAILURE: 'VALIDATION_FAILURE',
  OPERATOR_ACTION_REQUIRED: 'OPERATOR_ACTION_REQUIRED',
  UNKNOWN: 'UNKNOWN'
});

export const DEFAULT_RETRY_CONFIG = Object.freeze({
  maxAttempts: 3,
  initialBackoffMs: 1_000,
  maxBackoffMs: 30_000,
  totalTimeCeilingMs: 120_000,
  jitterRatio: 0
});

const RETRYABLE_CLASSES = new Set([FAILURE_CLASSES.TRANSIENT, FAILURE_CLASSES.CLAIM_CONFLICT]);

export function classifyFailure(error = {}) {
  const explicit = String(error.failureClass ?? error.classification ?? '').toUpperCase();
  if (Object.values(FAILURE_CLASSES).includes(explicit)) return explicit;
  const code = String(error.code ?? error.result ?? '').toUpperCase();
  if (code.includes('CLAIM') && code.includes('CONFLICT')) return FAILURE_CLASSES.CLAIM_CONFLICT;
  if (['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', '429', '502', '503', '504'].includes(code)) {
    return FAILURE_CLASSES.TRANSIENT;
  }
  if (error.validation === true) return FAILURE_CLASSES.VALIDATION_FAILURE;
  if (error.operatorActionRequired === true) return FAILURE_CLASSES.OPERATOR_ACTION_REQUIRED;
  if (error.permanent === true) return FAILURE_CLASSES.PERMANENT;
  return FAILURE_CLASSES.UNKNOWN;
}

function normalizedConfig(config = {}) {
  const merged = { ...DEFAULT_RETRY_CONFIG, ...config };
  for (const key of ['maxAttempts', 'initialBackoffMs', 'maxBackoffMs', 'totalTimeCeilingMs', 'jitterRatio']) {
    if (!Number.isFinite(merged[key]) || merged[key] < 0) throw new TypeError(`invalid retry config: ${key}`);
  }
  if (!Number.isInteger(merged.maxAttempts) || merged.maxAttempts < 1) {
    throw new TypeError('invalid retry config: maxAttempts must be a positive integer');
  }
  if (merged.jitterRatio > 1) throw new TypeError('invalid retry config: jitterRatio must be <= 1');
  return merged;
}

export function isRetryAllowed({ failureClass, idempotent = false, revalidate = false } = {}) {
  return RETRYABLE_CLASSES.has(failureClass) && (idempotent || revalidate);
}

export function calculateBackoff(attempt, config = {}, random = Math.random) {
  const policy = normalizedConfig(config);
  const exponent = Math.max(0, Number(attempt) - 1);
  const base = Math.min(policy.maxBackoffMs, policy.initialBackoffMs * (2 ** exponent));
  const jitter = policy.jitterRatio === 0 ? 0 : ((random() * 2) - 1) * policy.jitterRatio * base;
  return Math.max(0, Math.round(base + jitter));
}

export function nextRetry({ state = {}, failure, now = () => new Date(), config = {}, random = Math.random, idempotent = false, revalidate = false } = {}) {
  const policy = normalizedConfig(config);
  const failureClass = classifyFailure(failure);
  const attempt = Number(state.attempt ?? 0) + 1;
  const evidence = String(failure?.evidence ?? failure?.message ?? failure?.error ?? 'failure observed');
  const base = { attempt, failureClass, lastEvidence: evidence, updatedAt: now().toISOString() };

  if (!isRetryAllowed({ failureClass, idempotent, revalidate })) {
    return { ...base, retry: false, terminal: true, reason: 'failure is not safely retryable' };
  }
  const delayMs = calculateBackoff(attempt, policy, random);
  const startedAtMs = Number.isFinite(state.startedAtMs) ? state.startedAtMs : now().getTime();
  const ceilingExceeded = now().getTime() - startedAtMs + delayMs > policy.totalTimeCeilingMs;
  if (attempt > policy.maxAttempts || ceilingExceeded) {
    return { ...base, startedAtMs, retry: false, terminal: true, reason: attempt > policy.maxAttempts ? 'maximum attempts exhausted' : 'total retry time ceiling exceeded' };
  }
  return { ...base, startedAtMs, nextRetryAt: new Date(now().getTime() + delayMs).toISOString(), delayMs, retry: true, terminal: false };
}

export function resetRetryState(state = {}) {
  const next = { ...state };
  delete next.attempt;
  delete next.nextRetryAt;
  delete next.failureClass;
  delete next.lastEvidence;
  delete next.startedAtMs;
  delete next.updatedAt;
  delete next.delayMs;
  delete next.retry;
  delete next.terminal;
  delete next.reason;
  return next;
}

export function readRetryState(statePath) {
  if (!existsSync(statePath)) return null;
  try { return JSON.parse(readFileSync(statePath, 'utf8')).retry ?? null; } catch { return null; }
}

export function persistRetryState(statePath, retryState) {
  mkdirSync(dirname(statePath), { recursive: true });
  const current = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  const tmpPath = `${statePath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify({ ...current, retry: retryState }, null, 2)}\n`);
  renameSync(tmpPath, statePath);
  return retryState;
}