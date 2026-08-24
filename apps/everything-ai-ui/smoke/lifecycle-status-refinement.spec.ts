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

const firstResults = [
  {
    id: 'ready-pdf',
    filename: 'Ready Contract.pdf',
    absolute_path: '/tmp/Ready Contract.pdf',
    relative_path: 'Ready Contract.pdf',
    extension: 'pdf',
    size_bytes: 400,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    search_match: {
      basis: 'keyword + semantic',
      keyword_rank: 1,
      semantic_rank: 2,
      semantic_score: 0.82,
      explanation: 'Matched indexed text and semantic similarity.',
    },
  },
  {
    id: 'failed-txt',
    filename: 'Failed Notes.txt',
    absolute_path: '/tmp/Failed Notes.txt',
    relative_path: 'Failed Notes.txt',
    extension: 'txt',
    size_bytes: 240,
    index_status: 'indexed',
    extraction_status: 'failed',
    extraction_error_message: 'Parser failed.',
    recovery_status: 'active',
    search_match: {
      basis: 'semantic',
      keyword_rank: null,
      semantic_rank: 1,
      semantic_score: 0.91,
      explanation: 'Matched semantic similarity to extracted content.',
    },
  },
  {
    id: 'ready-txt',
    filename: 'Ready Notes.txt',
    absolute_path: '/tmp/Ready Notes.txt',
    relative_path: 'Ready Notes.txt',
    extension: 'txt',
    size_bytes: 260,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    search_match: {
      basis: 'keyword',
      keyword_rank: 2,
      semantic_rank: null,
      semantic_score: null,
      explanation: 'Matched indexed filename, path, or extracted text.',
    },
  },
];

const secondResults = [
  {
    id: 'second-ready',
    filename: 'Second Ready.txt',
    absolute_path: '/tmp/Second Ready.txt',
    relative_path: 'Second Ready.txt',
    extension: 'txt',
    size_bytes: 220,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    search_match: {
      basis: 'keyword',
      keyword_rank: 1,
      semantic_rank: null,
      semantic_score: null,
      explanation: 'Matched indexed filename, path, or extracted text.',
    },
  },
];

const refreshedFiles = [
  {
    id: 'base-intake',
    filename: 'Waiting Intake.docx',
    absolute_path: '/tmp/Waiting Intake.docx',
    relative_path: 'Waiting Intake.docx',
    extension: 'docx',
    size_bytes: 300,
    index_status: null,
    extraction_status: null,
    recovery_status: 'active',
  },
];

test('lifecycle-status refinement uses existing lifecycle facts and resets with result context', async ({ page }) => {
  let searchCount = 0;
  let fileRequestCount = 0;

  await page.route('**/api/files?*', async (route) => {
    fileRequestCount += 1;
    await route.fulfill({ json: { files: fileRequestCount === 1 ? [] : refreshedFiles } });
  });

  await page.route('**/api/unified-search?*', async (route) => {
    searchCount += 1;
    const rankedFiles = searchCount === 1 ? firstResults : secondResults;
    await route.fulfill({
      json: {
        query: searchCount === 1 ? 'contract notes' : 'second ready',
        files: rankedFiles,
        semantic: [],
        ranked_files: rankedFiles,
        insights: [],
        labels: [],
        suggestions: [],
        executions: [],
        totals: { files: rankedFiles.length, semantic: 0, ranked_files: rankedFiles.length, insights: 0, labels: 0, suggestions: 0, executions: 0 },
      },
    });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();

  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('contract notes');
  await page.getByRole('button', { name: 'Search Files' }).click();

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(3);

  const lifecycleFilter = page.getByLabel('Filter search results by lifecycle status');
  await expect(lifecycleFilter).toBeVisible();
  await lifecycleFilter.selectOption('extraction_failed');

  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Failed Notes.txt');
  await expect(rows.first()).toContainText('Extraction failed');
  await expect(page.getByRole('button', { name: 'Lifecycle: Extraction failed ×' })).toBeVisible();

  await page.getByLabel('Filter search results by file type').selectOption('txt');
  await page.getByLabel('Filter search results by match basis').selectOption('semantic');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Failed Notes.txt');

  await lifecycleFilter.selectOption('ready');
  await expect(rows).toHaveCount(0);
  await expect(page.getByText('No current-query results match the active filters. Clear or adjust a filter to restore the underlying search results.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(rows).toHaveCount(3);

  await lifecycleFilter.selectOption('extraction_failed');
  await searchInput.fill('second ready');
  await page.getByRole('button', { name: 'Search Files' }).click();
  await expect(searchInput).toHaveValue('second ready');
  await expect(page.getByRole('button', { name: 'Lifecycle: Extraction failed ×' })).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Second Ready.txt');

  const currentLifecycleFilter = page.getByLabel('Filter search results by lifecycle status');
  await currentLifecycleFilter.selectOption('ready');
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  await expect(page.getByRole('button', { name: 'Lifecycle: Ready ×' })).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Waiting Intake.docx');
  await expect(rows.first()).toContainText('Waiting for intake');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-lifecycle-status-refinement.png`,
    fullPage: true,
  });
});
