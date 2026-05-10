import { searchIndexedFiles } from '../db/client.js';
import { filterActiveFiles } from '../recovery/trashVisibility.js';
import { mapSearchResults } from './searchResultMapper.js';

export function searchFiles(db, { query, limit = 20, includeTrashed = false } = {}) {
  const visibleFiles = filterActiveFiles(db, searchIndexedFiles(db, { query, limit }), { includeTrashed });
  return mapSearchResults(visibleFiles);
}
