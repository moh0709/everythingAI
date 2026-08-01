import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule() {
  const source = await readFile(new URL('./extractedTextPreviewModel.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(compiled)}`;
  return import(url);
}

const model = await loadModule();

test('buildExtractedTextPreviewModel treats numbered report sections as headings', () => {
  const preview = model.buildExtractedTextPreviewModel([
    '1. Executive Summary',
    'This report covers Q3 results.',
    '',
    '2. Revenue Drivers',
    'Recurring revenue improved.',
  ].join('\n'));

  assert.equal(preview.blocks[0].type, 'heading');
  assert.equal(preview.blocks[0].text, '1. Executive Summary');
  assert.equal(preview.blocks[2].type, 'heading');
  assert.equal(preview.blocks[2].text, '2. Revenue Drivers');
  assert.equal(preview.truncated, false);
});

test('buildExtractedTextPreviewModel groups unicode bullet lists and table-like rows', () => {
  const preview = model.buildExtractedTextPreviewModel([
    'Findings',
    '\u2022 First extracted point',
    '\u2022 Second extracted point',
    '',
    'Metric    Value    Owner',
    'Accuracy  92%      QA',
  ].join('\n'));

  assert.deepEqual(preview.blocks.map((block) => block.type), ['heading', 'list', 'table']);
  assert.deepEqual(preview.blocks[1].items, ['First extracted point', 'Second extracted point']);
  assert.deepEqual(preview.blocks[2].rows[0], ['Metric', 'Value', 'Owner']);
});
