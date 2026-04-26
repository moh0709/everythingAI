import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
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

const memoryStore = {
  devices: new Map(),
  files: new Map(),
};

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

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'everythingai-api',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/devices/register', requireApiToken, (req, res) => {
  const { hostname, platform, agentVersion } = req.body;

  if (!hostname) {
    return res.status(400).json({ error: 'hostname is required' });
  }

  const deviceId = nanoid();
  const device = {
    id: deviceId,
    hostname,
    platform: platform || 'unknown',
    agentVersion: agentVersion || '0.1.0',
    registeredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  memoryStore.devices.set(deviceId, device);

  res.status(201).json({ device });
});

app.get('/api/devices', requireApiToken, (_req, res) => {
  res.json({ devices: Array.from(memoryStore.devices.values()) });
});

app.post('/api/files/ingest', requireApiToken, (req, res) => {
  const { deviceId, files } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  if (!Array.isArray(files)) {
    return res.status(400).json({ error: 'files must be an array' });
  }

  const device = memoryStore.devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'device not found' });
  }

  const now = new Date().toISOString();
  device.lastSeenAt = now;

  let ingested = 0;

  for (const file of files) {
    if (!file.fullPath || !file.filename) continue;

    const fileId = file.hash ? `${deviceId}:${file.hash}` : `${deviceId}:${file.fullPath}`;

    memoryStore.files.set(fileId, {
      id: fileId,
      deviceId,
      filename: file.filename,
      fullPath: file.fullPath,
      extension: file.extension || '',
      size: file.size || 0,
      createdAt: file.createdAt || null,
      modifiedAt: file.modifiedAt || null,
      hash: file.hash || null,
      indexedAt: now,
      status: 'metadata_indexed',
    });

    ingested += 1;
  }

  res.status(201).json({ ingested });
});

app.get('/api/files', requireApiToken, (req, res) => {
  const db = openDatabase();
  const files = listIndexedFiles(db, {
    limit: Number.parseInt(req.query.limit || '100', 10),
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
    const { folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'folderPath is required' });
    }

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
      fileId: req.body.fileId,
      limit: Number.parseInt(req.body.limit || '1000', 10),
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
    limit: Number.parseInt(req.query.limit || '20', 10),
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
    limit: Number.parseInt(req.query.limit || '10', 10),
  });
  db.close();

  res.json({ results });
});

app.post('/api/embeddings', requireApiToken, (req, res) => {
  const db = openDatabase();
  const result = generateEmbeddings(db, {
    fileId: req.body.fileId,
    limit: Number.parseInt(req.body.limit || '1000', 10),
  });
  db.close();

  res.json(result);
});

app.post('/api/chat', requireApiToken, async (req, res, next) => {
  try {
    const { question, limit } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    const db = openDatabase();
    const result = await answerFromLocalFiles(db, {
      question,
      limit: Number.parseInt(limit || '5', 10),
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
      fileId: req.body.fileId,
      limit: Number.parseInt(req.body.limit || '25', 10),
      useOllama: req.body.useOllama === true,
    });
    const insights = listFileInsights(db, {
      fileId: req.body.fileId,
      limit: Number.parseInt(req.body.limit || '25', 10),
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
    limit: Number.parseInt(req.query.limit || '500', 10),
  });
  db.close();

  res.json(result);
});

app.post('/api/watch', requireApiToken, async (req, res, next) => {
  try {
    const { folderPath, extract } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'folderPath is required' });
    }

    const db = openDatabase();
    const result = await startFolderWatcher(db, { rootPath: folderPath, extract: extract !== false });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/unwatch', requireApiToken, (req, res, next) => {
  try {
    const { folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'folderPath is required' });
    }

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
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

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
    const { suggestionId } = req.body;

    if (!suggestionId) {
      return res.status(400).json({ error: 'suggestionId is required' });
    }

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
    const { previewId, approve } = req.body;

    if (!previewId) {
      return res.status(400).json({ error: 'previewId is required' });
    }

    const db = openDatabase();
    const execution = await executeActionPreview(db, {
      previewId,
      approve: approve === true,
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
      approve: req.body.approve === true,
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
    limit: Number.parseInt(req.query.limit || '100', 10),
  });
  db.close();

  res.json({ executions });
});

app.get('/api/audit-log', requireApiToken, (req, res) => {
  const db = openDatabase();
  const events = listAuditLog(db, {
    entityType: req.query.entityType?.toString(),
    entityId: req.query.entityId?.toString(),
    limit: Number.parseInt(req.query.limit || '100', 10),
  });
  db.close();

  res.json({ events });
});

app.get('/api/labels', requireApiToken, (req, res) => {
  const db = openDatabase();
  const labels = listFileLabels(db, {
    fileId: req.query.fileId?.toString(),
    limit: Number.parseInt(req.query.limit || '100', 10),
  });
  db.close();

  res.json({ labels });
});

app.post('/api/integrations/anythingllm/sync', requireApiToken, async (req, res, next) => {
  try {
    const db = openDatabase();
    const result = await syncExtractedFilesToAnythingLlm(db, {
      fileId: req.body.fileId,
      limit: Number.parseInt(req.body.limit || '25', 10),
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
