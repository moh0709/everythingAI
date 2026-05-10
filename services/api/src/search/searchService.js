import { searchIndexedFiles } from '../db/client.js';
import { filterActiveFiles } from '../recovery/trashVisibility.js';

export function searchFiles(db, { query, limit = 20, includeTrashed = false } = {}) {
  return filterActiveFiles(db, searchIndexedFiles(db, { query, limit }), { includeTrashed });
}
