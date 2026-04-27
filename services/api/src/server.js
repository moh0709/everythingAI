import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openDatabase,
  listIndexedFiles,
  upsertIndexedFile,
  listFileInsights,
  getIndexedFileById,
  listActionExecutions,
  listAuditLog,
  listFileLabels,
  getSystemStatus,
} from './db/client.js';
import { scanFolder } from './indexer/fileScanner.js';
import { extractIndexedFiles } from './extractors/extractionRunner.js';
import { searchFiles } from './search/searchService.js';
import { answerFromLocalFiles } from './ai/chatPipeline.js';
import { generatePreviewSuggestions } from './suggestions/suggestionService.js';
import { createActionPreview } from './previews/actionPreviewService.js';
import { executeActionPreview, undoActionExecution } from './actions/actionExecutor.js';
import { syncExtractedFilesToAnythingLlm } from './integrations/anythingllm/anythingLlmClient.js';
import { generateFileInsights } from './insights/insightService.js';
import { semanticSearchFiles } from './search/semanticSearch.js';
import { findDuplicateFiles } from './duplicates/duplicateService.js';
import { startFolderWatcher, stopFolderWatcher } from './watcher/watchService.js';
import { buildKnowledgeIndex } from './knowledge/knowledgeService.js';
import { generateEmbeddings } from './embeddings/embeddingService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;
const API_TOKEN = process.env.API_TOKEN || 'replace-with-your-local-development-token';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));
app.use(express.static(publicDir));

function requireApiToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== API_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid bearer token.',
    });
  }

  next();
}

function requireBodyString(req, res, fieldName) {
  const value = req.body?.[fieldName];
  if (typeof value !== 'string' || !value.trim()) {
    res.status(400).json({ error: `${fieldName} is required` });
    return null;
  }
  return value.trim();
}

