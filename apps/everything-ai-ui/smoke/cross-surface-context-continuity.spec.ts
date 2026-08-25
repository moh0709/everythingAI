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

const sourceFile = {
  id: 'context-source-file',
  filename: 'context-source.txt',
  extension: 'txt',
  size: 128,
  absolute_path: '/tmp/context-source.txt',
  relative_path: 'context-source.txt',
  index_status: 'indexed',
  extraction_status: 'extracted',
};

const fixtureWiki = {
  generated_at: '2026-08-25T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'context-origin-page',
      title: 'Context Origin Knowledge',
      slug: 'context-origin-knowledge',
      page_type: 'topic',
      summary: 'Knowledge page used to prove source-inspection return continuity.',
      markdown: '# Context Origin Knowledge\n\nThis statement is backed by the source [S1:C1].',
      source_file_ids: ['context-source-file'],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'context-page-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: 'context-source-file',
          filename: 'context-source.txt',
          absolute_path: '/tmp/context-source.txt',
          relative_path: 'context-source.txt',
          location: 'Lines 1-2',
          evidence: 'Context continuity evidence.',
          source_hash: 'context-source-hash',
          chunks: [
            {
              id: 'context-source-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
              stable_chunk_key: 'context-source-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
              text: 'Context continuity evidence.', evidence: 'Context continuity evidence.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'context-origin-fingerprint',
      updated_at: '2026-08-25T00:00:00.000Z',
    },
  ],
};

test('source inspection preserves Knowledge Base origin and current query without inventing direct-navigation context', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [sourceFile] } });
  });
  await page.route('**/api/intelligence/document-context/context-source-file', async (route) => {
    await route.fulfill({
      json: {
        document: {
          file: sourceFile,
          previewText: 'Context continuity evidence.',
          source_reference: {
            file_id: sourceFile.id,
            filename: sourceFile.filename,
            absolute_path: sourceFile.absolute_path,
            relative_path: sourceFile.relative_path,
          },
        },
      },
    });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Sources & Files' }).click();
  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('contract delta');

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await expect(page.getByRole('heading', { name: 'Context Origin Knowledge' })).toBeVisible();

  const sourceCard = page.locator('.wiki-source-card').filter({ hasText: 'context-source.txt' });
  await sourceCard.getByRole('button', { name: 'Open file context' }).click();

  const navigationContext = page.getByLabel('Navigation context');
  await expect(navigationContext).toBeVisible();
  await expect(navigationContext).toContainText('Context Origin Knowledge');
  await expect(page.getByRole('heading', { name: 'Sources & Files' })).toBeVisible();
  await expect(searchInput).toHaveValue('contract delta');
  await expect(page.getByText('Context loaded: context-source.txt')).toBeVisible();

  await navigationContext.getByRole('button', { name: 'Back to Knowledge Base' }).click();
  await expect(page.getByRole('heading', { name: 'Context Origin Knowledge' })).toBeVisible();

  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await expect(page.getByLabel('Navigation context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to Knowledge Base' })).toHaveCount(0);
  await expect(searchInput).toHaveValue('contract delta');

  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-cross-surface-context-continuity.png`,
    fullPage: true,
  });
});
