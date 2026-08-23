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
  generated_at: '2026-08-24T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'source-inspection-page',
      title: 'Source Inspection Evidence',
      slug: 'source-inspection-evidence',
      page_type: 'topic',
      summary: 'Deterministic multi-chunk evidence used to validate source inspection navigation.',
      markdown: '# Source Inspection Evidence\n\nThe approved payment window is fourteen days [S1:C2].',
      source_file_ids: ['source-inspection-file'],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'source-inspection-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: 'source-inspection-file',
          filename: 'source-inspection-evidence.txt',
          absolute_path: '/tmp/source-inspection-evidence.txt',
          relative_path: 'source-inspection-evidence.txt',
          location: 'Lines 1-6',
          evidence: 'Supplier Delta contract evidence.',
          source_hash: 'source-inspection-hash',
          chunks: [
            {
              id: 'source-inspection-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
              stable_chunk_key: 'source-inspection-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
              text: 'Supplier Delta contract starts on 1 January.', evidence: 'Supplier Delta contract starts on 1 January.',
            },
            {
              id: 'source-inspection-c2', ref: 'C2', chunk_ref: 'C2', source_ref: 'S1', chunk_number: 2,
              stable_chunk_key: 'source-inspection-stable-2', line_start: 3, line_end: 4, location: 'Lines 3-4',
              text: 'Approved payment window is fourteen days.', evidence: 'Approved payment window is fourteen days.',
            },
            {
              id: 'source-inspection-c3', ref: 'C3', chunk_ref: 'C3', source_ref: 'S1', chunk_number: 3,
              stable_chunk_key: 'source-inspection-stable-3', line_start: 5, line_end: 6, location: 'Lines 5-6',
              text: 'Renewal requires written confirmation.', evidence: 'Renewal requires written confirmation.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'source-inspection-fingerprint',
      updated_at: '2026-08-24T00:00:00.000Z',
    },
  ],
};

test('source inspection browses genuine chunks without changing the pinned citation', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await page.getByRole('button', { name: 'Inspect citation [S1:C2]' }).click();

  const drawer = page.getByLabel('Source preview drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('[S1:C2]', { exact: true })).toBeVisible();

  const navigator = drawer.getByLabel('Source chunk navigation');
  await expect(navigator).toContainText('Chunk 2 of 3');
  await expect(navigator).toContainText('Approved payment window is fourteen days.');

  const previous = navigator.getByRole('button', { name: 'Previous chunk' });
  const next = navigator.getByRole('button', { name: 'Next chunk' });
  await expect(previous).toBeEnabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(navigator).toContainText('Chunk 3 of 3');
  await expect(navigator).toContainText('Renewal requires written confirmation.');
  await expect(next).toBeDisabled();
  await expect(drawer.getByText('[S1:C2]', { exact: true })).toBeVisible();
  await expect(drawer.locator('.wiki-source-preview-chunk.active')).toContainText('C2');
  await expect(drawer.locator('.wiki-source-preview-chunk').filter({ hasText: 'C3' })).toContainText('Inspecting');

  await previous.click();
  await expect(navigator).toContainText('Chunk 2 of 3');
  await previous.click();
  await expect(navigator).toContainText('Chunk 1 of 3');
  await expect(previous).toBeDisabled();
  await expect(drawer.getByText('[S1:C2]', { exact: true })).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-source-inspection-navigation.png`,
    fullPage: true,
  });
});
