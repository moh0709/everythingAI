import path from 'node:path';

export function createSkipUnchanged(db) {
  const findFile = db.prepare(`
    SELECT size_bytes, modified_at, index_status
    FROM indexed_files
    WHERE absolute_path = ?
  `);

  return ({ absolutePath, sizeBytes, modifiedAt }) => {
    const row = findFile.get(path.resolve(absolutePath));
    if (!row) return false;
    if (row.index_status !== 'indexed') return false;
    return Number(row.size_bytes) === Number(sizeBytes) && row.modified_at === modifiedAt;
  };
}
