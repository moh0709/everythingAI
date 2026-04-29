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
        useProvider: req.body?.useProvider === true,
        provider: req.body?.provider,
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

  router.post('/knowledge/build', async (req, res, next) => {
    try {
      const db = openDatabase();
      const limit = parseLimit(req.body?.limit, 500);
      const insightResult = await generateFileInsights(db, {
        limit,
        useOllama: req.body?.useOllama === true,
        useProvider: req.body?.useProvider === true,
        provider: req.body?.provider,
      });
      const knowledge = buildKnowledgeIndex(db, { limit });
      db.close();

      res.json({
        generated: insightResult.generated,
        knowledge,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
