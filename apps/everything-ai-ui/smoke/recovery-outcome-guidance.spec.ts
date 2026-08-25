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

const scanReport = {
  rootPath: '/tmp/recovery-root',
  scanned: 7,
  indexed: 4,
  skipped: 2,
  failed: 1,
  skipped_unchanged: 1,
  skipped_large: 1,
  skipped_excluded: 0,
  skippedReasons: [
    { reason: 'unchanged', path: '/tmp/recovery-root/unchanged.txt' },
    { reason: 'too_large', path: '/tmp/recovery-root/large.bin' },
  ],
  failedItems: [
    { type: 'file', path: '/tmp/recovery-root/broken.txt', message: 'Persisted parser failure.' },
  ],
};

const watcherPayload = {
  active: 1,
  watchers: [{
    id: 'watcher-recovery-root',
    rootPath: '/tmp/recovery-root',
    status: 'watching',
    running: false,
    pending: true,
    scheduled: true,
    debounceMs: 750,
    lastCycleAt: '2026-08-25T08:00:00.000Z',
  }],
};

test('recovery context interprets persisted scan and watcher outcomes without inventing recovery success', async ({ page }) => {
  const mutationRequests: string[] = [];

  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/recovery-root');
  });

  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.method() !== 'HEAD') {
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  await page.route('**/api/watch/status', async (route) => {
    await route.fulfill({ json: watcherPayload });
  });

  await page.route('**/api/files?*', async (route) => {
    await route.fulfill({ json: { files: [] } });
  });

  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: { generated_at: null, page_count: 0, pages: [] } } });
  });

  await page.route('**/api/index', async (route) => {
    await route.fulfill({ json: scanReport });
  });

  await page.route('**/api/extract', async (route) => {
    await route.fulfill({ json: { processed: 0 } });
  });

  await page.route('**/api/insights', async (route) => {
    await route.fulfill({ json: { processed: 0 } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('No scan outcome can be concluded from this view until a persisted scan report is available.');
  await expect(recovery).toContainText('Watcher state is monitoring evidence only. It does not prove extraction, recovery, or Knowledge Base success.');

  await page.getByRole('button', { name: 'Build Knowledge' }).click();
  await expect(page.getByRole('button', { name: 'Knowledge Base' })).toHaveClass(/active/);

  mutationRequests.length = 0;
  await page.getByRole('button', { name: 'Home' }).click();

  await expect(recovery).toContainText('4 indexed: recorded as indexed by the latest persisted scan report.');
  await expect(recovery).toContainText('2 skipped: skipped by that scan; skipped does not mean failed or ready.');
  await expect(recovery).toContainText('1 failed: recorded as failed by that scan; use the Scan Report below for persisted failure details rather than inferring a cause here.');
  await expect(recovery).toContainText('Next step: inspect the Scan Report and Folder Path first. Use Build Knowledge or watcher controls only when you intentionally choose to rerun the source-root flow or change monitoring.');
  await expect(recovery).not.toContainText(/recovery successful|fully recovered|health score|progress/i);
  expect(mutationRequests).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/product-depth-recovery-outcome-guidance.png`,
    fullPage: true,
  });
});
