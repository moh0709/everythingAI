import { Router } from 'express';
import { openDatabase, listFileInsights } from '../db/client.js';
import { generateFileInsights } from '../insights/insightService.js';
import { findDuplicateFiles } from '../duplicates/duplicateService.js';
import { buildKnowledgeIndex } from '../knowledge/knowledgeService.js';
import { parseLimit } from '../utils/request.js';

export function createIntelligenceRouter() {
  const router = Router();

  router.post('/insights', async (req, res, next) => {
    try {
      const db = openDatabase();
      const result = await generateFileInsights(db, {
        fileId: req.body?.fileId,
        limit: parseLimit(req.body?.limit, 25),
        useOllama: req.body?.useOllama === true,
      });
      const insights = listFileInsights(db, {
        fileId: req.body?.fileId,
        limit: parseLimit(req.body?.limit, 25),
      });
      db.close();

      res.json({ ...result, insights });
    } catch (error) {
      next(error);
    }
  });

  router.get('/duplicates', (_req, res) => {
    const db = openDatabase();
    const result = findDuplicateFiles(db);
    db.close();

    res.json(result);
  });

  router.get('/knowledge', (req, res) => {
    const db = openDatabase();
    const result = buildKnowledgeIndex(db, {
      limit: parseLimit(req.query.limit, 500),
    });
    db.close();

    res.json(result);
  });

  return router;
}
