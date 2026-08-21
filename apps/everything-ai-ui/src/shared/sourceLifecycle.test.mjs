import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule() {
  const source = await readFile(new URL('./sourceLifecycle.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(compiled)}`);
}

const lifecycle = await loadModule();

const cases = [
  [{}, 'intake'],
  [{ index_status: 'queued' }, 'indexing'],
  [{ index_status: 'indexed' }, 'extracting'],
  [{ index_status: 'indexed', extraction_status: 'extracted' }, 'ready'],
  [{ index_status: 'indexed', extraction_status: 'unsupported' }, 'unsupported'],
  [{ index_status: 'indexed', extraction_status: 'failed' }, 'extraction_failed'],
  [{ index_status: 'failed' }, 'index_failed'],
];

test('deriveSourceLifecycle covers every lifecycle state', () => {
  for (const [file, expectedState] of cases) {
    assert.equal(lifecycle.deriveSourceLifecycle(file).state, expectedState);
  }
});

test('failure and terminal-state precedence is deterministic for conflicting records', () => {
  assert.equal(lifecycle.deriveSourceLifecycle({
    index_status: 'failed',
    extraction_status: 'extracted',
  }).state, 'index_failed');
  assert.equal(lifecycle.deriveSourceLifecycle({
    index_status: 'indexed',
    extraction_status: 'failed',
  }).state, 'extraction_failed');
  assert.equal(lifecycle.deriveSourceLifecycle({
    index_status: 'indexed',
    extraction_status: 'unsupported',
  }).state, 'unsupported');
});

test('per-file retry is not offered because the backend only supports source-root re-scan', () => {
  assert.equal(lifecycle.deriveSourceLifecycle({ index_status: 'failed' }).recoveryAction, null);
  assert.equal(lifecycle.deriveSourceLifecycle({
    index_status: 'indexed',
    extraction_status: 'failed',
  }).recoveryAction, null);
});
