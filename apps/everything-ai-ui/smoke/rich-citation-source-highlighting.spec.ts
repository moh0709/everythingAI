import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

const fixtureWiki = {
  generated_at: '2026-08-23T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'phase2-rich-citation-page',
      title: 'Phase 2 Citation Evidence',
      slug: 'phase-2-citation-evidence',
      page_type: 'topic',
      summary: 'Deterministic source-backed evidence used to validate citation inspection.',
      markdown: '# Phase 2 Citation Evidence\n\nSupplier Delta uses fourteen-day payment terms [S1:C1].',
      source_file_ids: ['phase2-source-file'],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'phase2-page-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: 'phase2-source-file',
          filename: 'phase2-citation-evidence.txt',
          absolute_path: '/tmp/phase2-citation-evidence.txt',
          relative_path: 'phase2-citation-evidence.txt',
          location: 'Lines 1-2',
          evidence: 'Supplier Delta. Payment terms 14 days.',
          source_hash: 'phase2-source-hash',
          chunks: [
            {
              id: 'phase2-source-chunk',
              ref: 'C1',
              chunk_ref: 'C1',
              source_ref: 'S1',
              chunk_number: 1,
              stable_chunk_key: 'phase2-stable-chunk-key',
              line_start: 1,
              line_end: 2,
              location: 'Lines 1-2',
              text: 'Supplier Delta. Payment terms 14 days.',
              evidence: 'Supplier Delta. Payment terms 14 days.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'phase2-source-fingerprint',
      updated_at: '2026-08-23T00:00:00.000Z',
    },
  ],
};

test('rich citation keeps article, source, and chunk evidence visibly connected', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Knowledge Base' }).click();

  await expect(page.getByRole('heading', { name: 'Phase 2 Citation Evidence' })).toBeVisible();
  await expect(page.getByText('100% citation coverage', { exact: true })).toBeVisible();

  const citation = page.getByRole('button', { name: 'Inspect citation [S1:C1]' });
  await expect(citation).toBeVisible();
  await citation.click();

  const activeCitation = page.locator('.wiki-source-ref-btn.active').filter({ hasText: '[S1:C1]' });
  await expect(activeCitation).toHaveAttribute('aria-current', 'location');
  await expect(activeCitation).toHaveAttribute('aria-label', 'Inspect active citation [S1:C1]');
  await expect(page.getByLabel('Focused citation details')).toContainText('phase2-citation-evidence.txt');
  await expect(page.getByLabel('Focused citation details')).toContainText('S1:C1');

  const sourceCard = page.locator('.wiki-source-card-active');
  await expect(sourceCard).toContainText('[S1] phase2-citation-evidence.txt');
  await expect(sourceCard).toContainText('This source supports the active citation');

  const drawer = page.getByLabel('Source preview drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('phase2-citation-evidence.txt');
  await expect(drawer).toContainText('[S1:C1]');
  await expect(drawer.getByText('Connected source snippet')).toBeVisible();
  await expect(drawer.getByText('Supplier Delta. Payment terms 14 days.', { exact: true }).first()).toBeVisible();
  await expect(drawer.locator('.wiki-source-preview-chunk.active')).toContainText('Active citation');

  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/phase2-rich-citation-source-highlighting.png`,
    fullPage: true,
  });
});
