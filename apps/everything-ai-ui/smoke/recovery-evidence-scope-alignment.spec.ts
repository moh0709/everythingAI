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

function scanReport(rootPath: string) {
  return {
    rootPath,
    scanned: 7,
    indexed: 4,
    skipped: 2,
    failed: 1,
    skipped_unchanged: 1,
    skipped_large: 1,
    skipped_excluded: 0,
    skippedReasons: [],
    failedItems: [],
  };
}

function watcherPayload(rootPath: string) {
  return {
    active: 1,
    watchers: [{
      id: `watcher-${rootPath}`,
      rootPath,
      status: 'watching',
      running: true,
      pending: false,
      scheduled: true,
      debounceMs: 750,
      lastCycleAt: '2026-08-25T08:00:00.000Z',
    }],
  };
}

async function stubCommon(page: Page, watcherRoot?: string) {
  await page.route('**/api/watch/status', async (route) => {
    await route.fulfill({ json: watcherRoot ? watcherPayload(watcherRoot) : { active: 0, watchers: [] } });
  });
  await page.route('**/api/files?*', async (route) => route.fulfill({ json: { files: [] } }));
  await page.route('**/api/wiki?*', async (route) => route.fulfill({ json: { wiki: { generated_at: null, page_count: 0, pages: [] } } }));
  await page.route('**/api/extract', async (route) => route.fulfill({ json: { processed: 0 } }));
  await page.route('**/api/insights', async (route) => route.fulfill({ json: { processed: 0 } }));
}

async function buildKnowledge(page: Page, reportRoot: string) {
  await page.route('**/api/index', async (route) => route.fulfill({ json: scanReport(reportRoot) }));
  await page.getByRole('button', { name: 'Build Knowledge' }).click();
  await expect(page.getByRole('button', { name: 'Knowledge Base', exact: true })).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Home' }).click();
}

test('matching recovery root scopes scan and watcher evidence to the configured root', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('everythingai.ui.folderPath', '/tmp/recovery-root'));
  await stubCommon(page, '/tmp/recovery-root');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('Opening recovery context does not start a scan');
  await buildKnowledge(page, '/tmp/recovery-root');

  await expect(recovery).toContainText('this persisted scan report matches the configured source root exactly');
  await expect(recovery).toContainText('Watcher scope: exact match for /tmp/recovery-root');
  await expect(recovery).toContainText('4 indexed: recorded as indexed by the latest persisted scan report.');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `${ARTIFACT_DIR}/product-depth-recovery-evidence-scope-match.png`, fullPage: true });
});

test('mismatched recovery evidence stays visible but is not presented as current-root evidence', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('everythingai.ui.folderPath', '/tmp/current-root'));
  await stubCommon(page, '/tmp/other-root');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await buildKnowledge(page, '/tmp/other-root');

  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('Persisted scan report for /tmp/other-root: 4 indexed, 2 skipped, 1 failed.');
  await expect(recovery).toContainText('this persisted scan report belongs to another source root');
  await expect(recovery).toContainText('Its counts do not describe the configured recovery root /tmp/current-root.');
  await expect(recovery).toContainText('No matching persisted watcher state is loaded for the configured source root /tmp/current-root.');
  await expect(recovery).not.toContainText('Watcher scope: exact match for /tmp/other-root');
});

test('missing recovery root and evidence remain unavailable rather than inferred', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('everythingai.ui.folderPath'));
  await stubCommon(page);
  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  const recovery = page.getByLabel('Source-root recovery context');
  await expect(recovery).toContainText('No source root is currently available in the persisted client state.');
  await expect(recovery).toContainText('No persisted scan report is loaded in this view.');
  await expect(recovery).toContainText('Watcher applicability is unknown because no configured recovery root is available.');
  expect(mutationRequests).toEqual([]);
});
