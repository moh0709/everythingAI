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

const results = [
  {
    id: 'hybrid-pdf',
    filename: 'Hybrid Contract.pdf',
    absolute_path: '/tmp/Hybrid Contract.pdf',
    relative_path: 'Hybrid Contract.pdf',
    extension: 'pdf',
    size_bytes: 400,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    snippet: 'Renewable obligations apply to the supplier agreement.',
    search_match: {
      basis: 'keyword + semantic',
      keyword_rank: 1,
      semantic_rank: 2,
      semantic_score: 0.82,
      explanation: 'Matched indexed text and semantic similarity.',
    },
  },
  {
    id: 'semantic-txt',
    filename: 'Semantic Notes.txt',
    absolute_path: '/tmp/Semantic Notes.txt',
    relative_path: 'Semantic Notes.txt',
    extension: 'txt',
    size_bytes: 240,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    snippet: 'Alternative terminology describing renewable commitments.',
    search_match: {
      basis: 'semantic',
      keyword_rank: null,
      semantic_rank: 1,
      semantic_score: 0.91,
      explanation: 'Matched semantic similarity to extracted content.',
    },
  },
  {
    id: 'keyword-pdf',
    filename: 'Keyword Appendix.pdf',
    absolute_path: '/tmp/Keyword Appendix.pdf',
    relative_path: 'Keyword Appendix.pdf',
    extension: 'pdf',
    size_bytes: 180,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    snippet: 'Renewable obligations appear literally in the appendix.',
    search_match: {
      basis: 'keyword',
      keyword_rank: 2,
      semantic_rank: null,
      semantic_score: null,
      explanation: 'Matched indexed filename, path, or extracted text.',
    },
  },
];

test('search refinement filters current-query results without changing match facts or query context', async ({ page }) => {
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [] } });
  });

  await page.route('**/api/unified-search?*', async (route) => {
    await route.fulfill({
      json: {
        query: 'renewable obligations',
        files: [results[0], results[2]],
        semantic: [results[1], results[0]],
        ranked_files: results,
        insights: [],
        labels: [],
        suggestions: [],
        executions: [],
        totals: { files: 2, semantic: 2, ranked_files: 3, insights: 0, labels: 0, suggestions: 0, executions: 0 },
      },
    });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('renewable obligations');
  await page.getByRole('button', { name: 'Search Files' }).click();

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Hybrid Contract.pdf');
  await expect(rows.nth(1)).toContainText('Semantic Notes.txt');
  await expect(rows.nth(2)).toContainText('Keyword Appendix.pdf');

  await page.getByLabel('Filter search results by file type').selectOption('pdf');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Hybrid Contract.pdf');
  await expect(rows.nth(1)).toContainText('Keyword Appendix.pdf');
  await expect(page.getByRole('button', { name: 'File type: .pdf ×' })).toBeVisible();
  await expect(searchInput).toHaveValue('renewable obligations');

  await page.getByLabel('Filter search results by match basis').selectOption('semantic');
  await expect(rows).toHaveCount(0);
  const filteredEmptyStatus = page.locator('.status-strip[role="status"]');
  await expect(filteredEmptyStatus).toContainText('No current-query results match the active filters');
  await expect(filteredEmptyStatus).toContainText('restore the underlying search results');

  await page.getByRole('button', { name: 'File type: .pdf ×' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText('Semantic Notes.txt');
  await expect(page.getByLabel('Search match for Semantic Notes.txt')).toContainText('Matched semantic similarity to extracted content.');
  await expect(page.getByLabel('Search match for Semantic Notes.txt')).toContainText('ranking signal, not confidence');

  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Hybrid Contract.pdf');
  await expect(rows.nth(1)).toContainText('Semantic Notes.txt');
  await expect(rows.nth(2)).toContainText('Keyword Appendix.pdf');
  await expect(searchInput).toHaveValue('renewable obligations');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-search-refinement.png`,
    fullPage: true,
  });
});
