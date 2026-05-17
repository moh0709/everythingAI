import { openDatabase } from '../db/client.js';
import { buildWikiPages } from '../knowledge/knowledgeService.js';
import { buildIncrementalWikiPlan } from '../knowledge/wikiIncrementalService.js';
import { buildSelectiveReplacementPlan } from '../knowledge/wikiSelectiveRebuildService.js';
import { persistWikiPages } from '../db/wikiRepository.js';
import { replacePersistedWikiPages } from '../db/wikiSelectivePersistence.js';
import {
  saveWikiFileFingerprints,
  saveWikiPageDependencies,
  updateWikiBuildState,
} from '../db/wikiIncrementalRepository.js';

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
        content_hash: combinedText,
        content_length: combinedText.length,
        extracted_at: new Date().toISOString(),
      });
    }
  }

  return [...fingerprints.values()];
}

export async function runOperationalWikiRebuild({ update, limit = 500, filePageLimit = 50 }) {
  const db = openDatabase();

  try {
    update('planning', 10, {
      message: 'Building incremental rebuild plan',
    });

    const incrementalPlan = buildIncrementalWikiPlan(db);

    update('wiki-generation', 30, {
      changed_files: incrementalPlan.changed_file_count,
      affected_pages: incrementalPlan.affected_page_count,
    });

    const generatedWiki = buildWikiPages(db, {
      limit,
      filePageLimit,
    });

    update('selective-analysis', 55, {
      message: 'Calculating selective replacement plan',
    });

    const replacementPlan = buildSelectiveReplacementPlan(db, generatedWiki);

    let persistedWiki;

    if (replacementPlan.strategy === 'selective-replacement') {
      const affectedPageIds = new Set(
        replacementPlan.pages_to_replace.map((page) => page.id)
      );

      const pagesToReplace = generatedWiki.pages.filter((page) =>
        affectedPageIds.has(page.id)
      );

      update('selective-replacement', 75, {
        replacing_pages: pagesToReplace.length,
      });

      persistedWiki = replacePersistedWikiPages(
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
      update('full-persist', 75, {
        message: 'Persisting full wiki snapshot',
      });

      persistedWiki = persistWikiPages(db, generatedWiki);

      updateWikiBuildState(
        db,
        'last_full_build_at',
        new Date().toISOString()
      );
    }

    update('metadata-sync', 90, {
      page_count: persistedWiki.page_count,
    });

    saveWikiPageDependencies(db, generatedWiki.pages || []);
    saveWikiFileFingerprints(db, buildFingerprintsFromWiki(generatedWiki));

    updateWikiBuildState(
      db,
      'last_page_count',
      String(persistedWiki.page_count || 0)
    );

    return {
      incremental_plan: incrementalPlan,
      replacement_plan: replacementPlan,
      wiki: persistedWiki,
    };
  } finally {
    db.close();
  }
}
