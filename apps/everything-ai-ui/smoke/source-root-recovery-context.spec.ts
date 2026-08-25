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

const failedFile = {
  id: 'recovery-source',
  filename: 'Recovery Source.txt',
  absolute_path: '/tmp/recovery-root/Recovery Source.txt',
  relative_path: 'Recovery Source.txt',
  extension: 'txt',
  size_bytes: 512,
  index_status: 'indexed',
  extraction_status: 'failed',
  extraction_error_message: 'Parser failed.',
  recovery_status: 'active',
};

test('source-root recovery context is truthful, root-scoped, and non-executing when opened', async ({ page }) => {
  const mutationRequests: string[] = [];

  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/recovery-root');
  });

  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.method() !== 'HEAD') {
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [failedFile] } });
  });

  await page.route('**/api/intelligence/document-context/*', async (route) => {
    await route.fulfill({
      json: {
        document: {
          file: failedFile,
          source_reference: { source_label: failedFile.filename, relative_path: failedFile.relative_path },
          extracted_text: null,
          insight: null,
        },
      },
    });
  });

  await page.route('**/api/watch/status', async (route) => {
    await route.fulfill({
      json: {
        active: 1,
        watchers: [{
          id: 'watcher-recovery-root',
          rootPath: '/tmp/recovery-root',
          status: 'watching',
          running: false,
          pending: true,
          scheduled: true,
          debounceMs: 750,
          lastCycleAt: '2026-08-25T05:00:00.000Z',
        }],
      },
    });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources & Files' }).click();
  await page.getByRole('button', { name: 'Refresh' }).last().click();
  await page.getByRole('button', { name: 'Inspect Recovery Source.txt' }).click();

  await expect(page.getByLabel('Selected source lifecycle guidance')).toContainText('Current state: Extraction failed');
  await page.getByRole('button', { name: 'Open source recovery' }).click();

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toBeVisible();
  await expect(recovery.getByRole('heading', { name: 'Source-root recovery context' })).toBeVisible();
  await expect(recovery).toContainText('/tmp/recovery-root');
  await expect(recovery).toContainText('Recovery is scoped to the configured source root');
  await expect(recovery).toContainText('does not offer a per-file retry');
  await expect(recovery).toContainText('does not start a scan, extraction, Knowledge Base rebuild, watcher, or file mutation');
  await expect(recovery).toContainText('No persisted scan report is loaded in this view.');
  await expect(recovery).toContainText('No scan outcome can be concluded from this view until a persisted scan report is available.');
  await expect(recovery).toContainText('Status: watching. Running: No · Pending: Yes · Scheduled: Yes.');
  await expect(recovery).toContainText('Watcher state is monitoring evidence only. It does not prove extraction, recovery, or Knowledge Base success.');
  await expect(recovery).toContainText('Use the existing Build Knowledge or watcher controls only when you intentionally want to re-scan or resume monitoring.');

  expect(mutationRequests).toEqual([]);
  await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-source-root-recovery-context.png`,
    fullPage: true,
  });
});
