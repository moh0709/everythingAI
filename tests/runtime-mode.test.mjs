import test from 'node:test';
import assert from 'node:assert/strict';
import { detectRuntimeMode, RUNTIME_MODES } from '../src/runtime-mode.js';

test('CLI mode polling returns POLLING', () => {
  const result = detectRuntimeMode({ argv: ['--mode', 'polling'] });
  assert.equal(result.mode, RUNTIME_MODES.POLLING);
  assert.match(result.evidence.join(' | '), /--mode=polling/);
});

test('CLI mode webhook returns WEBHOOK', () => {
  const result = detectRuntimeMode({ argv: ['--mode=webhook'] });
  assert.equal(result.mode, RUNTIME_MODES.WEBHOOK);
  assert.match(result.evidence.join(' | '), /--mode=webhook/);
});

test('CLI and environment agree on the same mode', () => {
  const result = detectRuntimeMode({
    argv: ['--mode', 'polling'],
    env: { HERMES_RUNTIME_MODE: 'polling' }
  });

  assert.equal(result.mode, RUNTIME_MODES.POLLING);
  assert.match(result.source, /--mode/);
  assert.match(result.source, /HERMES_RUNTIME_MODE/);
});

test('invalid CLI mode returns UNKNOWN', () => {
  const result = detectRuntimeMode({ argv: ['--mode', 'banana'] });
  assert.equal(result.mode, RUNTIME_MODES.UNKNOWN);
  assert.match(result.remediation, /polling or webhook/i);
});

test('no explicit mode returns UNKNOWN', () => {
  const result = detectRuntimeMode({ env: {}, argv: [] });
  assert.equal(result.mode, RUNTIME_MODES.UNKNOWN);
  assert.match(result.remediation, /--mode polling or --mode webhook/i);
});
