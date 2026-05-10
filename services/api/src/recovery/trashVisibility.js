import { listTrashRecords } from './trashService.js';

function activeTrashIds(db) {
  return new Set(listTrashRecords(db, { status: 'trashed', limit: 100000 }).map((record) => record.file_id));
}

export function annotateTrashState(db, files = []) {
  const trashedIds = activeTrashIds(db);
  return files.map((file) => ({
    ...file,
    recovery_status: trashedIds.has(file.id) ? 'trashed' : 'active',
  }));
}

export function filterActiveFiles(db, files = [], { includeTrashed = false } = {}) {
  const annotated = annotateTrashState(db, files);
  if (includeTrashed) return annotated;
  return annotated.filter((file) => file.recovery_status !== 'trashed');
}

export function annotateFileLinkedRows(db, rows = []) {
  const trashedIds = activeTrashIds(db);
  return rows.map((row) => ({
    ...row,
    recovery_status: trashedIds.has(row.file_id || row.id) ? 'trashed' : 'active',
  }));
}

export function filterActiveFileLinkedRows(db, rows = [], { includeTrashed = false } = {}) {
  const annotated = annotateFileLinkedRows(db, rows);
  if (includeTrashed) return annotated;
  return annotated.filter((row) => row.recovery_status !== 'trashed');
}
