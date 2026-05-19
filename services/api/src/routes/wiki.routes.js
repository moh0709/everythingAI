import crypto from 'node:crypto';
import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import {
  getPersistedWikiChunkByRef,
  getPersistedWikiPageBySlug,
  getPersistedWikiPageEvidence,
  listPersistedWikiPages,
  persistWikiPages,
  recordWikiRebuild,
} from '../db/wikiRepository.js';
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
import { createWikiJobsRouter } from './wikiJobs.routes.js';

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

function closeAndSend(db, res, payload, status = 200) {
  db.close();
  return res.status(status).json(payload);
}

export function createWikiRouter({ openDb = openDatabase } = {}) {
  const router = Router();
  router.use(createWikiJobsRouter());

  router.get('/wiki', (req, res) => {
    const db = openDb();

    const limit = parseLimit(req.query.limit, 500);
    const filePageLimit = parseLimit(req.query.filePageLimit, 50);

    const persistedWiki = listPersistedWikiPages(db, { limit });
    const wiki = persistedWiki || buildWikiPages(db, { limit, filePageLimit });

    db.close();

    res.json({ wiki });
  });

  router.get('/wiki/pages/:slug', (req, res) => {
    const db = openDb();
    const page = getPersistedWikiPageBySlug(db, req.params.slug);

    if (!page) {
      return closeAndSend(db, res, {
        error: 'Wiki page not found',
        slug: req.params.slug,
      }, 404);
    }

    return closeAndSend(db, res, { page });
  });

  router.get('/wiki/pages/:pageId/evidence', (req, res) => {
    const db = openDb();
    const evidence = getPersistedWikiPageEvidence(db, req.params.pageId);

    if (!evidence) {
      return closeAndSend(db, res, {
        error: 'Wiki page evidence not found',
        pageId: req.params.pageId,
      }, 404);
    }

    return closeAndSend(db, res, { evidence });
  });

  router.get('/wiki/pages/:pageId/chunks/:chunkRef', (req, res) => {
    const db = openDb();
    const chunk = getPersistedWikiChunkByRef(db, {
      pageId: req.params.pageId,
      chunkRef: req.params.chunkRef,
    });

    if (!chunk) {
      return closeAndSend(db, res, {
        error: 'Wiki source chunk not found',
        pageId: req.params.pageId,
        chunkRef: req.params.chunkRef,
      }, 404);
    }

    return closeAndSend(db, res, { chunk });
  });

  router.get('/wiki/rebuild-plan', (_req, res) => {
    const db = openDb();

    const plan = buildIncrementalWikiPlan(db);

    db.close();

    res.json({ plan });
  });

  router.post('/wiki/build', async (req, res, next) => {
    const db = openDb();
    const rebuildId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    try {
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

      const rebuild = recordWikiRebuild(db, {
        id: rebuildId,
        mode: replacementPlan.strategy === 'selective-replacement' ? 'selective' : 'full',
        status: 'completed',
        input: { limit, filePageLimit },
        summary: {
          generated: insightResult.generated,
          page_count: wiki.page_count || 0,
          replacement_strategy: replacementPlan.strategy,
        },
        startedAt,
        completedAt: new Date().toISOString(),
        createdAt: startedAt,
      });

      db.close();

      res.json({
        generated: insightResult.generated,
        replacement_plan: replacementPlan,
        rebuild,
        wiki,
      });
    } catch (error) {
      try {
        recordWikiRebuild(db, {
          id: rebuildId,
          mode: 'full',
          status: 'failed',
          input: {
            limit: req.body?.limit,
            filePageLimit: req.body?.filePageLimit,
          },
          summary: {},
          startedAt,
          completedAt: new Date().toISOString(),
          createdAt: startedAt,
          errorMessage: error.message,
        });
        db.close();
      } catch {
        db.close();
      }
      next(error);
    }
  });

  return router;
}
