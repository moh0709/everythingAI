import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { parseLimit, requireBodyString } from '../utils/request.js';
import {
  blockPermanentPurge,
  listTrashRecords,
  moveFileToTrash,
  restoreTrashRecord,
} from '../recovery/trashService.js';

function sendServiceError(res, error) {
  if (error.statusCode === 409 && error.trashRecord) {
    return res.status(409).json({ error: error.message, trashRecord: error.trashRecord });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      policy: error.policy,
      trashId: error.trashId,
    });
  }

  throw error;
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

      try {
        const trashRecord = moveFileToTrash(db, {
          fileId,
          retentionDays: req.body?.retentionDays,
          auditContext: req.requestContext,
        });
        db.close();
        return res.status(201).json({ trashRecord });
      } catch (error) {
        db.close();
        return sendServiceError(res, error);
      }
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

      try {
        const trashRecord = restoreTrashRecord(db, {
          trashId: req.params.trashId,
          reason: req.body?.reason?.toString() || null,
          auditContext: req.requestContext,
        });
        db.close();
        return res.json({ trashRecord });
      } catch (error) {
        db.close();
        return sendServiceError(res, error);
      }
    } catch (error) {
      next(error);
    }
  });

  router.post('/recovery/trash/:trashId/purge', (req, res, next) => {
    try {
      const db = openDatabase();

      try {
        blockPermanentPurge(db, {
          trashId: req.params.trashId,
          requestedBy: req.body?.requestedBy?.toString() || 'api',
          auditContext: req.requestContext,
        });
      } catch (error) {
        db.close();
        return sendServiceError(res, error);
      }

      db.close();
      return res.status(500).json({ error: 'unexpected purge state' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
