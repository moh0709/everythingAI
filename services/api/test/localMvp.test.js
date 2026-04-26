import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import {
  openDatabase,
  listIndexedFiles,
  upsertIndexedFile,
  getIndexedFileById,
  listActionExecutions,
  listAuditLog,
  listFileLabels,
  getSystemStatus,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { hashFile } from '../src/indexer/hash.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { searchFiles } from '../src/search/searchService.js';
import { answerFromLocalFiles } from '../src/ai/chatPipeline.js';
import { createLocalChatAnswer } from '../src/ai/localProvider.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview, undoActionExecution } from '../src/actions/actionExecutor.js';
import { syncExtractedFilesToAnythingLlm } from '../src/integrations/anythingllm/anythingLlmClient.js';
import { generateFileInsights } from '../src/insights/insightService.js';
import { semanticSearchFiles } from '../src/search/semanticSearch.js';
import { findDuplicateFiles } from '../src/duplicates/duplicateService.js';
import { startFolderWatcher, stopFolderWatcher } from '../src/watcher/watchService.js';
import { buildKnowledgeIndex } from '../src/knowledge/knowledgeService.js';
import { generateEmbeddings, searchEmbeddings } from '../src/embeddings/embeddingService.js';

async function writeMinimalXlsx(filePath) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.folder('xl').file('workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Projects" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);
  zip.folder('xl').folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);
  zip.folder('xl').folder('worksheets').file('sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>project</t></is></c>
      <c r="B1" t="inlineStr"><is><t>owner</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>gamma</t></is></c>
      <c r="B2" t="inlineStr"><is><t>EverythingAI</t></is></c>
    </row>
  </sheetData>
</worksheet>`);

  await fs.writeFile(filePath, await zip.generateAsync({ type: 'nodebuffer' }));
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-mvp-'));
  await fs.writeFile(path.join(root, 'Alpha Notes.md'), '# Alpha\nSupplier contract alpha renewal');
  await fs.writeFile(path.join(root, 'data.csv'), 'name,value\nalpha,42\n');

  const nested = path.join(root, 'nested');
  await fs.mkdir(nested);
  await fs.writeFile(path.join(nested, 'todo.txt'), 'find project beta source');

  const skipped = path.join(root, 'node_modules');
  await fs.mkdir(skipped);
  await fs.writeFile(path.join(skipped, 'ignored.txt'), 'this should not be indexed');

  await writeMinimalXlsx(path.join(root, 'projects.xlsx'));

  await fs.writeFile(path.join(root, 'broken.pdf'), 'not a real pdf');
  await fs.writeFile(path.join(root, 'broken.docx'), 'not a real docx');

  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-test-${Date.now()}-${Math.random()}.sqlite`);
}

function fileByName(db, filename) {
  return listIndexedFiles(db, { limit: 100 }).find((file) => file.filename === filename);
}

test('indexes recursively, skips unsafe folders, and hashes files stably', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  const result = await indexFixture(root, db);
  const files = listIndexedFiles(db, { limit: 100 });
  const notes = fileByName(db, 'Alpha Notes.md');

  assert.equal(result.indexed, 6);
  assert.equal(result.skipped, 1);
  assert.equal(files.some((file) => file.absolute_path.includes('node_modules')), false);
  assert.equal(notes.content_hash, await hashFile(path.join(root, 'Alpha Notes.md')));

  db.close();
});

test('extracts supported readable files and records failures without aborting', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const result = await extractIndexedFiles(db, { logger: { error: () => {} } });
  const notes = getIndexedFileById(db, fileByName(db, 'Alpha Notes.md').id);
  const workbook = getIndexedFileById(db, fileByName(db, 'projects.xlsx').id);
  const brokenPdf = getIndexedFileById(db, fileByName(db, 'broken.pdf').id);
  const brokenDocx = getIndexedFileById(db, fileByName(db, 'broken.docx').id);

  assert.equal(result.extracted, 4);
  assert.equal(result.failed, 2);
  assert.match(notes.extracted_text, /Supplier contract alpha/);
  assert.match(workbook.extracted_text, /gamma/);
  assert.equal(brokenPdf.extraction_status, 'failed');
  assert.equal(brokenDocx.extraction_status, 'failed');

  db.close();
});

