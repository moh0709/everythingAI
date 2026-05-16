import { Router } from 'express';
import { openDatabase, listFileInsights } from '../db/client.js';
import { generateFileInsights } from '../insights/insightService.js';
import { findDuplicateFiles } from '../duplicates/duplicateService.js';
import { buildKnowledgeIndex, buildWikiPages } from '../knowledge/knowledgeService.js';
import { createDocumentContext } from '../documents/documentContextService.js';
import { parseLimit } from '../utils/request.js';

export function createIntelligenceRouter() {
  const router = Router();

  router.get('/intelligence/document-context/:fileId', (req, res) => {
    const db = openDatabase();
    const document = createDocumentContext(db, {
      fileId: req.params.fileId,
      previewLimit: parseLimit(req.query.previewLimit, 5000),
    });
    db.close();

    if (!document) {
      return res.status(404).json({ error: 'Document context not found.' });
    }

    return res.json({ document });
  });

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

  router.get('/wiki', (req, res) => {
    const db = openDatabase();
    const wiki = buildWikiPages(db, {
      limit: parseLimit(req.query.limit, 500),
      filePageLimit: parseLimit(req.query.filePageLimit, 50),
    });
    db.close();

    res.json({ wiki });
  });

  router.post('/wiki/build', async (req, res, next) => {
    try {
      const db = openDatabase();
      const limit = parseLimit(req.body?.limit, 500);
      const filePageLimit = parseLimit(req.body?.filePageLimit, 50);
      const insightResult = await generateFileInsights(db, {
        limit,
        useOllama: req.body?.useOllama === true,
        useProvider: req.body?.useProvider === true,
        provider: req.body?.provider,
      });
      const wiki = buildWikiPages(db, { limit, filePageLimit });
      db.close();

      res.json({
        generated: insightResult.generated,
        wiki,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
