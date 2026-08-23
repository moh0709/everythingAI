import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const keywordFile = {
  id: 'keyword-snippet-file',
  filename: 'Renewable Contract.txt',
  absolute_path: '/tmp/Renewable Contract.txt',
  relative_path: 'Renewable Contract.txt',
  extension: 'txt',
  size_bytes: 120,
  index_status: 'indexed',
  extraction_status: 'extracted',
  recovery_status: 'active',
  snippet: 'The renewable obligations apply to every supplier in the contract.',
  search_match: {
    basis: 'keyword',
    keyword_rank: 1,
    semantic_rank: null,
    semantic_score: null,
    explanation: 'Matched indexed filename, path, or extracted text.',
  },
};

const semanticFile = {
  id: 'semantic-snippet-file',
  filename: 'Energy Duties.txt',
  absolute_path: '/tmp/Energy Duties.txt',
  relative_path: 'Energy Duties.txt',
  extension: 'txt',
  size_bytes: 96,
  index_status: 'indexed',
  extraction_status: 'extracted',
  recovery_status: 'active',
  snippet: 'Alternative terminology describing recurring clean-energy duties.',
  search_match: {
    basis: 'semantic',
    keyword_rank: null,
    semantic_rank: 1,
    semantic_score: 0.91,
    explanation: 'Matched semantic similarity to extracted content.',
  },
};

const missingSnippetFile = {
  id: 'missing-snippet-file',
  filename: 'No Context.txt',
  absolute_path: '/tmp/No Context.txt',
  relative_path: 'No Context.txt',
  extension: 'txt',
  size_bytes: 64,
  index_status: 'indexed',
  extraction_status: 'unsupported',
  recovery_status: 'active',
  snippet: null,
  search_match: {
    basis: 'semantic',
    keyword_rank: null,
    semantic_rank: 2,
    semantic_score: 0.72,
    explanation: 'Matched semantic similarity to extracted content.',
  },
};

function documentPayload(file: typeof keywordFile | typeof semanticFile | typeof missingSnippetFile) {
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
      extracted_text: file.snippet || null,
      insight: null,
      labels: [],
    },
  };
}

test('Client search shows truthful contextual snippets and highlights literal query terms only', async ({ page }) => {
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [] } });
  });

  await page.route('**/api/unified-search?*', async (route) => {
    await route.fulfill({
      json: {
        query: 'renewable obligations',
        files: [keywordFile],
        semantic: [semanticFile, missingSnippetFile],
        ranked_files: [keywordFile, semanticFile, missingSnippetFile],
        insights: [],
        labels: [],
        suggestions: [],
        executions: [],
        totals: { files: 1, semantic: 2, ranked_files: 3, insights: 0, labels: 0, suggestions: 0, executions: 0 },
      },
    });
  });

  await page.route('**/api/intelligence/document-context/*', async (route) => {
    const url = route.request().url();
    const file = url.includes('semantic-snippet-file')
      ? semanticFile
      : url.includes('missing-snippet-file')
        ? missingSnippetFile
        : keywordFile;
    await route.fulfill({ json: documentPayload(file) });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByPlaceholder('Search filenames, paths, or extracted file content...').fill('renewable obligations');
  await page.getByRole('button', { name: 'Search Files' }).click();

  const keywordContext = page.getByLabel('Search context for Renewable Contract.txt');
  await expect(keywordContext).toContainText('Keyword context');
  await expect(keywordContext).toContainText('The renewable obligations apply to every supplier in the contract.');
  await expect(keywordContext.locator('mark')).toHaveCount(2);
  await expect(keywordContext.locator('mark').nth(0)).toHaveText('renewable');
  await expect(keywordContext.locator('mark').nth(1)).toHaveText('obligations');

  const semanticContext = page.getByLabel('Search context for Energy Duties.txt');
  await expect(semanticContext).toContainText('Semantic context');
  await expect(semanticContext).toContainText('Alternative terminology describing recurring clean-energy duties.');
  await expect(semanticContext).toContainText('Related context; exact query terms may not appear.');
  await expect(semanticContext.locator('mark')).toHaveCount(0);

  const missingContext = page.getByLabel('Search context for No Context.txt');
  await expect(missingContext).toContainText('No result snippet available.');
  await expect(missingContext).not.toContainText('Alternative');
});