test('searches filename, path, and extracted content with snippets', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const filenameResults = searchFiles(db, { query: 'Alpha Notes', limit: 10 });
  const contentResults = searchFiles(db, { query: 'supplier', limit: 10 });
  const pathResults = searchFiles(db, { query: 'nested', limit: 10 });

  assert.equal(filenameResults[0].filename, 'Alpha Notes.md');
  assert.equal(contentResults.some((row) => row.filename === 'Alpha Notes.md'), true);
  assert.equal(contentResults.some((row) => /\[supplier\]/i.test(row.snippet || '')), true);
  assert.equal(pathResults.some((row) => row.filename === 'todo.txt'), true);

  db.close();
});

test('prepares chat retrieval and creates preview-only suggestions without mutating source files', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const notesPath = path.join(root, 'Alpha Notes.md');
  const beforeContent = await fs.readFile(notesPath, 'utf8');
  const beforeStat = await fs.stat(notesPath);
  const notes = fileByName(db, 'Alpha Notes.md');
  const chat = await answerFromLocalFiles(db, { question: 'supplier contract', limit: 3 });
  const suggestions = generatePreviewSuggestions(db, { fileId: notes.id });
  const afterContent = await fs.readFile(notesPath, 'utf8');
  const afterStat = await fs.stat(notesPath);

  assert.equal(chat.provider, 'ollama-unconfigured');
  assert.equal(chat.provider_status, 'unavailable');
  assert.equal(chat.sources.some((source) => source.filename === 'Alpha Notes.md'), true);
  assert.equal(suggestions.every((suggestion) => suggestion.requires_approval === 1), true);
  assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'rename'), true);
  assert.equal(afterContent, beforeContent);
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs);

  db.close();
});

test('calls an Ollama-compatible provider when configured', async () => {
  const calls = [];
  const result = await createLocalChatAnswer({
    question: 'supplier contract',
    sources: [
      {
        filename: 'Alpha Notes.md',
        absolute_path: 'C:\\fixture\\Alpha Notes.md',
        snippet: '[supplier] contract alpha renewal',
      },
    ],
    providerOptions: {
      model: 'test-model',
      baseUrl: 'http://ollama.test',
      timeoutMs: 1000,
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              message: {
                content: 'Alpha Notes.md mentions the supplier contract at C:\\fixture\\Alpha Notes.md.',
              },
            };
          },
        };
      },
    },
  });

  assert.equal(result.provider, 'ollama');
  assert.equal(result.provider_status, 'ok');
  assert.equal(result.model, 'test-model');
  assert.match(result.answer, /Alpha Notes\.md/);
  assert.equal(calls[0].url, 'http://ollama.test/api/chat');
  assert.match(calls[0].options.body, /test-model/);
  assert.match(calls[0].options.body, /supplier contract/);
});

test('creates safe action previews without executing file actions', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);

  const notesPath = path.join(root, 'Alpha Notes.md');
  const beforeContent = await fs.readFile(notesPath, 'utf8');
  const notes = fileByName(db, 'Alpha Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: notes.id });
  const renameSuggestion = suggestions.find((suggestion) => suggestion.action_type === 'rename');
  const conflictPath = path.join(root, renameSuggestion.suggested_value);
  await fs.writeFile(conflictPath, 'existing conflict target');
  const tagSuggestion = suggestions.find((suggestion) => suggestion.action_type === 'tag');
  const blockedPreview = await createActionPreview(db, { suggestionId: renameSuggestion.id });
  const readyPreview = await createActionPreview(db, { suggestionId: tagSuggestion.id });
  const afterContent = await fs.readFile(notesPath, 'utf8');

  assert.equal(blockedPreview.preview_status, 'blocked');
  assert.equal(blockedPreview.can_execute, 0);
  assert.match(blockedPreview.blocked_reason, /already exists/);
  assert.equal(readyPreview.preview_status, 'ready');
  assert.equal(readyPreview.can_execute, 1);
  assert.equal(readyPreview.requires_approval, 1);
  assert.equal(afterContent, beforeContent);
  assert.equal(await fs.readFile(conflictPath, 'utf8'), 'existing conflict target');

  db.close();
});

