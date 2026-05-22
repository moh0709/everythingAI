import { searchIndexedFiles, searchIndexedFilesIncludingTrashed } from '../db/client.js';
import { filterActiveFiles } from '../recovery/trashVisibility.js';
import { mapSearchResults } from './searchResultMapper.js';

export function searchFiles(db, { query, limit = 20, includeTrashed = false } = {}) {
  const rawResults = includeTrashed
    ? searchIndexedFilesIncludingTrashed(db, { query, limit })
    : searchIndexedFiles(db, { query, limit });

  const visibleFiles = filterActiveFiles(db, rawResults, { includeTrashed });
  return mapSearchResults(visibleFiles);
}
