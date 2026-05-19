import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { openDatabase, upsertIndexedFile } from '../src/db/client.js';
import {
  getPersistedWikiChunkByRef,
  getPersistedWikiPageBySlug,
  getPersistedWikiPageEvidence,
  listPersistedWikiPages,
  persistWikiPages,
  recordWikiRebuild,
} from '../src/db/wikiRepository.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-wiki-repository-test-${Date.now()}-${Math.random()}.sqlite`);
}

function insertSourceFile(db) {
  upsertIndexedFile(db, {
    id: 'file-alpha',
    filename: 'Alpha Notes.md',
    absolute_path: 'C:\\EverythingAI\\Alpha Notes.md',
    relative_path: 'Alpha Notes.md',
    extension: '.md',
    mime_type: 'text/markdown',
    size_bytes: 128,
    created_at: '2026-05-19T00:00:00.000Z',
    modified_at: '2026-05-19T00:00:00.000Z',
    content_hash: 'alpha-content-hash',
    index_status: 'indexed',
    last_indexed_at: '2026-05-19T00:00:00.000Z',
    error_message: null,
  });
}

test('persists durable wiki pages, sections, sources, chunks, relations, and rebuild records', () => {
  const db = openDatabase(tempDbPath());
  insertSourceFile(db);

  const wiki = {
    generated_at: '2026-05-19T12:00:00.000Z',
    pages: [
      {
        id: 'category-legal',
        slug: 'category-legal',
        title: 'Legal & Compliance',
        page_type: 'category',
        category: 'Legal & Compliance',
        subcategory: 'Category Landing Page',
        summary: 'Legal category page.',
        markdown: '# Legal & Compliance\n\n## Documents\n\nLegal source overview.',
        sources: [],
        related_pages: [],
      },
      {
        id: 'workspace-overview',
        slug: 'workspace-overview',
        title: 'Workspace Overview',
        page_type: 'system',
        category: 'Filebase Intelligence',
        subcategory: 'Workspace Summary',
        summary: 'Workspace page with source-backed evidence.',
        markdown: '# Workspace Overview\n\n## Evidence\n\nAlpha source content **[S1:C1]**',
        sources: [
          {
            ref: 'S1',
            file_id: 'file-alpha',
            filename: 'Alpha Notes.md',
            absolute_path: 'C:\\EverythingAI\\Alpha Notes.md',
            relative_path: 'Alpha Notes.md',
            location: 'extracted document content',
            evidence: 'Alpha source evidence.',
            chunks: [
              {
                ref: 'S1:C1',
                source_ref: 'S1',
                chunk_number: 1,
                line_start: 1,
                line_end: 2,
                char_start: 0,
                char_end: 42,
                location: 'chunk 1, lines 1-2',
                heading: false,
                text: 'Alpha source content',
                evidence: 'Alpha source content',
              },
            ],
          },
        ],
        related_pages: [
          { id: 'category-legal', title: 'Legal & Compliance', slug: 'category-legal' },
        ],
      },
    ],
  };

  const persisted = persistWikiPages(db, wiki);
  const listed = listPersistedWikiPages(db);
  const bySlug = getPersistedWikiPageBySlug(db, 'workspace-overview');
  const evidence = getPersistedWikiPageEvidence(db, 'workspace-overview');
  const chunk = getPersistedWikiChunkByRef(db, {
    pageId: 'workspace-overview',
    chunkRef: 'S1:C1',
  });
  const rebuild = recordWikiRebuild(db, {
    id: 'wiki-rebuild-test',
    mode: 'full',
    status: 'completed',
    input: { reason: 'test' },
    summary: { page_count: persisted.page_count },
    startedAt: '2026-05-19T12:00:00.000Z',
    completedAt: '2026-05-19T12:00:01.000Z',
    createdAt: '2026-05-19T12:00:00.000Z',
  });

  const rawPage = db.prepare('SELECT * FROM wiki_pages WHERE id = ?').get('workspace-overview');
  const rawSectionCount = db.prepare('SELECT COUNT(*) AS count FROM wiki_page_sections WHERE page_id = ?').get('workspace-overview');
  const rawSource = db.prepare('SELECT * FROM wiki_page_sources WHERE page_id = ? AND source_ref = ?').get('workspace-overview', 'S1');
  const rawChunk = db.prepare('SELECT * FROM wiki_source_chunks WHERE page_id = ? AND chunk_ref = ?').get('workspace-overview', 'S1:C1');
  const rawRelation = db.prepare('SELECT * FROM wiki_page_relations WHERE source_page_id = ? AND target_page_id = ?').get('workspace-overview', 'category-legal');

  assert.equal(persisted.page_count, 2);
  assert.equal(listed.page_count, 2);
  assert.equal(rawPage.status, 'active');
  assert.equal(Boolean(rawPage.content_hash), true);
  assert.equal(Boolean(rawPage.source_fingerprint), true);
  assert.equal(rawPage.weak_source_warning, 0);
  assert.equal(rawSectionCount.count >= 2, true);
  assert.equal(rawSource.filename, 'Alpha Notes.md');
  assert.equal(rawSource.source_ref, 'S1');
  assert.equal(rawChunk.chunk_ref, 'S1:C1');
  assert.equal(rawChunk.source_ref, 'S1');
  assert.equal(Boolean(rawChunk.stable_chunk_key), true);
  assert.equal(rawRelation.relation_type, 'semantic');

  const workspace = listed.pages.find((page) => page.id === 'workspace-overview');
  assert.equal(workspace.sources[0].ref, 'S1');
  assert.equal(workspace.sources[0].chunks[0].ref, 'S1:C1');
  assert.equal(workspace.related_pages[0].id, 'category-legal');
  assert.equal(workspace.sections.some((section) => section.heading === 'Evidence'), true);

  assert.equal(bySlug.id, 'workspace-overview');
  assert.equal(bySlug.sources[0].chunks[0].stable_chunk_key, rawChunk.stable_chunk_key);
  assert.equal(evidence.page.id, 'workspace-overview');
  assert.equal(evidence.sources[0].source_ref, 'S1');
  assert.equal(evidence.chunks[0].chunk_ref, 'S1:C1');
  assert.equal(chunk.filename, 'Alpha Notes.md');
  assert.equal(chunk.absolute_path, 'C:\\EverythingAI\\Alpha Notes.md');
  assert.equal(rebuild.status, 'completed');
  assert.deepEqual(JSON.parse(rebuild.summary_json), { page_count: 2 });

  db.close();
});