test('uses Organizor2-inspired content rules for organization suggestions', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const notes = fileByName(db, 'Alpha Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: notes.id });

  assert.equal(suggestions.some((suggestion) => (
    suggestion.action_type === 'category' && suggestion.suggested_value === 'legal'
  )), true);
  assert.equal(suggestions.some((suggestion) => (
    suggestion.action_type === 'move' && suggestion.suggested_value === 'contracts'
  )), true);
  assert.equal(suggestions.some((suggestion) => (
    suggestion.action_type === 'tag' && suggestion.suggested_value === 'contract'
  )), true);

  db.close();
});

test('executes approved move previews and can undo filesystem changes', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);

  const notesPath = path.join(root, 'Alpha Notes.md');
  const notes = fileByName(db, 'Alpha Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: notes.id });
  const moveSuggestion = suggestions.find((suggestion) => suggestion.action_type === 'move');
  const preview = await createActionPreview(db, { suggestionId: moveSuggestion.id });

  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id }),
    /Explicit approval is required/,
  );

  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });
  const movedPath = path.join(root, 'notes', 'Alpha Notes.md');
  const movedFile = getIndexedFileById(db, notes.id);

  assert.equal(await fs.readFile(movedPath, 'utf8'), '# Alpha\nSupplier contract alpha renewal');
  await assert.rejects(() => fs.access(notesPath));
  assert.equal(movedFile.absolute_path, movedPath);
  assert.equal(execution.status, 'executed');

  const undone = await undoActionExecution(db, { executionId: execution.id, approve: true });
  const restoredFile = getIndexedFileById(db, notes.id);
  const executions = listActionExecutions(db, { fileId: notes.id });
  const auditEvents = listAuditLog(db, { entityType: 'action_execution', entityId: execution.id });

  assert.equal(undone.status, 'undone');
  assert.equal(await fs.readFile(notesPath, 'utf8'), '# Alpha\nSupplier contract alpha renewal');
  await assert.rejects(() => fs.access(movedPath));
  assert.equal(restoredFile.absolute_path, notesPath);
  assert.equal(executions.length, 1);
  assert.equal(auditEvents.length, 2);

  db.close();
});

test('executes app-level label actions and lists applied labels', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);

  const notes = fileByName(db, 'Alpha Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: notes.id });
  const tagSuggestion = suggestions.find((suggestion) => suggestion.action_type === 'tag');
  const categorySuggestion = suggestions.find((suggestion) => suggestion.action_type === 'category');
  const tagPreview = await createActionPreview(db, { suggestionId: tagSuggestion.id });
  const categoryPreview = await createActionPreview(db, { suggestionId: categorySuggestion.id });

  await executeActionPreview(db, { previewId: tagPreview.id, approve: true });
  await executeActionPreview(db, { previewId: categoryPreview.id, approve: true });

  const labels = listFileLabels(db, { fileId: notes.id });

  assert.equal(labels.length, 1);
  assert.equal(labels[0].tags.includes(tagSuggestion.suggested_value), true);
  assert.equal(labels[0].category, categorySuggestion.suggested_value);

  db.close();
});

