import { searchIndexedFiles } from '../db/client.js';

export function searchFiles(db, { query, limit = 20 } = {}) {
  return searchIndexedFiles(db, { query, limit });
}
