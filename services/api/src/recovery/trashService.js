import crypto from 'node:crypto';
import {
  getIndexedFileById,
  insertAuditLog,
} from '../db/client.js';

export const DEFAULT_TRASH_RETENTION_DAYS = 30;

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function audit(db, { eventType, entityType, entityId, payload }) {
  insertAuditLog(db, {
    id: createId('audit'),
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload_json: JSON.stringify(payload),
    created_at: new Date().toISOString(),
  });
}

export function getActiveTrashRecordByFileId(db, fileId) {
  return db.prepare(`
    SELECT *
    FROM trash_records
    WHERE file_id = ?
      AND status = 'trashed'
    ORDER BY trashed_at DESC
    LIMIT 1
  `).get(fileId);
}

export function getTrashRecordById(db, trashId) {
  return db.prepare(`
    SELECT
      t.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension,
      f.mime_type,
      f.size_bytes
    FROM trash_records t
    JOIN indexed_files f ON f.id = t.file_id
    WHERE t.id = ?
  `).get(trashId);
}

export function listTrashRecords(db, { status = 'trashed', limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (status) {
    clauses.push('t.status = @status');
    params.status = status;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      t.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension,
      f.mime_type,
      f.size_bytes
    FROM trash_records t
    JOIN indexed_files f ON f.id = t.file_id
    ${where}
    ORDER BY t.trashed_at DESC
    LIMIT @limit
  `).all(params);
}

export function moveFileToTrash(db, { fileId, retentionDays = DEFAULT_TRASH_RETENTION_DAYS } = {}) {
  if (!fileId) {
    throw new Error('fileId is required');
  }

  const file = getIndexedFileById(db, fileId);

  if (!file) {
    const error = new Error('file not found');
    error.statusCode = 404;
    throw error;
  }

  const existingTrash = getActiveTrashRecordByFileId(db, fileId);

  if (existingTrash) {
    const error = new Error('file already in trash');
    error.statusCode = 409;
    error.trashRecord = existingTrash;
    throw error;
  }

  const now = new Date();
  const normalizedRetentionDays = Number.isInteger(retentionDays)
    ? retentionDays
    : DEFAULT_TRASH_RETENTION_DAYS;

  const trashRecord = {
    id: createId('trash'),
    file_id: file.id,
    status: 'trashed',
    original_absolute_path: file.absolute_path,
    original_relative_path: file.relative_path,
    retention_until: addDays(now, normalizedRetentionDays).toISOString(),
    trashed_at: now.toISOString(),
    restored_at: null,
    restore_reason: null,
  };

  db.prepare(`
    INSERT INTO trash_records (
      id,
      file_id,
      status,
      original_absolute_path,
      original_relative_path,
      retention_until,
      trashed_at,
      restored_at,
      restore_reason
    )
    VALUES (
      @id,
      @file_id,
      @status,
      @original_absolute_path,
      @original_relative_path,
      @retention_until,
      @trashed_at,
      @restored_at,
      @restore_reason
    )
  `).run(trashRecord);

  audit(db, {
    eventType: 'file.trashed',
    entityType: 'trash_record',
    entityId: trashRecord.id,
    payload: {
      ...trashRecord,
      retention_days: normalizedRetentionDays,
      note: 'Local MVP trash is recovery metadata only; file content is not permanently deleted.',
    },
  });

  return trashRecord;
}

export function restoreTrashRecord(db, { trashId, reason = null } = {}) {
  if (!trashId) {
    throw new Error('trashId is required');
  }

  const trashRecord = getTrashRecordById(db, trashId);

  if (!trashRecord) {
    const error = new Error('trash record not found');
    error.statusCode = 404;
    throw error;
  }

  if (trashRecord.status !== 'trashed') {
    const error = new Error(`trash record cannot be restored from status: ${trashRecord.status}`);
    error.statusCode = 409;
    throw error;
  }

  db.prepare(`
    UPDATE trash_records
    SET
      status = 'restored',
      restored_at = @restoredAt,
      restore_reason = @restoreReason
    WHERE id = @trashId
  `).run({
    trashId,
    restoredAt: new Date().toISOString(),
    restoreReason: reason,
  });

  const restoredRecord = getTrashRecordById(db, trashId);

  audit(db, {
    eventType: 'file.restored',
    entityType: 'trash_record',
    entityId: restoredRecord.id,
    payload: restoredRecord,
  });

  return restoredRecord;
}
