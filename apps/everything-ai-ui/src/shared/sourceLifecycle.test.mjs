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
  const indexFailure = lifecycle.deriveSourceLifecycle({ index_status: 'failed' });
  const extractionFailure = lifecycle.deriveSourceLifecycle({
    index_status: 'indexed',
    extraction_status: 'failed',
  });

  assert.equal(indexFailure.recoveryAction, null);
  assert.equal(extractionFailure.recoveryAction, null);
  assert.equal(indexFailure.recoveryTarget, 'source_root');
  assert.equal(extractionFailure.recoveryTarget, 'source_root');
  assert.equal(lifecycle.deriveSourceLifecycle({
    index_status: 'indexed',
    extraction_status: 'extracted',
  }).recoveryTarget, null);
  assert.equal(lifecycle.deriveSourceLifecycle({
    index_status: 'failed',
    index_error_message: 'Context API index failure.',
  }).detail, 'Context API index failure.');
});

test('Client and Admin explorers use the unified lifecycle and source-root recovery navigation', async () => {
  const client = await readFile(new URL('../user/ExploreView.tsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../admin/components/ExplorerView.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./sourceLifecycle.css', import.meta.url), 'utf8');

  for (const source of [client, admin]) {
    assert.match(source, /deriveSourceLifecycle/);
    assert.match(source, /Open source recovery/);
    assert.match(source, /aria-describedby="source-recovery-explanation"/);
    assert.match(source, /className="file-select-button"/);
    assert.doesNotMatch(source, /Index: \{file\.index_status/);
    assert.doesNotMatch(source, /Extract: \{file\.extraction_status/);
  }

  assert.match(styles, /\.source-lifecycle\s*\{/);
  assert.match(styles, /\.source-lifecycle-(?:index_failed|extraction_failed)/);
  assert.match(admin, /className="explorer-table-scroll"/);
  assert.match(styles, /\.explorer-table-scroll\s*\{/);
  assert.match(styles, /\.explorer-search\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /\.file-select-button\s*\{/);
});
