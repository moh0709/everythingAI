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

const failedSource = {
  id: 'recovery-return-source',
  filename: 'Recovery Return Source.txt',
  absolute_path: '/tmp/Recovery Return Source.txt',
  relative_path: 'Recovery Return Source.txt',
  extension: 'txt',
  size_bytes: 420,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

function documentForSource() {
  return {
    file: failedSource,
    source_reference: { source_label: failedSource.filename, relative_path: failedSource.relative_path },
    extracted_text: null,
    insight: null,
  };
}

test('source-root recovery preserves genuine source origin and query without turning the file into recovery scope', async ({ page }) => {
  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [failedSource] } });
  });

  await page.route('**/api/intelligence/document-context/recovery-return-source', async (route) => {
    await route.fulfill({ json: { document: documentForSource() } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();

  const searchInput = page.getByPlaceholder('Search filenames, paths, or extracted file content...');
  await searchInput.fill('failed contract delta');

  await page.getByRole('button', { name: 'Inspect Recovery Return Source.txt' }).click();
  await expect(page.getByLabel('Selected source lifecycle guidance')).toContainText('Current state: Extraction failed');
  await page.getByRole('button', { name: 'Open source recovery' }).click();

  const recoveryContext = page.getByLabel('Recovery navigation context');
  await expect(recoveryContext).toBeVisible();
  await expect(recoveryContext).toContainText('Recovery Return Source.txt');
  await expect(recoveryContext).toContainText('only the navigation origin');
  await expect(recoveryContext).toContainText('recovery remains scoped to the configured source root');
  await expect(recoveryContext).toContainText('does not start recovery, scanning, extraction, rebuilding, watcher activity, or file mutation');
  await expect(page.getByLabel('Source-root recovery context')).toContainText('Recovery is scoped to the configured source root');

  await page.getByRole('button', { name: 'Back to Sources & Files' }).click();
  await expect(page.getByRole('heading', { name: 'Sources & Files' })).toBeVisible();
  await expect(searchInput).toHaveValue('failed contract delta');
  await expect(page.getByLabel('Selected source lifecycle guidance')).toContainText('Current state: Extraction failed');
  await expect(page.locator('tr.selected')).toContainText('Recovery Return Source.txt');

  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByLabel('Recovery navigation context')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-source-recovery-return-context.png`,
    fullPage: true,
  });
});
