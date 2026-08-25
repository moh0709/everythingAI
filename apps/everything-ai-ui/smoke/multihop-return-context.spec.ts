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
  id: 'multihop-origin-source',
  filename: 'Multihop Origin.txt',
  absolute_path: '/tmp/Multihop Origin.txt',
  relative_path: 'Multihop Origin.txt',
  extension: 'txt',
  size_bytes: 420,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

const alternateSource = {
  id: 'multihop-alternate-source',
  filename: 'Alternate Source.txt',
  absolute_path: '/tmp/Alternate Source.txt',
  relative_path: 'Alternate Source.txt',
  extension: 'txt',
  size_bytes: 256,
  index_status: 'indexed',
  extraction_status: 'extracted',
};

const fixtureWiki = {
  generated_at: '2026-08-25T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'multihop-origin-page',
      title: 'Multihop Origin Knowledge',
      slug: 'multihop-origin-knowledge',
      page_type: 'topic',
      summary: 'Knowledge page used to prove multi-hop return continuity.',
      markdown: '# Multihop Origin Knowledge\n\nEvidence is linked to the failed source [S1:C1].',
      source_file_ids: [originSource.id],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'multihop-page-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: originSource.id,
          filename: originSource.filename,
          absolute_path: originSource.absolute_path,
          relative_path: originSource.relative_path,
          location: 'Lines 1-2',
          evidence: 'Multihop evidence.',
          source_hash: 'multihop-source-hash',
          chunks: [
            {
              id: 'multihop-source-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
              stable_chunk_key: 'multihop-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
              text: 'Multihop evidence.', evidence: 'Multihop evidence.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'multihop-origin-fingerprint',
      updated_at: '2026-08-25T00:00:00.000Z',
    },
  ],
};

function documentFor(file: typeof originSource | typeof alternateSource) {
  return {
    file,
    source_reference: { source_label: file.filename, relative_path: file.relative_path },
    extracted_text: file.extraction_status === 'extracted' ? 'Alternate extracted text.' : null,
    insight: null,
  };
}

test('multi-hop return keeps genuine knowledge/source origin and never substitutes a missing source', async ({ page }) => {
  let currentFiles = [originSource, alternateSource];

  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: currentFiles } });
  });
  await page.route('**/api/intelligence/document-context/multihop-origin-source', async (route) => {
    await route.fulfill({ json: { document: documentFor(originSource) } });
  });
  await page.route('**/api/intelligence/document-context/multihop-alternate-source', async (route) => {
    await route.fulfill({ json: { document: documentFor(alternateSource) } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('multihop contract delta');

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await expect(page.getByRole('heading', { name: 'Multihop Origin Knowledge' })).toBeVisible();

  const sourceCard = page.locator('.wiki-source-card').filter({ hasText: originSource.filename });
  await sourceCard.getByRole('button', { name: 'Open file context' }).click();

  const navigationContext = page.getByLabel('Navigation context');
  await expect(navigationContext).toContainText('Multihop Origin Knowledge');
  await expect(searchInput).toHaveValue('multihop contract delta');
  await expect(page.getByLabel('Selected source lifecycle guidance')).toContainText('Current state: Extraction failed');

  await page.getByRole('button', { name: 'Open source recovery' }).click();
  const recoveryContext = page.getByLabel('Recovery navigation context');
  await expect(recoveryContext).toContainText(originSource.filename);
  await expect(recoveryContext).toContainText('only the navigation origin');
  await expect(page.getByLabel('Source-root recovery context')).toContainText('Recovery is scoped to the configured source root');

  await recoveryContext.getByRole('button', { name: 'Back to Sources & Files' }).click();
  await expect(navigationContext).toContainText('Multihop Origin Knowledge');
  await expect(searchInput).toHaveValue('multihop contract delta');
  await expect(page.locator('tr.selected')).toContainText(originSource.filename);

  currentFiles = [alternateSource];
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  await expect(page.getByText('Loaded 1 file(s).')).toBeVisible();
  await expect(page.locator('tr.selected')).toHaveCount(0);
  await expect(page.getByLabel('Selected source lifecycle guidance')).toHaveCount(0);
  await expect(navigationContext).toContainText('Multihop Origin Knowledge');

  await navigationContext.getByRole('button', { name: 'Back to Knowledge Base' }).click();
  await expect(page.getByRole('heading', { name: 'Multihop Origin Knowledge' })).toBeVisible();

  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await expect(page.getByLabel('Navigation context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to Knowledge Base' })).toHaveCount(0);
  await expect(searchInput).toHaveValue('multihop contract delta');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-multihop-return-context.png`,
    fullPage: true,
  });
});
