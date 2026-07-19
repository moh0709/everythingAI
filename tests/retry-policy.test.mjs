import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FAILURE_CLASSES, classifyFailure, isRetryAllowed, calculateBackoff,
  nextRetry, resetRetryState, persistRetryState, readRetryState
} from '../src/retry-policy.js';

const now = () => new Date('2026-07-19T00:00:00.000Z');

test('classifies explicit, transport, claim, validation, and unknown failures', () => {
  assert.equal(classifyFailure({ failureClass: 'transient' }), FAILURE_CLASSES.TRANSIENT);
  assert.equal(classifyFailure({ code: 'ETIMEDOUT' }), FAILURE_CLASSES.TRANSIENT);
  assert.equal(classifyFailure({ result: 'CLAIM_CONFLICT' }), FAILURE_CLASSES.CLAIM_CONFLICT);
  assert.equal(classifyFailure({ validation: true }), FAILURE_CLASSES.VALIDATION_FAILURE);
  assert.equal(classifyFailure({}), FAILURE_CLASSES.UNKNOWN);
});

test('only idempotent or live-revalidated operations can retry', () => {
  assert.equal(isRetryAllowed({ failureClass: FAILURE_CLASSES.TRANSIENT }), false);
  assert.equal(isRetryAllowed({ failureClass: FAILURE_CLASSES.TRANSIENT, idempotent: true }), true);
  assert.equal(isRetryAllowed({ failureClass: FAILURE_CLASSES.CLAIM_CONFLICT, revalidate: true }), true);
  assert.equal(isRetryAllowed({ failureClass: FAILURE_CLASSES.PERMANENT, idempotent: true }), false);
});

test('backoff is bounded and deterministic without jitter', () => {
  const config = { initialBackoffMs: 100, maxBackoffMs: 250, jitterRatio: 0 };
  assert.equal(calculateBackoff(1, config), 100);
  assert.equal(calculateBackoff(2, config), 200);
  assert.equal(calculateBackoff(3, config), 250);
});

test('transient failure retries, then exhausts attempts', () => {
  const config = { maxAttempts: 2, initialBackoffMs: 100, totalTimeCeilingMs: 10_000 };
  const first = nextRetry({ failure: { code: 'ETIMEDOUT', evidence: 'network timeout' }, now, config, idempotent: true });
  assert.equal(first.retry, true);
  assert.equal(first.attempt, 1);
  const second = nextRetry({ state: first, failure: { code: 'ETIMEDOUT' }, now, config, idempotent: true });
  assert.equal(second.retry, true);
  const exhausted = nextRetry({ state: second, failure: { code: 'ETIMEDOUT' }, now, config, idempotent: true });
  assert.equal(exhausted.retry, false);
  assert.match(exhausted.reason, /exhausted/);
});

test('permanent, validation, and ambiguous mutations terminate without retry', () => {
  for (const failure of [{ permanent: true }, { validation: true }, { code: 'GIT_PUSH_FAILED' }]) {
    const result = nextRetry({ failure, now, idempotent: true });
    assert.equal(result.retry, false);
    assert.equal(result.terminal, true);
  }
  const mutation = nextRetry({ failure: { code: 'ETIMEDOUT' }, now, idempotent: false });
  assert.equal(mutation.retry, false);
});

test('retry state persists, survives restart, and resets after success', () => {
  const dir = mkdtempSync(join(tmpdir(), 'retry-policy-test-'));
  const path = join(dir, 'state.json');
  writeFileSync(path, JSON.stringify({ currentTask: 'EAI-TASK-042' }));
  const state = nextRetry({ failure: { code: 'ETIMEDOUT' }, now, idempotent: true });
  persistRetryState(path, state);
  assert.deepEqual(readRetryState(path), state);
  assert.deepEqual(resetRetryState(state), {});
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).currentTask, 'EAI-TASK-042');
});