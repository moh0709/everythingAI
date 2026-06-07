import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { searchFiles } from '../search/searchService.js';
import { semanticSearchFiles } from '../search/semanticSearch.js';
import { unifiedSearch } from '../search/unifiedSearchService.js';
import { generateEmbeddings } from '../embeddings/embeddingService.js';
import { answerFromLocalFiles } from '../ai/chatPipeline.js';
import { requireBodyString, requireQueryString, parseLimit } from '../utils/request.js';

function includeTrashed(queryValue) {
  return queryValue?.toString().toLowerCase() === 'true';
}

export function createSearchRouter() {
  const router = Router();

  router.get('/search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const db = openDatabase();
    const results = searchFiles(db, {
      query,
      limit: parseLimit(req.query.limit, 20),
      includeTrashed: includeTrashed(req.query.includeTrashed),
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
      includeTrashed: includeTrashed(req.query.includeTrashed),
    });
    db.close();

    res.json({ results });
  });

  router.get('/unified-search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const db = openDatabase();
    const result = unifiedSearch(db, {
      query,
      limit: parseLimit(req.query.limit, 20),
      includeTrashed: includeTrashed(req.query.includeTrashed),
    });
    db.close();

    res.json(result);
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

      // Only return sources that are actually referenced in the answer (by filename)
      const answer = result.answer || '';
      const allSources = result.sources || [];
      const referencedSources = allSources.filter((s) =>
        s.filename && answer.toLowerCase().includes(s.filename.toLowerCase())
      );

      res.json({ ...result, sources: referencedSources });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
