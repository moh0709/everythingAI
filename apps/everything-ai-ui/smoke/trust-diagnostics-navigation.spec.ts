import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const fixtureWiki = {
  generated_at: '2026-08-24T02:00:00.000Z',
  page_count: 2,
  pages: [
    {
      id: 'kb-governance-policy',
      title: 'Governance Policy',
      slug: 'governance-policy',
      page_type: 'topic',
      category: 'Governance',
      subcategory: 'Policy',
      summary: 'Policy controls backed by persisted evidence.',
      markdown: '# Governance Policy\n\nApproved governance controls.',
      sections: [],
      sources: [],
      related_topics: [],
      citation_coverage_score: 1,
      weak_source_warning: false,
    },
    {
      id: 'kb-review-guide',
      title: 'Review Guide',
      slug: 'review-guide',
      page_type: 'topic',
      category: 'Governance',
      subcategory: 'Review',
      summary: 'Human review guidance.',
      markdown: '# Review Guide\n\nReview evidence before approval.',
      sections: [],
      sources: [],
      related_topics: [],
      citation_coverage_score: 1,
      weak_source_warning: false,
    },
  ],
};

const fixtureDiagnostics = {
  generated_at: '2026-08-24T02:00:00.000Z',
  page_stats: { total_pages: 2, active_pages: 2, stale_pages: 0, failed_pages: 0, archived_pages: 0 },
  evidence_stats: { section_count: 2, source_count: 2, chunk_count: 2, relation_count: 0 },
  workspace_trust_health: {
    status: 'warning', quality_score: 78, quality_grade: 'B', page_count: 2,
    grade_counts: { A: 0, B: 2, C: 0, D: 0, F: 0 }, reasons: ['Human review is incomplete.'],
  },
  validation_summary: {
    status: 'attention_required', page_count: 2,
    counts: { unreviewed: 1, reviewed: 0, approved: 0, needs_attention: 1, rejected: 0 },
    conflict_count: 1,
    review_candidate_count: 2,
    conflicts: [
      {
        page_id: 'kb-governance-policy', title: 'Governance Policy', quality_grade: 'B', quality_score: 82,
        human_validation: 'needs_attention', flags: { high_quality_attention: true },
      },
    ],
    review_candidates: [
      {
        page_id: 'kb-review-guide', title: 'Review Guide', quality_grade: 'B', quality_score: 80,
        human_validation: 'unreviewed', flags: { high_quality_unreviewed: true },
      },
      {
        page_id: 'kb-missing-page', title: 'Missing Persisted Page', quality_grade: 'B', quality_score: 79,
        human_validation: 'unreviewed', flags: { high_quality_unreviewed: true },
      },
    ],
    reasons: ['One conflict requires attention.'],
  },
  quality_summary: [],
  build_state: [],
  fingerprints: [],
  dependencies: [],
  rebuilds: [],
};

test('trust diagnostics navigate only to exact persisted Knowledge Base page ids', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.route('**/api/wiki/diagnostics', async (route) => {
    await route.fulfill({ json: { diagnostics: fixtureDiagnostics } });
  });
  await page.route('**/api/wiki/jobs', async (route) => {
    await route.fulfill({ json: { jobs: [] } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Knowledge Base' }).click();

  const conflict = page.getByRole('button', { name: 'Open knowledge page Governance Policy from governance diagnostics' });
  await expect(conflict).toContainText('Grade B');
  await expect(conflict).toContainText('82/100');
  await expect(conflict).toContainText('needs_attention');
  await conflict.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Governance Policy' })).toBeVisible();

  const candidate = page.getByRole('button', { name: 'Open knowledge page Review Guide from governance diagnostics' });
  await candidate.click();
  await expect(page.getByRole('heading', { name: 'Review Guide' })).toBeVisible();

  const missingRow = page.getByText('Missing Persisted Page').locator('..');
  await expect(missingRow).toContainText('Grade B');
  await expect(missingRow).toContainText('79/100');
  await expect(page.getByRole('button', { name: 'Open knowledge page Missing Persisted Page from governance diagnostics' })).toHaveCount(0);
});
