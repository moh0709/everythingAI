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

async function stubRecoveryRoutes(page: Page, watchers = watcherPayload) {
  await page.route('**/api/watch/status', async (route) => {
    await route.fulfill({ json: watchers });
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
}

async function buildKnowledgeAndReturnHome(page: Page) {
  await page.getByRole('button', { name: 'Build Knowledge' }).click();
  await expect(page.getByRole('button', { name: 'Knowledge Base', exact: true })).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Home' }).click();
}

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

  await stubRecoveryRoutes(page);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('No scan outcome can be concluded from this view until a persisted scan report is available.');
  await expect(recovery).toContainText('Watcher state is monitoring evidence only. It does not prove extraction, recovery, or Knowledge Base success.');

  await page.getByRole('button', { name: 'Build Knowledge' }).click();
  await expect(page.getByRole('button', { name: 'Knowledge Base', exact: true })).toHaveClass(/active/);

  mutationRequests.length = 0;
  await page.getByRole('button', { name: 'Home' }).click();

  await expect(recovery).toContainText('this persisted scan report matches the configured source root exactly');
  await expect(recovery).toContainText('Watcher scope: exact match for /tmp/recovery-root');
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

test('recovery context keeps mismatched persisted evidence visible without applying it to the configured root', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/current-root');
  });
  await stubRecoveryRoutes(page);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await buildKnowledgeAndReturnHome(page);

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('Persisted scan report for /tmp/recovery-root: 4 indexed, 2 skipped, 1 failed.');
  await expect(recovery).toContainText('this persisted scan report belongs to another source root');
  await expect(recovery).toContainText('Its counts do not describe the configured recovery root /tmp/current-root.');
  await expect(recovery).toContainText('No matching persisted watcher state is loaded for the configured source root /tmp/current-root.');
  await expect(recovery).not.toContainText('Watcher scope: exact match for /tmp/recovery-root');
});

test('recovery context does not promote persisted scan or watcher roots into configured-root evidence', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('everythingai.ui.folderPath', '/tmp/recovery-root');
  });
  await stubRecoveryRoutes(page);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await buildKnowledgeAndReturnHome(page);

  const folderInput = page.getByLabel('Folder Path');
  await folderInput.fill('');
  await page.evaluate(() => localStorage.removeItem('everythingai.ui.folderPath'));

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('No source root is currently configured in the persisted client state.');
  await expect(recovery).toContainText('Persisted scan report for /tmp/recovery-root: 4 indexed, 2 skipped, 1 failed.');
  await expect(recovery).toContainText('applicability to a configured recovery root is unknown because no source root is currently configured');
  await expect(recovery).toContainText('Watcher applicability is unknown because no configured recovery root is available.');
  await expect(recovery).not.toContainText('this persisted scan report matches the configured source root exactly');
  await expect(recovery).not.toContainText('Watcher scope: exact match for /tmp/recovery-root');
});

test('recovery context leaves missing root and persisted evidence unavailable instead of inferring applicability', async ({ page }) => {
  const mutationRequests: string[] = [];
  await page.addInitScript(() => {
    localStorage.removeItem('everythingai.ui.folderPath');
  });
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.method() !== 'HEAD') {
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  await stubRecoveryRoutes(page, { active: 0, watchers: [] });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('No source root is currently configured in the persisted client state.');
  await expect(recovery).toContainText('No persisted scan report is loaded in this view.');
  await expect(recovery).toContainText('Watcher applicability is unknown because no configured recovery root is available.');
  expect(mutationRequests).toEqual([]);
});