test('syncs extracted files to AnythingLLM upload API when configured', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());
  const calls = [];

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const result = await syncExtractedFilesToAnythingLlm(db, {
    limit: 1,
    baseUrl: 'http://anythingllm.test',
    apiKey: 'test-key',
    workspaceSlug: 'everythingai',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async text() {
          return '{"success":true}';
        },
      };
    },
  });

  assert.equal(result.provider, 'anythingllm');
  assert.equal(result.uploaded, 1);
  assert.equal(calls[0].url, 'http://anythingllm.test/api/v1/document/upload');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].options.body instanceof FormData, true);

  db.close();
});

test('generates deterministic insights and semantic related search results', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });
  const embeddings = generateEmbeddings(db, { limit: 10 });

  const insightResult = await generateFileInsights(db, { limit: 10 });
  const related = semanticSearchFiles(db, { query: 'supplier contract renewal', limit: 5 });
  const embeddingResults = searchEmbeddings(db, { query: 'supplier contract renewal', limit: 5 });

  assert.equal(embeddings.generated >= 4, true);
  assert.equal(insightResult.generated >= 4, true);
  assert.equal(insightResult.results.some((row) => row.classification === 'legal'), true);
  assert.equal(related[0].filename, 'Alpha Notes.md');
  assert.equal(embeddingResults[0].filename, 'Alpha Notes.md');
  assert.equal(related[0].score > 0, true);

  db.close();
});

test('detects duplicate files by content hash', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await fs.writeFile(path.join(root, 'copy-of-todo.txt'), 'find project beta source');
  await indexFixture(root, db);

  const result = findDuplicateFiles(db);

  assert.equal(result.duplicate_groups, 1);
  assert.equal(result.groups[0].file_count, 2);
  assert.equal(result.groups[0].files.some((file) => file.filename === 'todo.txt'), true);
  assert.equal(result.groups[0].files.some((file) => file.filename === 'copy-of-todo.txt'), true);

  db.close();
});

test('starts a watcher and indexes changed files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-watch-'));
  const db = openDatabase(tempDbPath());
  await fs.writeFile(path.join(root, 'initial.txt'), 'initial content');

  const watcher = await startFolderWatcher(db, { rootPath: root, extract: true, logger: { error: () => {} } });
  await fs.writeFile(path.join(root, 'later.txt'), 'later watched content');
  await new Promise((resolve) => setTimeout(resolve, 500));

  const files = listIndexedFiles(db, { limit: 100 });
  const stopped = stopFolderWatcher(db, { rootPath: root });

  assert.equal(watcher.status, 'active');
  assert.equal(files.some((file) => file.filename === 'initial.txt'), true);
  assert.equal(files.some((file) => file.filename === 'later.txt'), true);
  assert.equal(stopped.status, 'stopped');

  db.close();
});

test('builds knowledge index from generated insights', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });
  await generateFileInsights(db, { limit: 10 });

  const knowledge = buildKnowledgeIndex(db);

  assert.equal(knowledge.classification_count > 0, true);
  assert.equal(knowledge.classifications.some((item) => item.name === 'legal'), true);
  assert.equal(knowledge.entity_count > 0, true);

  db.close();
});

test('reports system status counts for the local dashboard', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });
  await generateEmbeddings(db, { limit: 10 });
  await generateFileInsights(db, { limit: 10 });

  const notes = fileByName(db, 'Alpha Notes.md');
  generatePreviewSuggestions(db, { fileId: notes.id });

  const status = getSystemStatus(db);

  assert.equal(status.total_files, 6);
  assert.equal(status.indexed_files, 6);
  assert.equal(status.extracted_files, 4);
  assert.equal(status.failed_extractions, 2);
  assert.equal(status.searchable_files, 6);
  assert.equal(status.embedded_files >= 4, true);
  assert.equal(status.insight_files >= 4, true);
  assert.equal(status.suggestions > 0, true);
  assert.equal(Boolean(status.last_indexed_at), true);

  db.close();
});
