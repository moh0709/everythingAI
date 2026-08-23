import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';

const keywordFile = {
  id: 'keyword-file',
  filename: 'Keyword Contract.txt',
  absolute_path: '/tmp/Keyword Contract.txt',
  relative_path: 'Keyword Contract.txt',
  extension: 'txt',
  size_bytes: 120,
  index_status: 'indexed',
  extraction_status: 'extracted',
  recovery_status: 'active',
  search_match: {
    basis: 'keyword + semantic',
    keyword_rank: 1,
    semantic_rank: 2,
    semantic_score: 0.78,
    explanation: 'Matched indexed text and semantic similarity.',
  },
};

const semanticOnlyFile = {
  id: 'semantic-file',
  filename: 'Semantic Only.txt',
  absolute_path: '/tmp/Semantic Only.txt',
  relative_path: 'Semantic Only.txt',
  extension: 'txt',
  size_bytes: 96,
  index_status: 'indexed',
  extraction_status: 'extracted',
  recovery_status: 'active',
  snippet: 'Alternative terminology that is semantically related to the query.',
  search_match: {
    basis: 'semantic',
    keyword_rank: null,
    semantic_rank: 1,
    semantic_score: 0.91,
    explanation: 'Matched semantic similarity to extracted content.',
  },
};

function documentPayload(file: typeof keywordFile | typeof semanticOnlyFile) {
  return {
    document: {
      file,
      source_reference: {
        file_id: file.id,
        filename: file.filename,
        absolute_path: file.absolute_path,
        relative_path: file.relative_path,
        source_type: 'local_file',
        source_label: file.relative_path,
      },
      extracted_text: file.id === 'semantic-file'
        ? semanticOnlyFile.snippet
        : 'Keyword contract source content.',
      insight: null,
      labels: [],
    },
  };
}

test('Client search uses ranked results and explains semantic-only matches without calling similarity confidence', async ({ page }) => {
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [] } });
  });

  await page.route('**/api/unified-search?*', async (route) => {
    await route.fulfill({
      json: {
        query: 'renewable obligations',
        files: [keywordFile],
        semantic: [semanticOnlyFile, keywordFile],
        ranked_files: [keywordFile, semanticOnlyFile],
        insights: [],
        labels: [],
        suggestions: [],
        executions: [],
        totals: { files: 1, semantic: 2, ranked_files: 2, insights: 0, labels: 0, suggestions: 0, executions: 0 },
      },
    });
  });

  await page.route('**/api/intelligence/document-context/*', async (route) => {
    const file = route.request().url().includes('semantic-file') ? semanticOnlyFile : keywordFile;
    await route.fulfill({ json: documentPayload(file) });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();

  await page.getByPlaceholder('Search filenames, paths, or extracted file content...').fill('renewable obligations');
  await page.getByRole('button', { name: 'Search Files' }).click();

  await expect(page.getByRole('button', { name: 'Inspect Keyword Contract.txt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect Semantic Only.txt' })).toBeVisible();

  await expect(page.getByLabel('Search match for Keyword Contract.txt')).toContainText('keyword + semantic');
  const semanticMatch = page.getByLabel('Search match for Semantic Only.txt');
  await expect(semanticMatch).toContainText('semantic');
  await expect(semanticMatch).toContainText('Matched semantic similarity to extracted content.');
  await expect(semanticMatch).toContainText('Semantic similarity signal: 0.910');
  await expect(semanticMatch).toContainText('ranking signal, not confidence');

  await expect(page.locator('.status-strip')).toContainText('Search complete: 2 ranked file match(es).');

  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-explainable-search.png`,
    fullPage: true,
  });
});
