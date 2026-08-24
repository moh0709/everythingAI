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
    id: 'first-pdf',
    filename: 'First Contract.pdf',
    absolute_path: '/tmp/First Contract.pdf',
    relative_path: 'First Contract.pdf',
    extension: 'pdf',
    size_bytes: 400,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    snippet: 'Renewable obligations apply to the first agreement.',
    search_match: {
      basis: 'keyword + semantic',
      keyword_rank: 1,
      semantic_rank: 2,
      semantic_score: 0.82,
      explanation: 'Matched indexed text and semantic similarity.',
    },
  },
  {
    id: 'first-txt',
    filename: 'First Notes.txt',
    absolute_path: '/tmp/First Notes.txt',
    relative_path: 'First Notes.txt',
    extension: 'txt',
    size_bytes: 240,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    snippet: 'Alternative terminology for the first query.',
    search_match: {
      basis: 'semantic',
      keyword_rank: null,
      semantic_rank: 1,
      semantic_score: 0.91,
      explanation: 'Matched semantic similarity to extracted content.',
    },
  },
];

const secondResults = [
  {
    id: 'second-txt',
    filename: 'Second Context.txt',
    absolute_path: '/tmp/Second Context.txt',
    relative_path: 'Second Context.txt',
    extension: 'txt',
    size_bytes: 260,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
    snippet: 'The second query should not inherit the first query filters.',
    search_match: {
      basis: 'keyword',
      keyword_rank: 1,
      semantic_rank: null,
      semantic_score: null,
      explanation: 'Matched indexed filename, path, or extracted text.',
    },
  },
];

const baseFiles = [
  {
    id: 'base-doc',
    filename: 'Base File.docx',
    absolute_path: '/tmp/Base File.docx',
    relative_path: 'Base File.docx',
    extension: 'docx',
    size_bytes: 320,
    index_status: 'indexed',
    extraction_status: 'extracted',
    recovery_status: 'active',
  },
];

test('search refinements reset when query context or base file context changes', async ({ page }) => {
  let searchCount = 0;
  let fileRequestCount = 0;

  await page.route('**/api/files?*', async (route) => {
    fileRequestCount += 1;
    await route.fulfill({ json: { files: fileRequestCount === 1 ? [] : baseFiles } });
  });

  await page.route('**/api/unified-search?*', async (route) => {
    searchCount += 1;
    const rankedFiles = searchCount === 1 ? firstResults : secondResults;
    await route.fulfill({
      json: {
        query: searchCount === 1 ? 'renewable obligations' : 'second context',
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
  await searchInput.fill('renewable obligations');
  await page.getByRole('button', { name: 'Search Files' }).click();

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);

  await page.getByLabel('Filter search results by file type').selectOption('pdf');
  await page.getByLabel('Filter search results by match basis').selectOption('keyword + semantic');
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'File type: .pdf ×' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Match basis: keyword + semantic ×' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'File type: .pdf ×' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Match basis: keyword + semantic ×' })).toHaveCount(0);

  await page.getByLabel('Filter search results by file type').selectOption('pdf');
  await expect(rows).toHaveCount(1);

  await searchInput.fill('second context');
  await page.getByRole('button', { name: 'Search Files' }).click();

  await expect(searchInput).toHaveValue('second context');
  await expect(page.getByRole('button', { name: 'File type: .pdf ×' })).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Second Context.txt');

  await page.getByLabel('Filter search results by file type').selectOption('txt');
  await expect(page.getByRole('button', { name: 'File type: .txt ×' })).toBeVisible();

  await page.getByRole('button', { name: 'Refresh' }).last().click();

  await expect(searchInput).toHaveValue('second context');
  await expect(page.getByRole('button', { name: 'File type: .txt ×' })).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Base File.docx');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-search-refinement-lifecycle.png`,
    fullPage: true,
  });
});
