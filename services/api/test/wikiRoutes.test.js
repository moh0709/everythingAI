import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { openDatabase, upsertIndexedFile } from '../src/db/client.js';
import { listPersistedWikiPages, persistWikiPages } from '../src/db/wikiRepository.js';
import { createWikiRouter } from '../src/routes/wiki.routes.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-wiki-routes-test-${Date.now()}-${Math.random()}.sqlite`);
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

function upsertExtraction(db, text) {
  db.prepare(`
    INSERT INTO file_extractions (
      file_id,
      extracted_text,
      extraction_status,
      extractor_name,
      extracted_at,
      error_message,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_id) DO UPDATE SET
      extracted_text = excluded.extracted_text,
      extraction_status = excluded.extraction_status,
      extractor_name = excluded.extractor_name,
      extracted_at = excluded.extracted_at,
      error_message = excluded.error_message,
      metadata_json = excluded.metadata_json
  `).run(
    'file-alpha',
    text,
    'extracted',
    'test-extractor',
    new Date().toISOString(),
    null,
    '{}'
  );
}

function seedExtractedSourceFile(db, text = 'Supplier agreement alpha renewal project') {
  insertSourceFile(db);
  upsertExtraction(db, text);
}

function seedWiki(db) {
  insertSourceFile(db);

  persistWikiPages(db, {
    generated_at: '2026-05-19T12:00:00.000Z',
    pages: [
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
        related_pages: [],
      },
    ],
  });
}

async function withTestServer(dbPath, callback) {
  const app = express();
  app.use(express.json());
  app.use('/api', createWikiRouter({ openDb: () => openDatabase(dbPath) }));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  return { response, body };
}

async function postJson(url, payload = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  return { response, body };
}

async function buildWiki(baseUrl) {
  return postJson(`${baseUrl}/api/wiki/build`, {
    limit: 25,
    filePageLimit: 25,
  });
}

test('durable wiki evidence routes expose pages, evidence, and source chunks', async () => {
  const dbPath = tempDbPath();
  const seedDb = openDatabase(dbPath);
  seedWiki(seedDb);
  seedDb.close();

  await withTestServer(dbPath, async (baseUrl) => {
    const wikiResult = await getJson(`${baseUrl}/api/wiki`);
    assert.equal(wikiResult.response.status, 200);
    assert.equal(wikiResult.body.wiki.page_count, 1);
    assert.equal(wikiResult.body.wiki.pages[0].slug, 'workspace-overview');

    const pageResult = await getJson(`${baseUrl}/api/wiki/pages/workspace-overview`);
    assert.equal(pageResult.response.status, 200);
    assert.equal(pageResult.body.page.id, 'workspace-overview');
    assert.equal(pageResult.body.page.sources[0].ref, 'S1');
    assert.equal(pageResult.body.page.sources[0].chunks[0].ref, 'S1:C1');

    const evidenceResult = await getJson(`${baseUrl}/api/wiki/pages/workspace-overview/evidence`);
    assert.equal(evidenceResult.response.status, 200);
    assert.equal(evidenceResult.body.evidence.page.id, 'workspace-overview');
    assert.equal(evidenceResult.body.evidence.sources[0].source_ref, 'S1');
    assert.equal(evidenceResult.body.evidence.chunks[0].chunk_ref, 'S1:C1');

    const chunkResult = await getJson(`${baseUrl}/api/wiki/pages/workspace-overview/chunks/S1:C1`);
    assert.equal(chunkResult.response.status, 200);
    assert.equal(chunkResult.body.chunk.chunk_ref, 'S1:C1');
    assert.equal(chunkResult.body.chunk.filename, 'Alpha Notes.md');
    assert.equal(chunkResult.body.chunk.absolute_path, 'C:\\EverythingAI\\Alpha Notes.md');

    const missingResult = await getJson(`${baseUrl}/api/wiki/pages/missing-page`);
    assert.equal(missingResult.response.status, 404);
    assert.equal(missingResult.body.error, 'Wiki page not found');
  });
});

test('wiki validation preview route returns advisory read-only preview for persisted page', async () => {
  const dbPath = tempDbPath();
  const seedDb = openDatabase(dbPath);
  seedWiki(seedDb);
  seedDb.close();

  await withTestServer(dbPath, async (baseUrl) => {
    const beforeDb = openDatabase(dbPath);
    const beforeRebuildCount = beforeDb.prepare('SELECT COUNT(*) AS count FROM wiki_rebuilds').get().count;
    const beforePage = beforeDb.prepare('SELECT updated_at FROM wiki_pages WHERE id = ?').get('workspace-overview');
    beforeDb.close();

    const previewResult = await postJson(`${baseUrl}/api/wiki/pages/workspace-overview/validation-preview`);

    assert.equal(previewResult.response.status, 200);
    assert.equal(previewResult.body.preview.page_id, 'workspace-overview');
    assert.equal(previewResult.body.preview.mode, 'structural');
    assert.equal(previewResult.body.preview.authority, 'advisory');
    assert.equal(previewResult.body.preview.persisted, false);
    assert.equal(previewResult.body.preview.confidence_score, 0);
    assert.equal(previewResult.body.preview.support_score, 1);
    assert.equal(previewResult.body.preview.risk_score, 0);
    assert.equal(previewResult.body.preview.recommendation, 'pass');
    assert.equal(Array.isArray(previewResult.body.preview.issues), true);

    const afterDb = openDatabase(dbPath);
    const afterRebuildCount = afterDb.prepare('SELECT COUNT(*) AS count FROM wiki_rebuilds').get().count;
    const afterPage = afterDb.prepare('SELECT updated_at FROM wiki_pages WHERE id = ?').get('workspace-overview');
    afterDb.close();

    assert.equal(afterRebuildCount, beforeRebuildCount);
    assert.equal(afterPage.updated_at, beforePage.updated_at);

    const missingResult = await postJson(`${baseUrl}/api/wiki/pages/missing-page/validation-preview`);
    assert.equal(missingResult.response.status, 404);
    assert.equal(missingResult.body.error, 'Wiki page validation preview not found');
  });
});

