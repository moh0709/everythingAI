import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import {
  createPlanningSession,
  getPlanningSessionWithSuggestions,
  listPlanningSessionRecords,
  runConfiguredPlanningSession,
  runPlanningSession,
} from '../planning/planningSessionService.js';
import { parseLimit } from '../utils/request.js';

export function createPlanningRouter() {
  const router = Router();

  router.post('/planning/sessions', (req, res, next) => {
    try {
      const db = openDatabase();
      const session = createPlanningSession(db, {
        mode: req.body?.mode,
        source: req.body?.source,
        settings: req.body?.settings,
      });
      db.close();

      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.get('/planning/sessions', (req, res, next) => {
    try {
      const db = openDatabase();
      const sessions = listPlanningSessionRecords(db, {
        limit: parseLimit(req.query.limit, 100),
        status: req.query.status?.toString(),
      });
      db.close();

      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });

  router.get('/planning/sessions/:sessionId', (req, res, next) => {
    try {
      const db = openDatabase();
      const result = getPlanningSessionWithSuggestions(db, {
        sessionId: req.params.sessionId,
        limit: parseLimit(req.query.limit, 500),
      });
      db.close();

      if (!result) {
        return res.status(404).json({ error: 'planning session not found' });
      }

      return res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/planning/sessions/:sessionId/run', async (req, res, next) => {
    const db = openDatabase();

    try {
      const existing = getPlanningSessionWithSuggestions(db, {
        sessionId: req.params.sessionId,
        limit: 1,
      });

      if (!existing) {
        db.close();
        return res.status(404).json({ error: 'planning session not found' });
      }

      const mode = existing.session.mode;
      const result = mode === 'provider' || mode === 'hybrid'
        ? await runConfiguredPlanningSession(db, {
          sessionId: req.params.sessionId,
          limit: parseLimit(req.body?.limit, 1000),
        })
        : runPlanningSession(db, {
          sessionId: req.params.sessionId,
          limit: parseLimit(req.body?.limit, 1000),
        });
      db.close();

      return res.json(result);
    } catch (error) {
      db.close();
      return next(error);
    }
  });

  return router;
}
