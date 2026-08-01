import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule() {
  const source = await readFile(new URL('./appUiLogic.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(compiled)}`;
  return import(url);
}

const logic = await loadModule();

test('UserApp delegates the ask workflow to useAskWorkflows', async () => {
  const source = await readFile(new URL('./UserApp.tsx', import.meta.url), 'utf8');

  assert.match(source, /import \{ useAskWorkflows \} from '\.\/user\/useAskWorkflows';/);
  assert.match(source, /const \{ askQuestion, handleChatSubmit \} = useAskWorkflows\(/);
  assert.doesNotMatch(source, /async function askQuestion/);
});

test('calculateAiConfidence averages positive finite backend suggestion confidence', () => {
  assert.equal(
    logic.calculateAiConfidence([
      { confidence: 0.9 },
      { confidence: '0.5' },
      { confidence: 0 },
      { confidence: Number.NaN },
      { confidence: undefined },
    ]),
    '70%',
  );
});

test('calculateAiConfidence reports no plan when backend confidence values are unavailable', () => {
  assert.equal(logic.calculateAiConfidence([{ confidence: 0 }, { confidence: null }]), 'No plan yet');
});

test('filterFiles applies extension, index status, and extraction status together', () => {
  const files = [
    { id: '1', extension: 'pdf', index_status: 'indexed', extraction_status: 'extracted' },
    { id: '2', extension: 'txt', index_status: 'indexed', extraction_status: 'pending' },
    { id: '3', extension: 'pdf', index_status: 'queued', extraction_status: 'extracted' },
  ];

  assert.deepEqual(
    logic.filterFiles(files, { extension: 'pdf', indexStatus: 'indexed', extractionStatus: 'extracted' }).map((file) => file.id),
    ['1'],
  );
});

test('getFileTags derives tags from file state and loaded insight preview', () => {
  const tags = logic.getFileTags(
    {
      extension: 'PDF',
      index_status: 'indexed',
      extraction_status: 'extracted',
      size_bytes: 12 * 1024 * 1024,
    },
    { classification: 'Invoice' },
  );

  assert.deepEqual(tags, ['pdf', 'indexed', 'extracted', 'invoice', 'large file']);
});

test('normalizeFilePreview supports preview endpoint fields and nested metadata', () => {
  assert.deepEqual(
    logic.normalizeFilePreview({
      previewText: 'Preview text',
      insight: { summary: 'Summary', classification: 'Report' },
      metadata: { pages: 4 },
    }),
    {
      previewText: 'Preview text',
      summary: 'Summary',
      classification: 'Report',
      metadata: { pages: 4 },
    },
  );
});
