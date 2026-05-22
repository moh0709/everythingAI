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
  return path.join(os.tmpdir(), `everythingai-wiki-page-metadata-test-${Date.now()}-${Math.random()}.sqlite`);
}

test('wiki source chunks include page numbers when extraction metadata provides a page map', () => {
  const db = openDatabase(tempDbPath());
  const now = new Date().toISOString();
  const fileId = 'pdf-page-map-test-file';
  const extractedText = [
    'Page one payment terms and supplier alpha content.',
    '',
    'Page two renewal clause and delivery schedule content.',
  ].join('\n');

  upsertIndexedFile(db, {
    id: fileId,
    filename: 'Supplier Alpha.pdf',
    absolute_path: path.join(os.tmpdir(), 'Supplier Alpha.pdf'),
    relative_path: 'Supplier Alpha.pdf',
    extension: '.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1234,
    created_at: now,
    modified_at: now,
    content_hash: 'pdf-page-map-content-hash',
    index_status: 'indexed',
    last_indexed_at: now,
    error_message: null,
  });

  upsertFileExtraction(db, {
    file_id: fileId,
    extracted_text: extractedText,
    extraction_status: 'extracted',
    extractor_name: 'pdf-parse',
    extracted_at: now,
    error_message: null,
    metadata_json: JSON.stringify({
      extension: '.pdf',
      page_count: 2,
      page_map: [
        { page_number: 1, char_start: 0, char_end: 48 },
        { page_number: 2, char_start: 49, char_end: extractedText.length },
      ],
    }),
  });

  upsertFileInsight(db, {
    file_id: fileId,
    summary: 'Supplier Alpha PDF contains payment terms and renewal details.',
    classification: 'legal',
    entities_json: JSON.stringify({ names: ['Supplier Alpha'] }),
    provider: 'deterministic',
    status: 'generated',
    error_message: null,
    generated_at: now,
  });

  const wiki = buildWikiPages(db, { limit: 10, filePageLimit: 10 });
  const filePage = wiki.pages.find((page) => page.id === `file-${fileId}`);
  const chunks = filePage.sources[0].chunks;

  assert.equal(Boolean(filePage), true);
  assert.equal(chunks.some((chunk) => chunk.page_number === 1), true);
  assert.equal(chunks.some((chunk) => chunk.location.includes('page 1')), true);
  assert.equal(filePage.markdown.includes('page 1'), true);

  db.close();
});
