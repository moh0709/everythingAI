import crypto from 'node:crypto';
import { listExtractedFiles, listFileEmbeddings } from '../db/client.js';
import {
  DEFAULT_EMBEDDING_MODEL,
  createEmbeddingProvider,
  createLocalTokenEmbeddingProvider,
  tokenizeForEmbedding,
} from './embeddingProviders.js';

const MODEL_NAME = DEFAULT_EMBEDDING_MODEL;

function hashEmbeddingSource(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

function columnExists(db, tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

function ensureEmbeddingSourceHashColumn(db) {
  if (!columnExists(db, 'file_embeddings', 'source_hash')) {
    db.exec('ALTER TABLE file_embeddings ADD COLUMN source_hash TEXT');
  }
}

function getExistingEmbedding(db, fileId) {
  return db.prepare(`
    SELECT file_id, embedding_model, source_hash
    FROM file_embeddings
    WHERE file_id = ?
  `).get(fileId);
}

function upsertFileEmbeddingWithSourceHash(db, embedding) {
  db.prepare(`
    INSERT INTO file_embeddings (
      file_id,
      embedding_model,
      vector_json,
      token_count,
      generated_at,
      source_hash
    )
    VALUES (
      @file_id,
      @embedding_model,
      @vector_json,
      @token_count,
      @generated_at,
      @source_hash
    )
    ON CONFLICT(file_id) DO UPDATE SET
      embedding_model = excluded.embedding_model,
      vector_json = excluded.vector_json,
      token_count = excluded.token_count,
      generated_at = excluded.generated_at,
      source_hash = excluded.source_hash
  `).run(embedding);
}

export { tokenizeForEmbedding };

export function embedText(text, { provider } = {}) {
  const embeddingProvider = createEmbeddingProvider(provider);
  const embedding = embeddingProvider.embed(text);

  if (embedding?.then) {
    throw new Error('Asynchronous embedding providers are not supported by generateEmbeddings yet. Use a synchronous provider adapter for the local MVP.');
  }

  return embedding;
}

export function embedTextSync(text) {
  return createLocalTokenEmbeddingProvider().embed(text);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function generateEmbeddings(db, { fileId, limit = 1000, force = false, provider } = {}) {
  ensureEmbeddingSourceHashColumn(db);

  const embeddingProvider = createEmbeddingProvider(provider);
  const files = listExtractedFiles(db, { fileId, limit });
  const generatedAt = new Date().toISOString();
  const results = [];
  const skipped = [];

  for (const file of files) {
    const sourceText = `${file.filename}\n${file.extracted_text || ''}`;
    const sourceHash = hashEmbeddingSource(sourceText);
    const existing = getExistingEmbedding(db, file.id);

    if (!force && existing?.embedding_model === embeddingProvider.model && existing.source_hash === sourceHash) {
      skipped.push({ fileId: file.id, filename: file.filename, reason: 'unchanged' });
      continue;
    }

    const embedding = embeddingProvider.embed(sourceText);

    if (embedding?.then) {
      throw new Error('Asynchronous embedding providers are not supported by generateEmbeddings yet. Use a synchronous provider adapter for the local MVP.');
    }

    const record = {
      file_id: file.id,
      embedding_model: embedding.model,
      vector_json: JSON.stringify(embedding.vector),
      token_count: embedding.tokenCount,
      generated_at: generatedAt,
      source_hash: sourceHash,
    };

    upsertFileEmbeddingWithSourceHash(db, record);
    results.push({ fileId: file.id, filename: file.filename, tokenCount: embedding.tokenCount });
  }

  return {
    embedding_model: embeddingProvider.model,
    generated: results.length,
    skipped_unchanged: skipped.length,
    results,
    skipped,
  };
}

export function searchEmbeddings(db, { query, limit = 10 } = {}) {
  const queryEmbedding = embedTextSync(query);
  const embeddings = listFileEmbeddings(db, { limit: 1000 });

  return embeddings
    .map((embedding) => ({
      id: embedding.file_id,
      filename: embedding.filename,
      absolute_path: embedding.absolute_path,
      relative_path: embedding.relative_path,
      extension: embedding.extension,
      score: cosineSimilarity(queryEmbedding.vector, JSON.parse(embedding.vector_json)),
      snippet: (embedding.extracted_text || '').replace(/\s+/g, ' ').slice(0, 240),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export { MODEL_NAME };
