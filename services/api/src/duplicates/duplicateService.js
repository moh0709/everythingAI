import { listDuplicateGroups } from '../db/client.js';

export function findDuplicateFiles(db) {
  const groups = listDuplicateGroups(db);
  return {
    duplicate_groups: groups.length,
    duplicate_files: groups.reduce((sum, group) => sum + group.file_count, 0),
    groups,
  };
}
