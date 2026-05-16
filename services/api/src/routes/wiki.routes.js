import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { persistWikiPages, listPersistedWikiPages } from '../db/wikiRepository.js';
import { generateFileInsights } from '../insights/insightService.js';
import { buildWikiPages } from '../knowledge/knowledgeService.js';
import { parseLimit } from '../utils/request.js';

export function createWikiRouter() {
  const router = Router();

  router.get('/wiki', (req, res) => {
    const db = openDatabase();

    const limit = parseLimit(req.query.limit, 500);
    const filePageLimit = parseLimit(req.query.filePageLimit, 50);

    const persistedWiki = listPersistedWikiPages(db, { limit });
    const wiki = persistedWiki || buildWikiPages(db, { limit, filePageLimit });

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

      const generatedWiki = buildWikiPages(db, { limit, filePageLimit });
      const wiki = persistWikiPages(db, generatedWiki);

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
