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

const files = [
  {
    id: 'ready-source', filename: 'Ready Source.txt', absolute_path: '/tmp/Ready Source.txt', relative_path: 'Ready Source.txt', extension: 'txt', size_bytes: 120,
    index_status: 'indexed', extraction_status: 'extracted', recovery_status: 'active',
  },
  {
    id: 'extracting-source', filename: 'Extracting Source.pdf', absolute_path: '/tmp/Extracting Source.pdf', relative_path: 'Extracting Source.pdf', extension: 'pdf', size_bytes: 220,
    index_status: 'indexed', extraction_status: null, recovery_status: 'active',
  },
  {
    id: 'unsupported-source', filename: 'Unsupported Source.bin', absolute_path: '/tmp/Unsupported Source.bin', relative_path: 'Unsupported Source.bin', extension: 'bin', size_bytes: 320,
    index_status: 'indexed', extraction_status: 'unsupported', recovery_status: 'active',
  },
  {
    id: 'failed-source', filename: 'Failed Source.txt', absolute_path: '/tmp/Failed Source.txt', relative_path: 'Failed Source.txt', extension: 'txt', size_bytes: 420,
    index_status: 'indexed', extraction_status: 'failed', extraction_error_message: 'Parser failed.', recovery_status: 'active',
  },
];

function documentFor(file: typeof files[number]) {
  return {
    file,
    source_reference: { source_label: file.filename, relative_path: file.relative_path },
    extracted_text: file.extraction_status === 'extracted' ? 'Persisted extracted source text.' : null,
    insight: null,
  };
}

test('selected source lifecycle guidance explains state and safe next step without inventing retry or progress', async ({ page }) => {
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files } });
  });

  await page.route('**/api/intelligence/document-context/*', async (route) => {
    const id = route.request().url().split('/').pop();
    const file = files.find((candidate) => candidate.id === id) || files[0];
    await route.fulfill({ json: { document: documentFor(file) } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  await page.getByRole('button', { name: 'Inspect Ready Source.txt' }).click();
  const guidance = page.getByLabel('Selected source lifecycle guidance');
  await expect(guidance).toContainText('Current state: Ready');
  await expect(guidance).toContainText('Why: Indexing and text extraction are complete.');
  await expect(guidance).toContainText('Safe next step: No action is required.');
  await expect(page.getByText('Index status: indexed', { exact: true })).toBeVisible();
  await expect(page.getByText('Extraction: extracted', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Inspect Extracting Source.pdf' }).click();
  await expect(guidance).toContainText('Current state: Extracting text');
  await expect(guidance).toContainText('Safe next step: Wait for extraction to finish, then refresh the file list to load the latest persisted state.');
  await expect(guidance).not.toContainText(/percent|%/i);

  await page.getByRole('button', { name: 'Inspect Unsupported Source.bin' }).click();
  await expect(guidance).toContainText('Current state: Ready without text');
  await expect(guidance).toContainText('capability limitation');
  await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open source recovery' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Inspect Failed Source.txt' }).click();
  await expect(guidance).toContainText('Current state: Extraction failed');
  await expect(guidance).toContainText('Safe next step: Use source-root recovery to inspect or re-scan the configured source. No per-file retry is available.');
  await expect(page.getByRole('button', { name: 'Open source recovery' })).toBeVisible();
  await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);
  await expect(page.getByText('Reported issue: Parser failed.', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-selected-source-lifecycle-guidance.png`,
    fullPage: true,
  });
});