function parseLimit(value, fallback) {
  const parsed = Number.parseInt(value || fallback.toString(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'everythingai-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/files', requireApiToken, (req, res) => {
  const db = openDatabase();
  const files = listIndexedFiles(db, {
    limit: parseLimit(req.query.limit, 100),
    status: req.query.status?.toString(),
    query: req.query.q?.toString(),
  });
  db.close();

  res.json({ files });
});

app.get('/api/status', requireApiToken, (_req, res) => {
  const db = openDatabase();
  const status = getSystemStatus(db);
  db.close();

  res.json({
    status,
    provider: {
      chat: process.env.OLLAMA_MODEL ? 'ollama' : 'unconfigured',
      model: process.env.OLLAMA_MODEL || null,
    },
  });
});

app.get('/api/files/:fileId/preview', requireApiToken, (req, res) => {
  const db = openDatabase();
  const file = getIndexedFileById(db, req.params.fileId);
  const insights = listFileInsights(db, { fileId: req.params.fileId, limit: 1 });
  db.close();

  if (!file) {
    return res.status(404).json({ error: 'file not found' });
  }

  res.json({
    file,
    insight: insights[0] || null,
    previewText: (file.extracted_text || '').slice(0, 5000),
  });
});

app.post('/api/index', requireApiToken, async (req, res, next) => {
  try {
    const folderPath = requireBodyString(req, res, 'folderPath');
    if (!folderPath) return;

    const db = openDatabase();
    const insertRecord = db.transaction((record) => upsertIndexedFile(db, record));
    const result = await scanFolder(folderPath, {
      onRecord: (record) => insertRecord(record),
    });
    db.close();

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/extract', requireApiToken, async (req, res, next) => {
  try {
    const db = openDatabase();
    const result = await extractIndexedFiles(db, {
      fileId: req.body?.fileId,
      limit: parseLimit(req.body?.limit, 1000),
    });
    db.close();

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/search', requireApiToken, (req, res) => {
  const query = req.query.q?.toString();

  if (!query) {
    return res.status(400).json({ error: 'q is required' });
  }

  const db = openDatabase();
  const results = searchFiles(db, {
    query,
    limit: parseLimit(req.query.limit, 20),
  });
  db.close();

  res.json({ results });
});

app.get('/api/semantic-search', requireApiToken, (req, res) => {
  const query = req.query.q?.toString();

  if (!query) {
    return res.status(400).json({ error: 'q is required' });
  }

  const db = openDatabase();
  const results = semanticSearchFiles(db, {
    query,
    limit: parseLimit(req.query.limit, 10),
  });
  db.close();

  res.json({ results });
});

app.post('/api/embeddings', requireApiToken, (req, res) => {
  const db = openDatabase();
  const result = generateEmbeddings(db, {
    fileId: req.body?.fileId,
    limit: parseLimit(req.body?.limit, 1000),
  });
  db.close();

  res.json(result);
});

app.post('/api/chat', requireApiToken, async (req, res, next) => {
  try {
    const question = requireBodyString(req, res, 'question');
    if (!question) return;

    const db = openDatabase();
    const result = await answerFromLocalFiles(db, {
      question,
      limit: parseLimit(req.body?.limit, 5),
    });
    db.close();

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/insights', requireApiToken, async (req, res, next) => {
  try {
    const db = openDatabase();
    const result = await generateFileInsights(db, {
      fileId: req.body?.fileId,
      limit: parseLimit(req.body?.limit, 25),
      useOllama: req.body?.useOllama === true,
    });
    const insights = listFileInsights(db, {
      fileId: req.body?.fileId,
      limit: parseLimit(req.body?.limit, 25),
    });
    db.close();

    res.json({ ...result, insights });
  } catch (error) {
    next(error);
  }
});

app.get('/api/duplicates', requireApiToken, (_req, res) => {
  const db = openDatabase();
  const result = findDuplicateFiles(db);
  db.close();

  res.json(result);
});

app.get('/api/knowledge', requireApiToken, (req, res) => {
  const db = openDatabase();
  const result = buildKnowledgeIndex(db, {
    limit: parseLimit(req.query.limit, 500),
  });
  db.close();

  res.json(result);
});

app.post('/api/watch', requireApiToken, async (req, res, next) => {
  try {
    const folderPath = requireBodyString(req, res, 'folderPath');
    if (!folderPath) return;

    const db = openDatabase();
    const result = await startFolderWatcher(db, { rootPath: folderPath, extract: req.body?.extract !== false });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/unwatch', requireApiToken, (req, res, next) => {
  try {
    const folderPath = requireBodyString(req, res, 'folderPath');
    if (!folderPath) return;

    const db = openDatabase();
    const result = stopFolderWatcher(db, { rootPath: folderPath });
    db.close();

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/suggestions', requireApiToken, (req, res, next) => {
  try {
    const fileId = requireBodyString(req, res, 'fileId');
    if (!fileId) return;

    const db = openDatabase();
    const suggestions = generatePreviewSuggestions(db, { fileId });
    db.close();

    res.status(201).json({ suggestions });
  } catch (error) {
    next(error);
  }
});

app.post('/api/action-previews', requireApiToken, async (req, res, next) => {
  try {
    const suggestionId = requireBodyString(req, res, 'suggestionId');
    if (!suggestionId) return;

    const db = openDatabase();
    const preview = await createActionPreview(db, { suggestionId });
    db.close();

    res.status(201).json({ preview });
  } catch (error) {
    next(error);
  }
});

app.post('/api/action-executions', requireApiToken, async (req, res, next) => {
  try {
    const previewId = requireBodyString(req, res, 'previewId');
    if (!previewId) return;

    const db = openDatabase();
    const execution = await executeActionPreview(db, {
      previewId,
      approve: req.body?.approve === true,
    });
    db.close();

    res.status(201).json({ execution });
  } catch (error) {
    next(error);
  }
});

app.post('/api/action-executions/:executionId/undo', requireApiToken, async (req, res, next) => {
  try {
    const db = openDatabase();
    const execution = await undoActionExecution(db, {
      executionId: req.params.executionId,
      approve: req.body?.approve === true,
    });
    db.close();

    res.json({ execution });
  } catch (error) {
    next(error);
  }
});

app.get('/api/action-executions', requireApiToken, (req, res) => {
  const db = openDatabase();
  const executions = listActionExecutions(db, {
    fileId: req.query.fileId?.toString(),
    limit: parseLimit(req.query.limit, 100),
  });
  db.close();

  res.json({ executions });
});

app.get('/api/audit-log', requireApiToken, (req, res) => {
  const db = openDatabase();
  const events = listAuditLog(db, {
    entityType: req.query.entityType?.toString(),
    entityId: req.query.entityId?.toString(),
    limit: parseLimit(req.query.limit, 100),
  });
  db.close();

  res.json({ events });
});

app.get('/api/labels', requireApiToken, (req, res) => {
  const db = openDatabase();
  const labels = listFileLabels(db, {
    fileId: req.query.fileId?.toString(),
    limit: parseLimit(req.query.limit, 100),
  });
  db.close();

  res.json({ labels });
});

app.post('/api/integrations/anythingllm/sync', requireApiToken, async (req, res, next) => {
  try {
    const db = openDatabase();
    const result = await syncExtractedFilesToAnythingLlm(db, {
      fileId: req.body?.fileId,
      limit: parseLimit(req.body?.limit, 25),
    });
    db.close();

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
  });
});

app.listen(PORT, () => {
  console.log(`EverythingAI API listening on port ${PORT}`);
});
