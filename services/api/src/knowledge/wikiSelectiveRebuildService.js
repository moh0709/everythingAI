import { buildIncrementalWikiPlan } from './wikiIncrementalService.js';

function buildAffectedPageMap(wiki) {
  const map = new Map();

  for (const page of wiki?.pages || []) {
    map.set(page.id, page);
  }

  return map;
}

export function selectPagesForIncrementalRebuild(db, wiki) {
  const plan = buildIncrementalWikiPlan(db);
  const pageMap = buildAffectedPageMap(wiki);

  const affectedPages = [];
  const unaffectedPages = [];

  for (const page of wiki?.pages || []) {
    const affected = plan.affected_pages.some(
      (item) => item.page_id === page.id
    );

    if (affected) {
      affectedPages.push(page);
    } else {
      unaffectedPages.push(page);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    changed_file_count: plan.changed_file_count,
    affected_page_count: affectedPages.length,
    unaffected_page_count: unaffectedPages.length,
    affected_pages: affectedPages,
    unaffected_pages: unaffectedPages,
    changed_files: plan.changed_files,
  };
}

export function buildSelectiveReplacementPlan(db, wiki) {
  const selection = selectPagesForIncrementalRebuild(db, wiki);

  return {
    generated_at: selection.generated_at,
    strategy: selection.changed_file_count > 0
      ? 'selective-replacement'
      : 'no-op',
    changed_file_count: selection.changed_file_count,
    affected_page_count: selection.affected_page_count,
    preserve_page_count: selection.unaffected_page_count,
    pages_to_replace: selection.affected_pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      page_type: page.page_type,
    })),
    pages_preserved: selection.unaffected_pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      page_type: page.page_type,
    })),
    changed_files: selection.changed_files,
  };
}
