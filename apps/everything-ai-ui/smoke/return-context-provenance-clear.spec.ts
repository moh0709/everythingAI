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

const originSource = {
  id: 'provenance-origin-source',
  filename: 'Provenance Origin.txt',
  absolute_path: '/tmp/Provenance Origin.txt',
  relative_path: 'Provenance Origin.txt',
  extension: 'txt',
  size_bytes: 420,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

const fixtureWiki = {
  generated_at: '2026-08-25T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'provenance-origin-page',
      title: 'Provenance Origin Knowledge',
      slug: 'provenance-origin-knowledge',
      page_type: 'topic',
      summary: 'Knowledge page used to prove return-context provenance visibility and clearing.',
      markdown: '# Provenance Origin Knowledge\n\nEvidence is linked to the source [S1:C1].',
      source_file_ids: [originSource.id],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'provenance-page-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: originSource.id,
          filename: originSource.filename,
          absolute_path: originSource.absolute_path,
          relative_path: originSource.relative_path,
          location: 'Lines 1-2',
          evidence: 'Provenance evidence.',
          source_hash: 'provenance-source-hash',
          chunks: [
            {
              id: 'provenance-source-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
              stable_chunk_key: 'provenance-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
              text: 'Provenance evidence.', evidence: 'Provenance evidence.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'provenance-origin-fingerprint',
      updated_at: '2026-08-25T00:00:00.000Z',
    },
  ],
};

const documentContext = {
  file: originSource,
  source_reference: { source_label: originSource.filename, relative_path: originSource.relative_path },
  extracted_text: null,
  insight: null,
};

test('remembered return provenance is visible and can be cleared without mutation or inferred reconstruction', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [originSource] } });
  });
  await page.route('**/api/intelligence/document-context/provenance-origin-source', async (route) => {
    await route.fulfill({ json: { document: documentContext } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('provenance contract');

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await expect(page.getByRole('heading', { name: 'Provenance Origin Knowledge' })).toBeVisible();

  const sourceCard = page.locator('.wiki-source-card').filter({ hasText: originSource.filename });
  await sourceCard.getByRole('button', { name: 'Open file context' }).click();

  const navigationContext = page.getByLabel('Navigation context');
  await expect(navigationContext).toBeVisible();
  await expect(navigationContext.getByLabel('Remembered return provenance')).toContainText('Knowledge Base → “Provenance Origin Knowledge”');
  await expect(searchInput).toHaveValue('provenance contract');

  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${request.url()}`);
  });

  await navigationContext.getByRole('button', { name: 'Clear return context' }).click();
  await expect(page.getByLabel('Navigation context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to Knowledge Base' })).toHaveCount(0);
  await expect(searchInput).toHaveValue('provenance contract');
  await expect(page.locator('tr.selected')).toContainText(originSource.filename);
  expect(mutationRequests).toEqual([]);

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await sourceCard.getByRole('button', { name: 'Open file context' }).click();
  await page.getByRole('button', { name: 'Open source recovery' }).click();

  const recoveryContext = page.getByLabel('Recovery navigation context');
  await expect(recoveryContext.getByLabel('Remembered return provenance')).toContainText('Sources & Files → “Provenance Origin.txt” → Knowledge Base → “Provenance Origin Knowledge”');
  await expect(recoveryContext).toContainText('only the navigation origin');
  await expect(page.getByLabel('Source-root recovery context')).toContainText('Recovery is scoped to the configured source root');

  mutationRequests.length = 0;
  await recoveryContext.getByRole('button', { name: 'Clear return context' }).click();
  await expect(page.getByLabel('Recovery navigation context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to Sources & Files' })).toHaveCount(0);
  expect(mutationRequests).toEqual([]);

  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await expect(page.getByLabel('Navigation context')).toHaveCount(0);
  await expect(searchInput).toHaveValue('provenance contract');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-return-context-provenance-clear.png`,
    fullPage: true,
  });
});
