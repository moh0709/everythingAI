import crypto from 'node:crypto';
import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { persistWikiPages, listPersistedWikiPages } from '../db/wikiRepository.js';
import {
  saveWikiFileFingerprints,
  saveWikiPageDependencies,
  updateWikiBuildState,
} from '../db/wikiIncrementalRepository.js';
import { generateFileInsights } from '../insights/insightService.js';
import { buildWikiPages } from '../knowledge/knowledgeService.js';
import { parseLimit } from '../utils/request.js';

function buildFingerprintsFromWiki(wiki) {
  const fingerprints = new Map();

  for (const page of wiki?.pages || []) {
    for (const source of page.sources || []) {
      if (!source.file_id) continue;

      const combinedText = [
        source.evidence || '',
        ...(source.chunks || []).map((chunk) => chunk.text || chunk.evidence || ''),
      ].join('\n');

      fingerprints.set(source.file_id, {
        file_id: source.file_id,
        absolute_path: source.absolute_path || null,
        content_hash: crypto
          .createHash('sha1')
          .update(combinedText)
          .digest('hex'),
        content_length: combinedText.length,
        extracted_at: new Date().toISOString(),
      });
    }
  }

  return [...fingerprints.values()];
}

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

      saveWikiPageDependencies(db, wiki.pages || []);
      saveWikiFileFingerprints(db, buildFingerprintsFromWiki(wiki));

      updateWikiBuildState(db, 'last_full_build_at', new Date().toISOString());
      updateWikiBuildState(db, 'last_page_count', String(wiki.page_count || 0));

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
