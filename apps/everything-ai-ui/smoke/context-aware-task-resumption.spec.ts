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
  id: 'task-resume-origin-source',
  filename: 'Task Resume Origin.txt',
  absolute_path: '/tmp/task-resume-root/Task Resume Origin.txt',
  relative_path: 'Task Resume Origin.txt',
  extension: 'txt',
  size_bytes: 420,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

const unrelatedSource = {
  id: 'task-resume-unrelated-source',
  filename: 'Unrelated.txt',
  absolute_path: '/tmp/task-resume-root/Unrelated.txt',
  relative_path: 'Unrelated.txt',
  extension: 'txt',
  size_bytes: 256,
  index_status: 'indexed',
  extraction_status: 'extracted',
};

const originPage = {
  id: 'task-resume-origin-page',
  title: 'Task Resume Knowledge',
  slug: 'task-resume-knowledge',
  page_type: 'topic',
  summary: 'Knowledge page used to prove explicit context-aware task resumption.',
  markdown: '# Task Resume Knowledge\n\nEvidence is linked to the source [S1:C1].',
  source_file_ids: [originSource.id],
  related_topics: [],
  sections: [],
  sources: [
    {
      id: 'task-resume-page-source',
      ref: 'S1',
      source_ref: 'S1',
      file_id: originSource.id,
      filename: originSource.filename,
      absolute_path: originSource.absolute_path,
      relative_path: originSource.relative_path,
      location: 'Lines 1-2',
      evidence: 'Task resumption evidence.',
      source_hash: 'task-resume-source-hash',
      chunks: [
        {
          id: 'task-resume-source-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
          stable_chunk_key: 'task-resume-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
          text: 'Task resumption evidence.', evidence: 'Task resumption evidence.',
        },
      ],
    },
  ],
  citation_coverage_score: 1,
  weak_source_warning: false,
  source_fingerprint: 'task-resume-origin-fingerprint',
  updated_at: '2026-08-26T00:00:00.000Z',
};

const documentContext = {
  file: originSource,
  source_reference: { source_label: originSource.filename, relative_path: originSource.relative_path },
  extracted_text: null,
  insight: null,
};

test('explicit task resumption follows only genuine recorded context and never invents stale or direct-entry history', async ({ page }) => {
  let files = [originSource, unrelatedSource];
  let wikiPages = [originPage];

  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/task-resume-root');
  });

  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: { generated_at: '2026-08-26T00:00:00.000Z', page_count: wikiPages.length, pages: wikiPages } } });
  });
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files } });
  });
  await page.route('**/api/intelligence/document-context/task-resume-origin-source', async (route) => {
    await route.fulfill({ json: { document: documentContext } });
  });

  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutationRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const summary = page.getByLabel('Workspace context summary');
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('button', { name: 'Resume previous context' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('resume contract');

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  const sourceCard = page.locator('.wiki-source-card').filter({ hasText: originSource.filename });
  await sourceCard.getByRole('button', { name: 'Open file context' }).click();
  await page.getByRole('button', { name: 'Open source recovery' }).click();

  const resumeRegion = page.getByLabel('Context-aware task resumption');
  await expect(resumeRegion).toContainText(`Resume target: Sources & Files → “${originSource.filename}”`);
  expect(mutationRequests).toEqual([]);

  await resumeRegion.getByRole('button', { name: 'Resume previous context' }).click();
  await expect(page.getByRole('heading', { name: 'Sources & Files' })).toBeVisible();
  await expect(searchInput).toHaveValue('resume contract');
  await expect(summary).toContainText(`Selected source: “${originSource.filename}”`);
  await expect(page.getByLabel('Context-aware task resumption')).toContainText('Resume target: Knowledge Base → “Task Resume Knowledge”');
  expect(mutationRequests).toEqual([]);

  await page.getByLabel('Context-aware task resumption').getByRole('button', { name: 'Resume previous context' }).click();
  await expect(page.getByRole('heading', { name: 'Task Resume Knowledge' })).toBeVisible();
  await expect(summary).toContainText('Safe return target: none recorded.');
  await expect(summary.getByRole('button', { name: 'Resume previous context' })).toHaveCount(0);
  expect(mutationRequests).toEqual([]);

  await sourceCard.getByRole('button', { name: 'Open file context' }).click();
  wikiPages = [];
  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  await expect(summary).toContainText('Knowledge Base origin: unavailable; no replacement page is inferred.');
  await expect(page.getByLabel('Context-aware task resumption unavailable')).toContainText('no replacement destination is inferred');
  await expect(summary.getByRole('button', { name: 'Resume previous context' })).toHaveCount(0);
  expect(mutationRequests).toEqual([]);

  files = [unrelatedSource];
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  await expect(summary).not.toContainText(`Selected source: “${unrelatedSource.filename}”`);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/context-aware-task-resumption.png`,
    fullPage: true,
  });
});
