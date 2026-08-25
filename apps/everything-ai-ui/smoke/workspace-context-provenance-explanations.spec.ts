import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const originSource = {
  id: 'context-provenance-source',
  filename: 'Context Provenance Source.txt',
  absolute_path: '/tmp/context-provenance-root/Context Provenance Source.txt',
  relative_path: 'Context Provenance Source.txt',
  extension: 'txt',
  size_bytes: 420,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

const unrelatedSource = {
  id: 'context-provenance-unrelated',
  filename: 'Unrelated.txt',
  absolute_path: '/tmp/context-provenance-root/Unrelated.txt',
  relative_path: 'Unrelated.txt',
  extension: 'txt',
  size_bytes: 128,
  index_status: 'indexed',
  extraction_status: 'extracted',
};

const fixtureWiki = {
  generated_at: '2026-08-26T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'context-provenance-page',
      title: 'Context Provenance Knowledge',
      slug: 'context-provenance-knowledge',
      page_type: 'topic',
      summary: 'Knowledge page used to prove truthful workspace context provenance.',
      markdown: '# Context Provenance Knowledge\n\nEvidence is linked to [S1:C1].',
      source_file_ids: [originSource.id],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'context-provenance-page-source',
          ref: 'S1',
          source_ref: 'S1',
          file_id: originSource.id,
          filename: originSource.filename,
          absolute_path: originSource.absolute_path,
          relative_path: originSource.relative_path,
          location: 'Lines 1-2',
          evidence: 'Context provenance evidence.',
          source_hash: 'context-provenance-source-hash',
          chunks: [
            {
              id: 'context-provenance-c1', ref: 'C1', chunk_ref: 'C1', source_ref: 'S1', chunk_number: 1,
              stable_chunk_key: 'context-provenance-stable-1', line_start: 1, line_end: 2, location: 'Lines 1-2',
              text: 'Context provenance evidence.', evidence: 'Context provenance evidence.',
            },
          ],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'context-provenance-fingerprint',
      updated_at: '2026-08-26T00:00:00.000Z',
    },
  ],
};

const documentContext = {
  file: originSource,
  source_reference: { source_label: originSource.filename, relative_path: originSource.relative_path },
  extracted_text: null,
  insight: null,
};

test('workspace context explains genuine provenance and observable unknown states without mutation', async ({ page }) => {
  let files = [originSource, unrelatedSource];

  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/context-provenance-root');
  });

  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files } });
  });
  await page.route('**/api/intelligence/document-context/context-provenance-source', async (route) => {
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
  await searchInput.fill('provenance contract');

  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await page.locator('.wiki-source-card').filter({ hasText: originSource.filename }).getByRole('button', { name: 'Open file context' }).click();

  const summary = page.getByLabel('Workspace context summary');
  await expect(summary).toContainText('Provenance: current query comes from the Client Workspace search input.');
  await expect(summary).toContainText('Provenance: selected source comes from the current Client Workspace file selection.');
  await expect(summary).toContainText('Provenance: Knowledge Base origin comes from the recorded return context.');
  await expect(summary).toContainText('Provenance: configured source root comes only from Folder Path.');
  await expect(summary).toContainText('Provenance: safe return target comes from the recorded Knowledge Base return context.');
  expect(mutationRequests).toEqual([]);

  await page.getByRole('button', { name: 'Open source recovery' }).click();
  await expect(summary).toContainText('Provenance: safe return target comes from the recorded Source Recovery return context.');
  await expect(summary).toContainText('Recovery scope remains the configured source root; the selected source is navigation context only.');
  expect(mutationRequests).toEqual([]);

  await page.getByRole('button', { name: 'Back to Sources & Files' }).click();
  files = [unrelatedSource];
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  await expect(summary).toContainText('Selected source: unavailable; no replacement source is inferred.');
  await expect(summary).toContainText('Unavailable because the recorded selected source is no longer present in the current file list; no replacement is inferred.');
  await expect(summary).not.toContainText(`Selected source: “${unrelatedSource.filename}”`);
  expect(mutationRequests).toEqual([]);

  await page.getByLabel('Navigation context').getByRole('button', { name: 'Clear return context' }).click();
  await expect(summary).toContainText('Knowledge Base origin: none recorded.');
  await expect(summary).toContainText('Unavailable because no Knowledge Base origin is recorded.');
  await expect(summary).toContainText('Safe return target: none recorded.');
  await expect(summary).toContainText('Unavailable because no safe return target is currently recorded.');
  expect(mutationRequests).toEqual([]);
});
