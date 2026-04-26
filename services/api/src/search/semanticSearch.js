import { listExtractedFiles } from '../db/client.js';
import { searchEmbeddings } from '../embeddings/embeddingService.js';

function tokenize(text) {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'your', 'you']);
  return (text || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2 && !stop.has(token)) || [];
}

function vectorize(text) {
  const vector = new Map();
  for (const token of tokenize(text)) {
    vector.set(token, (vector.get(token) || 0) + 1);
  }
  return vector;
}

function cosine(a, b) {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;

  for (const value of a.values()) aMag += value * value;
  for (const value of b.values()) bMag += value * value;
  for (const [token, value] of a.entries()) dot += value * (b.get(token) || 0);

  if (!aMag || !bMag) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

export function semanticSearchFiles(db, { query, limit = 10 } = {}) {
  if (!query || !query.trim()) return [];

  const embeddingResults = searchEmbeddings(db, { query, limit });
  if (embeddingResults.length > 0) return embeddingResults;

  const queryVector = vectorize(query);
  const files = listExtractedFiles(db, { limit: 1000 });

  return files
    .map((file) => ({
      id: file.id,
      filename: file.filename,
      absolute_path: file.absolute_path,
      relative_path: file.relative_path,
      extension: file.extension,
      score: cosine(queryVector, vectorize(`${file.filename} ${file.extracted_text}`)),
      snippet: (file.extracted_text || '').replace(/\s+/g, ' ').slice(0, 240),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
