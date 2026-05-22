import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {
  openDatabase,
  upsertFileExtraction,
  upsertFileInsight,
  upsertIndexedFile,
} from '../src/db/client.js';
import { buildWikiPages } from '../src/knowledge/knowledgeService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-wiki-content-control-test-${Date.now()}-${Math.random()}.sqlite`);
}

function seedFile(db, { fileId, filename, extractedText, summary }) {
  const now = new Date().toISOString();

  upsertIndexedFile(db, {
    id: fileId,
    filename,
    absolute_path: path.join(os.tmpdir(), filename),
    relative_path: filename,
    extension: '.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1234,
    created_at: now,
    modified_at: now,
    content_hash: `${fileId}-hash`,
    index_status: 'indexed',
    last_indexed_at: now,
    error_message: null,
  });

  upsertFileExtraction(db, {
    file_id: fileId,
    extracted_text: extractedText,
    extraction_status: 'extracted',
    extractor_name: 'test-extractor',
    extracted_at: now,
    error_message: null,
    metadata_json: '{}',
  });

  upsertFileInsight(db, {
    file_id: fileId,
    summary,
    classification: 'legal',
    entities_json: JSON.stringify({ names: ['Supplier Alpha'] }),
    provider: 'deterministic',
    status: 'generated',
    error_message: null,
    generated_at: now,
  });
}

test('wiki file pages do not use AI summaries as source-backed document body', () => {
  const db = openDatabase(tempDbPath());
  const fileId = 'content-control-no-extracted-text';
  const aiSummary = 'AI SUMMARY ONLY: This sentence must not become citation-backed document body content.';

  seedFile(db, {
    fileId,
    filename: 'No Extracted Body.pdf',
    extractedText: '',
    summary: aiSummary,
  });

  const wiki = buildWikiPages(db, { limit: 10, filePageLimit: 10 });
  const filePage = wiki.pages.find((page) => page.id === `file-${fileId}`);

  assert.equal(Boolean(filePage), true);
  assert.equal(filePage.sources[0].chunks.length, 0);
  assert.equal(filePage.summary.includes(aiSummary), false);
  assert.equal(filePage.markdown.includes('No source-backed extracted document content is available yet.'), true);
  assert.equal(filePage.markdown.includes(`Document Content\n\n${aiSummary}`), false);
  assert.equal(filePage.markdown.includes('Content control'), true);

  db.close();
});

test('wiki file pages populate document body from extracted source text when available', () => {
  const db = openDatabase(tempDbPath());
  const fileId = 'content-control-with-extracted-text';
  const sourceText = 'REAL SOURCE TEXT: Supplier Alpha payment terms are net 30 days.';
  const aiSummary = 'AI SUMMARY ONLY: This should not replace the real source text.';

  seedFile(db, {
    fileId,
    filename: 'With Extracted Body.pdf',
    extractedText: sourceText,
    summary: aiSummary,
  });

  const wiki = buildWikiPages(db, { limit: 10, filePageLimit: 10 });
  const filePage = wiki.pages.find((page) => page.id === `file-${fileId}`);

  assert.equal(Boolean(filePage), true);
  assert.equal(filePage.sources[0].chunks.length > 0, true);
  assert.equal(filePage.markdown.includes(sourceText), true);
  assert.equal(filePage.markdown.includes('source-backed extracted content'), true);
  assert.equal(filePage.summary.includes('REAL SOURCE TEXT'), true);

  db.close();
});
