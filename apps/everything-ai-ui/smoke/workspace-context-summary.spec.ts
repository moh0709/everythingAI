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
  id: 'workspace-context-origin-source',
  filename: 'Workspace Context Origin.txt',
  absolute_path: '/tmp/context-root/Workspace Context Origin.txt',
  relative_path: 'Workspace Context Origin.txt',
  extension: 'txt',
  size_bytes: 420,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

const unrelatedSource = {
  id: 'workspace-context-unrelated-source',
  filename: 'Unrelated Source.txt',
  absolute_path: '/tmp/context-root/Unrelated Source.txt',
  relative_path: 'Unrelated Source.txt',
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
      id: 'workspace-context-origin-page',
      title: 'Workspace Context Knowledge',
      slug: 'workspace-context-knowledge',
      page_type: 'topic',
      summary: 'Knowledge page used to prove the read-only workspace context summary.',
      markdown: '# Workspace Context Knowledge\n\nEvidence is linked to the source [S1:C1].',
      source_file_ids: [originSource.id],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'workspace-context-page-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: originSource.id,
          filename: originSource.filename,
          absolute_path: originSource.absolute_path,
          relative_path: originSource.relative_path,
          location: 'Lines 1-2',
          evidence: 'Workspace context evidence.',
          source_hash: 'workspace-context-source-hash',
          chunks: [
            {
              id: 'workspace-context-source-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
              stable_chunk_key: 'workspace-context-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
              text: 'Workspace context evidence.', evidence: 'Workspace context evidence.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'workspace-context-origin-fingerprint',
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

test('workspace context summary exposes only genuine read-only context and never substitutes stale sources', async ({ page }) => {
  let files = [originSource, unrelatedSource];

  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/context-root');
  });

  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files } });
  });
  await page.route('**/api/intelligence/document-context/workspace-context-origin-source', async (route) => {
    await route.fulfill({ json: { document: documentContext } });
  });

  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('workspace contract');

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  const sourceCard = page.locator('.wiki-source-card').filter({ hasText: originSource.filename });
  await sourceCard.getByRole('button', { name: 'Open file context' }).click();

  const summary = page.getByLabel('Workspace context summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Query: “workspace contract”');
  await expect(summary).toContainText(`Selected source: “${originSource.filename}”`);
  await expect(summary).toContainText('Knowledge Base origin: “Workspace Context Knowledge”');
  await expect(summary).toContainText('Configured source root: /tmp/context-root');
  await expect(summary).toContainText('Safe return target: Knowledge Base');
  expect(mutationRequests).toEqual([]);

  await page.getByRole('button', { name: 'Open source recovery' }).click();
  await expect(summary).toContainText('Safe return target: Sources & Files');
  await expect(summary).toContainText('Recovery scope remains the configured source root; the selected source is navigation context only.');
  expect(mutationRequests).toEqual([]);

  await page.getByRole('button', { name: 'Back to Sources & Files' }).click();
  files = [unrelatedSource];
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  await expect(summary).toContainText('Selected source: unavailable; no replacement source is inferred.');
  await expect(summary).not.toContainText(`Selected source: “${unrelatedSource.filename}”`);
  await expect(summary).toContainText('Knowledge Base origin: “Workspace Context Knowledge”');
  expect(mutationRequests).toEqual([]);

  await page.getByLabel('Navigation context').getByRole('button', { name: 'Clear return context' }).click();
  await expect(summary).toContainText('Knowledge Base origin: none recorded.');
  await expect(summary).toContainText('Safe return target: none recorded.');
  expect(mutationRequests).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-workspace-context-summary.png`,
    fullPage: true,
  });
});