test('wiki diagnostics route exposes rebuild state, dependencies, fingerprints, and rebuild history', async () => {
  const dbPath = tempDbPath();
  const db = openDatabase(dbPath);
  seedExtractedSourceFile(db, 'Supplier agreement alpha renewal project');
  db.close();

  await withTestServer(dbPath, async (baseUrl) => {
    const buildResult = await buildWiki(baseUrl);
    assert.equal(buildResult.response.status, 200);

    const diagnosticsResult = await getJson(`${baseUrl}/api/wiki/diagnostics`);

    assert.equal(diagnosticsResult.response.status, 200);

    const diagnostics = diagnosticsResult.body.diagnostics;

    assert.equal(diagnostics.page_stats.total_pages > 0, true);
    assert.equal(diagnostics.evidence_stats.chunk_count > 0, true);
    assert.equal(diagnostics.build_state.length > 0, true);
    assert.equal(diagnostics.fingerprints.length > 0, true);
    assert.equal(diagnostics.dependencies.length > 0, true);
    assert.equal(diagnostics.rebuilds.length > 0, true);

    assert.equal(
      diagnostics.dependencies.some((dependency) => dependency.page_id === 'workspace-overview'),
      true
    );

    assert.equal(
      diagnostics.rebuilds.some((rebuild) => rebuild.mode === 'full'),
      true
    );
  });
});

test('wiki build persists generated wiki on first build when no persisted wiki exists', async () => {
  const dbPath = tempDbPath();
  const db = openDatabase(dbPath);
  seedExtractedSourceFile(db);
  db.close();

  await withTestServer(dbPath, async (baseUrl) => {
    const result = await buildWiki(baseUrl);

    assert.equal(result.response.status, 200);
    assert.equal(result.body.wiki.page_count > 0, true);
    assert.equal(result.body.rebuild.mode, 'full');

    const verifyDb = openDatabase(dbPath);
    const persisted = listPersistedWikiPages(verifyDb);

    assert.equal(Boolean(persisted), true);
    assert.equal(persisted.page_count > 0, true);

    verifyDb.close();
  });
});

test('wiki build no-op preserves persisted wiki pages after a real prior build', async () => {
  const dbPath = tempDbPath();
  const db = openDatabase(dbPath);
  seedExtractedSourceFile(db);
  db.close();

  await withTestServer(dbPath, async (baseUrl) => {
    const first = await buildWiki(baseUrl);
    assert.equal(first.response.status, 200);
    assert.equal(first.body.rebuild.mode, 'full');

    const beforeDb = openDatabase(dbPath);
    const beforePage = beforeDb.prepare(
      'SELECT updated_at FROM wiki_pages WHERE id = ?'
    ).get('workspace-overview');
    beforeDb.close();

    const second = await buildWiki(baseUrl);

    assert.equal(second.response.status, 200);
    assert.equal(second.body.rebuild.mode, 'incremental');
    assert.equal(second.body.replacement_plan.strategy, 'no-op');

    const afterDb = openDatabase(dbPath);
    const afterPage = afterDb.prepare(
      'SELECT updated_at FROM wiki_pages WHERE id = ?'
    ).get('workspace-overview');
    afterDb.close();

    assert.equal(afterPage.updated_at, beforePage.updated_at);
  });
});

test('wiki build detects changed extraction dependencies and selectively replaces affected pages', async () => {
  const dbPath = tempDbPath();
  const db = openDatabase(dbPath);
  seedExtractedSourceFile(db, 'Supplier agreement alpha renewal project');
  db.close();

  await withTestServer(dbPath, async (baseUrl) => {
    const first = await buildWiki(baseUrl);
    assert.equal(first.response.status, 200);
    assert.equal(first.body.rebuild.mode, 'full');

    const updateDb = openDatabase(dbPath);
    upsertExtraction(updateDb, 'Supplier agreement alpha renewal project with updated compliance clause');
    updateDb.close();

    const second = await buildWiki(baseUrl);

    assert.equal(second.response.status, 200);
    assert.equal(second.body.rebuild.mode, 'selective');
    assert.equal(second.body.replacement_plan.strategy, 'selective-replacement');
    assert.equal(second.body.replacement_plan.changed_file_count, 1);
    assert.equal(second.body.replacement_plan.affected_page_count > 0, true);
    assert.equal(second.body.replacement_plan.pages_to_replace.some((page) => page.id === 'workspace-overview'), true);
  });
});
