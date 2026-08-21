import { test, expect, APIRequestContext } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const API_URL = process.env.EVERYTHINGAI_API_URL || 'http://localhost:4100';
const API_TOKEN = process.env.EVERYTHINGAI_DEV_TOKEN || 'replace-with-your-local-development-token';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';
const UNICODE_FIXTURE_PATH = path.resolve('smoke/fixtures/phase1-unicode-source.txt');
const MOJIBAKE_MARKERS = ['\uFFFD', 'Ã', 'Â', 'â€'];
const ACTOR_HEADERS = {
  Authorization: `Bearer ${API_TOKEN}`,
  'x-actor-type': 'service_principal',
  'x-actor-id': 'rc-disposable-folder-validator',
  'x-actor-email': 'rc-validator@localhost',
  'x-request-id': 'rc-disposable-folder-sequence',
  'x-request-source': 'playwright-rc-acceptance',
};

async function getJson(request: APIRequestContext, route: string) {
  const response = await request.get(`${API_URL}${route}`, { headers: ACTOR_HEADERS });
  expect(response.ok(), `${route}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function postJson(request: APIRequestContext, route: string, data: unknown) {
  const response = await request.post(`${API_URL}${route}`, { headers: ACTOR_HEADERS, data });
  return { response, body: await response.json() };
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizedFixture(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

function expectUnicodeIntegrity(value: string, expectedFixture: string) {
  expect(normalizedFixture(value)).toBe(normalizedFixture(expectedFixture));

  for (const marker of MOJIBAKE_MARKERS) {
    expect(value).not.toContain(marker);
  }
}

test('local MVP completes the disposable-folder safe-action and recovery sequence', async ({ page, request }) => {
  test.setTimeout(120_000);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-rc-'));
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-rc-outside-'));
  const invoicePath = path.join(root, 'invoice-test.txt');
  const invoiceContent = 'Invoice 123 from Supplier Alpha for project Gamma. Payment terms are 30 days.';
  const unicodeFixture = await fs.readFile(UNICODE_FIXTURE_PATH, 'utf8');
  const unicodePath = path.join(root, 'phase1-unicode-source.txt');

  await fs.writeFile(invoicePath, invoiceContent);
  await fs.writeFile(
    path.join(root, 'contract-test.md'),
    '# Contract\nSupplier Alpha renewal terms and payment conditions for project Gamma.',
  );
  await fs.writeFile(path.join(root, 'project-data.csv'), 'project,owner\nGamma,Supplier Alpha\n');
  await fs.writeFile(path.join(root, 'intentionally-broken.pdf'), 'not a valid PDF fixture');
  await fs.writeFile(unicodePath, unicodeFixture, 'utf8');

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Local folder path').fill(root);
    await page.getByRole('button', { name: 'Build Knowledge' }).click();
    await expect(page.getByText(/Workspace ready with \d+ indexed file\(s\)/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible();

    const filesPayload = await getJson(request, '/api/files?limit=250');
    const fixtureFiles = filesPayload.files.filter((file: any) => file.absolute_path.startsWith(root));
    const invoice = fixtureFiles.find((file: any) => file.filename === 'invoice-test.txt');
    const contract = fixtureFiles.find((file: any) => file.filename === 'contract-test.md');
    const csv = fixtureFiles.find((file: any) => file.filename === 'project-data.csv');
    const brokenPdf = fixtureFiles.find((file: any) => file.filename === 'intentionally-broken.pdf');
    const unicodeSource = fixtureFiles.find((file: any) => file.filename === 'phase1-unicode-source.txt');

    expect(fixtureFiles).toHaveLength(5);
    expect(invoice.extraction_status).toBe('extracted');
    expect(contract.extraction_status).toBe('extracted');
    expect(csv.extraction_status).toBe('extracted');
    expect(['failed', 'unsupported']).toContain(brokenPdf.extraction_status);
    expect(unicodeSource.extraction_status).toBe('extracted');

    const searchPayload = await getJson(request, '/api/search?q=Supplier%20Alpha&limit=20');
    expect(searchPayload.results.some((result: any) => result.id === invoice.id)).toBeTruthy();

    const contextPayload = await getJson(request, `/api/intelligence/document-context/${invoice.id}`);
    expect(contextPayload.document.file.filename).toBe('invoice-test.txt');
    expect(contextPayload.document.previewText).toContain('Payment terms are 30 days');

    const unicodeContext = await getJson(request, `/api/intelligence/document-context/${unicodeSource.id}`);
    expect(unicodeContext.document.file.filename).toBe('phase1-unicode-source.txt');
    expectUnicodeIntegrity(unicodeContext.document.previewText, unicodeFixture);

    const wikiBuild = await postJson(request, '/api/wiki/build', { limit: 100, filePageLimit: 20 });
    expect(wikiBuild.response.ok()).toBeTruthy();
    const sourceBackedPage = wikiBuild.body.wiki.pages.find((wikiPage: any) => (
      wikiPage.sources?.some((source: any) => source.file_id === invoice.id && source.chunks?.length > 0)
    ));
    expect(sourceBackedPage).toBeTruthy();

    const unicodePage = wikiBuild.body.wiki.pages.find((wikiPage: any) => (
      wikiPage.page_type === 'file'
      && wikiPage.sources?.some((source: any) => source.file_id === unicodeSource.id)
    ));
    expect(unicodePage).toBeTruthy();
    const persistedUnicodeText = unicodePage.sources[0].chunks
      .map((chunk: any) => chunk.text)
      .join('\n');
    expectUnicodeIntegrity(persistedUnicodeText, unicodeFixture);

    await page.getByRole('button', { name: 'Refresh Knowledge Base' }).click();
    await page.getByPlaceholder('Search titles, topics, document content, source files...')
      .fill('phase1-unicode-source.txt');
    const unicodeSearchResult = page.locator('.wiki-search-result')
      .filter({ hasText: unicodePage.title })
      .filter({ has: page.locator('.wiki-search-result-type').filter({ hasText: /^file ·/ }) });
    await expect(unicodeSearchResult).toHaveCount(1);
    await unicodeSearchResult.click();

    await expect(page.getByRole('heading', { name: unicodePage.title, exact: true })).toBeVisible();
    const unicodeArticle = page.locator('.wiki-article');
    await expect(unicodeArticle).toBeVisible();
    const renderedArticleText = await unicodeArticle.innerText();
    for (const exactLine of normalizedFixture(unicodeFixture).split('\n')) {
      expect(renderedArticleText).toContain(exactLine);
    }
    for (const marker of MOJIBAKE_MARKERS) {
      expect(renderedArticleText).not.toContain(marker);
    }
    await expect(page.locator('.wiki-source-card').filter({ hasText: 'phase1-unicode-source.txt' })).toBeVisible();

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'phase1-unicode-knowledge-base.png'),
      fullPage: true,
    });

    const chat = await postJson(request, '/api/chat', {
      question: 'What are the payment terms for Supplier Alpha?',
      limit: 5,
    });
    expect(chat.response.ok()).toBeTruthy();
    expect(chat.body.provider_status === 'unavailable' || chat.body.sources?.length > 0).toBeTruthy();

    const planningCreated = await postJson(request, '/api/planning/sessions', {
      mode: 'deterministic',
      source: { type: 'file_ids', fileIds: [invoice.id] },
    });
    expect(planningCreated.response.status()).toBe(201);

    const planningRun = await postJson(
      request,
      `/api/planning/sessions/${planningCreated.body.session.id}/run`,
      { limit: 10 },
    );
    expect(planningRun.response.ok()).toBeTruthy();
    const moveSuggestion = planningRun.body.suggestions.find((suggestion: any) => suggestion.action_type === 'move');
    expect(moveSuggestion).toBeTruthy();
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    const previewCreated = await postJson(request, '/api/action-previews', {
      suggestionId: moveSuggestion.id,
      destinationFolder: root,
    });
    expect(previewCreated.response.status()).toBe(201);
    expect(previewCreated.body.preview.preview_status).toBe('ready');

    const denied = await postJson(request, '/api/action-executions', {
      previewId: previewCreated.body.preview.id,
      approve: false,
    });
    expect(denied.response.status()).toBeGreaterThanOrEqual(400);
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    const approved = await postJson(request, '/api/action-executions', {
      previewId: previewCreated.body.preview.id,
      approve: true,
    });
    expect(approved.response.status()).toBe(201);
    expect(await fs.readFile(approved.body.execution.target_path, 'utf8')).toBe(invoiceContent);
    expect(await pathExists(invoicePath)).toBeFalsy();

    const actionAudit = await getJson(
      request,
      `/api/audit-log?entityType=action_execution&entityId=${approved.body.execution.id}`,
    );
    expect(actionAudit.events[0]).toMatchObject({
      actor_type: 'service_principal',
      actor_id: 'rc-disposable-folder-validator',
      actor_email: 'rc-validator@localhost',
      request_id: 'rc-disposable-folder-sequence',
      request_source: 'playwright-rc-acceptance',
    });

    const undone = await postJson(
      request,
      `/api/action-executions/${approved.body.execution.id}/undo`,
      { approve: true },
    );
    expect(undone.response.ok()).toBeTruthy();
    expect(undone.body.execution.status).toBe('undone');
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    const outsidePreview = await postJson(request, '/api/action-previews', {
      suggestionId: moveSuggestion.id,
      destinationFolder: outsideRoot,
    });
    expect(outsidePreview.response.status()).toBe(201);
    expect(outsidePreview.body.preview.preview_status).toBe('blocked');
    expect(outsidePreview.body.preview.blocked_reason).toContain('outside the indexed source root');
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    const trashed = await postJson(request, '/api/recovery/trash', {
      fileId: invoice.id,
      retentionDays: 7,
      approve: true,
    });
    expect(trashed.response.status()).toBe(201);

    const purgeDenied = await postJson(
      request,
      `/api/recovery/trash/${trashed.body.trashRecord.id}/purge`,
      { requestedBy: 'rc-validator' },
    );
    expect(purgeDenied.response.status()).toBe(403);
    expect(purgeDenied.body.code).toBe('purge_disabled_in_mvp');
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    const restored = await postJson(
      request,
      `/api/recovery/trash/${trashed.body.trashRecord.id}/restore`,
      { approve: true, reason: 'RC disposable-folder recovery validation' },
    );
    expect(restored.response.ok()).toBeTruthy();
    expect(restored.body.trashRecord.status).toBe('restored');
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
    await expect(page.getByText('ADMIN DASHBOARD').first()).toBeVisible();
    await expect(page.getByText('AI Provider Configuration')).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('AI Provider Configuration')).toBeVisible();
    await expect(page.getByText('Admin Agent Connectors')).toBeVisible();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outsideRoot, { recursive: true, force: true });
  }
});
