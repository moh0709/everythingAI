import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { searchFiles } from '../search/searchService.js';
import { semanticSearchFiles } from '../search/semanticSearch.js';
import { generateEmbeddings } from '../embeddings/embeddingService.js';
import { answerFromLocalFiles } from '../ai/chatPipeline.js';
import { requireBodyString, requireQueryString, parseLimit } from '../utils/request.js';

export function createSearchRouter() {
  const router = Router();

  router.get('/search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const db = openDatabase();
    const results = searchFiles(db, {
      query,
      limit: parseLimit(req.query.limit, 20),
    });
    db.close();

    res.json({ results });
  });

  router.get('/semantic-search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const db = openDatabase();
    const results = semanticSearchFiles(db, {
      query,
      limit: parseLimit(req.query.limit, 10),
    });
    db.close();

    res.json({ results });
  });

  router.post('/embeddings', (req, res) => {
    const db = openDatabase();
    const result = generateEmbeddings(db, {
      fileId: req.body?.fileId,
      limit: parseLimit(req.body?.limit, 1000),
    });
    db.close();

    res.json(result);
  });

  router.post('/chat', async (req, res, next) => {
    try {
      const question = requireBodyString(req, res, 'question');
      if (!question) return;

      const db = openDatabase();
      const result = await answerFromLocalFiles(db, {
        question,
        limit: parseLimit(req.body?.limit, 5),
      });
      db.close();

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
