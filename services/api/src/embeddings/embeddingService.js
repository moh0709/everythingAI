import { listExtractedFiles, listFileEmbeddings, upsertFileEmbedding } from '../db/client.js';

const MODEL_NAME = 'everythingai-local-token-v1';
const DIMENSIONS = 256;

export function tokenizeForEmbedding(text) {
  return (text || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2) || [];
}

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % DIMENSIONS;
}

export function embedText(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  const tokens = tokenizeForEmbedding(text);

  for (const token of tokens) {
    vector[hashToken(token)] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  const normalized = magnitude ? vector.map((value) => value / magnitude) : vector;

  return {
    model: MODEL_NAME,
    vector: normalized,
    tokenCount: tokens.length,
  };
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function generateEmbeddings(db, { fileId, limit = 1000 } = {}) {
  const files = listExtractedFiles(db, { fileId, limit });
  const generatedAt = new Date().toISOString();
  const results = [];

  for (const file of files) {
    const embedding = embedText(`${file.filename}\n${file.extracted_text || ''}`);
    const record = {
      file_id: file.id,
      embedding_model: embedding.model,
      vector_json: JSON.stringify(embedding.vector),
      token_count: embedding.tokenCount,
      generated_at: generatedAt,
    };

    upsertFileEmbedding(db, record);
    results.push({ fileId: file.id, filename: file.filename, tokenCount: embedding.tokenCount });
  }

  return {
    embedding_model: MODEL_NAME,
    generated: results.length,
    results,
  };
}

export function searchEmbeddings(db, { query, limit = 10 } = {}) {
  const queryEmbedding = embedText(query);
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
