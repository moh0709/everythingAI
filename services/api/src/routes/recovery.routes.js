import crypto from 'node:crypto';
import { Router } from 'express';
import {
  getIndexedFileById,
  insertAuditLog,
  openDatabase,
} from '../db/client.js';
import { parseLimit, requireBodyString } from '../utils/request.js';

const DEFAULT_TRASH_RETENTION_DAYS = 30;

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

function getActiveTrashRecordByFileId(db, fileId) {
  return db.prepare(`
    SELECT *
    FROM trash_records
    WHERE file_id = ?
      AND status = 'trashed'
    ORDER BY trashed_at DESC
    LIMIT 1
  `).get(fileId);
}

function getTrashRecordById(db, trashId) {
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

function listTrashRecords(db, { status = 'trashed', limit = 100 } = {}) {
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

export function createRecoveryRouter() {
  const router = Router();

  router.get('/recovery/trash', (req, res) => {
    const db = openDatabase();
    const records = listTrashRecords(db, {
      status: req.query.status?.toString() || 'trashed',
      limit: parseLimit(req.query.limit, 100),
    });
    db.close();

    res.json({ records });
  });

  router.post('/recovery/trash', (req, res, next) => {
    try {
      if (req.body?.approve !== true) {
        return res.status(400).json({ error: 'Explicit approval is required to move a file to trash.' });
      }

      const fileId = requireBodyString(req, res, 'fileId');
      if (!fileId) return;

      const db = openDatabase();
      const file = getIndexedFileById(db, fileId);

      if (!file) {
        db.close();
        return res.status(404).json({ error: 'file not found' });
      }

      const existingTrash = getActiveTrashRecordByFileId(db, fileId);

      if (existingTrash) {
        db.close();
        return res.status(409).json({ error: 'file already in trash', trashRecord: existingTrash });
      }

      const now = new Date();
      const retentionDays = Number.isInteger(req.body?.retentionDays)
        ? req.body.retentionDays
        : DEFAULT_TRASH_RETENTION_DAYS;
      const trashRecord = {
        id: createId('trash'),
        file_id: file.id,
        status: 'trashed',
        original_absolute_path: file.absolute_path,
        original_relative_path: file.relative_path,
        retention_until: addDays(now, retentionDays).toISOString(),
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
          retention_days: retentionDays,
          note: 'Local MVP trash is recovery metadata only; file content is not permanently deleted.',
        },
      });

      db.close();
      res.status(201).json({ trashRecord });
    } catch (error) {
      next(error);
    }
  });

  router.post('/recovery/trash/:trashId/restore', (req, res, next) => {
    try {
      if (req.body?.approve !== true) {
        return res.status(400).json({ error: 'Explicit approval is required to restore a trashed file.' });
      }

      const db = openDatabase();
      const trashRecord = getTrashRecordById(db, req.params.trashId);

      if (!trashRecord) {
        db.close();
        return res.status(404).json({ error: 'trash record not found' });
      }

      if (trashRecord.status !== 'trashed') {
        db.close();
        return res.status(409).json({ error: `trash record cannot be restored from status: ${trashRecord.status}` });
      }

      const restoredAt = new Date().toISOString();
      const restoreReason = req.body?.reason?.toString() || null;

      db.prepare(`
        UPDATE trash_records
        SET
          status = 'restored',
          restored_at = @restoredAt,
          restore_reason = @restoreReason
        WHERE id = @trashId
      `).run({
        trashId: req.params.trashId,
        restoredAt,
        restoreReason,
      });

      const restoredRecord = getTrashRecordById(db, req.params.trashId);

      audit(db, {
        eventType: 'file.restored',
        entityType: 'trash_record',
        entityId: restoredRecord.id,
        payload: restoredRecord,
      });

      db.close();
      res.json({ trashRecord: restoredRecord });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
