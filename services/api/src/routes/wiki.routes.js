import crypto from 'node:crypto';
import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { persistWikiPages, listPersistedWikiPages } from '../db/wikiRepository.js';
import { replacePersistedWikiPages } from '../db/wikiSelectivePersistence.js';
import {
  saveWikiFileFingerprints,
  saveWikiPageDependencies,
  updateWikiBuildState,
} from '../db/wikiIncrementalRepository.js';
import { buildIncrementalWikiPlan } from '../knowledge/wikiIncrementalService.js';
import { buildSelectiveReplacementPlan } from '../knowledge/wikiSelectiveRebuildService.js';
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

  router.get('/wiki/rebuild-plan', (_req, res) => {
    const db = openDatabase();

    const plan = buildIncrementalWikiPlan(db);

    db.close();

    res.json({ plan });
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

      const replacementPlan = buildSelectiveReplacementPlan(db, generatedWiki);

      let wiki;

      if (replacementPlan.strategy === 'selective-replacement') {
        const affectedPageIds = new Set(
          replacementPlan.pages_to_replace.map((page) => page.id)
        );

        const pagesToReplace = generatedWiki.pages.filter((page) =>
          affectedPageIds.has(page.id)
        );

        wiki = replacePersistedWikiPages(
          db,
          pagesToReplace,
          generatedWiki.generated_at
        );

        updateWikiBuildState(
          db,
          'last_incremental_build_at',
          new Date().toISOString()
        );
      } else {
        wiki = persistWikiPages(db, generatedWiki);

        updateWikiBuildState(
          db,
          'last_full_build_at',
          new Date().toISOString()
        );
      }

      saveWikiPageDependencies(db, generatedWiki.pages || []);
      saveWikiFileFingerprints(db, buildFingerprintsFromWiki(generatedWiki));

      updateWikiBuildState(db, 'last_page_count', String(wiki.page_count || 0));

      db.close();

      res.json({
        generated: insightResult.generated,
        replacement_plan: replacementPlan,
        wiki,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
