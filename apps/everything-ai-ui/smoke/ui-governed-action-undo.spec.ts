import { test, expect, APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const API_URL = process.env.EVERYTHINGAI_API_URL || 'http://localhost:4100';
const API_TOKEN = process.env.EVERYTHINGAI_DEV_TOKEN || 'replace-with-your-local-development-token';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';
const ACTOR_HEADERS = {
  Authorization: `Bearer ${API_TOKEN}`,
  'x-actor-type': 'service_principal',
  'x-actor-id': 'phase1-ui-governed-action',
  'x-actor-email': 'phase1-ui-governed-action@localhost',
  'x-request-id': 'phase1-ui-governed-action-sequence',
  'x-request-source': 'playwright-phase1-ui',
};

async function getJson(request: APIRequestContext, route: string) {
  const response = await request.get(`${API_URL}${route}`, { headers: ACTOR_HEADERS });
  expect(response.ok(), `${route}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function manifest(root: string) {
  const entries: Array<{ path: string; sha256: string }> = [];

  async function walk(directory: string) {
    const children = await fs.readdir(directory, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));

    for (const child of children) {
      const absolutePath = path.join(directory, child.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
      if (child.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      const content = await fs.readFile(absolutePath);
      entries.push({
        path: relativePath,
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
      });
    }
  }

  await walk(root);
  return entries;
}

test('Admin UI governs preview, approval, execution, audit, and undo on a disposable folder', async ({ page, request }, testInfo) => {
  test.setTimeout(150_000);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-phase1-action-'));
  const invoicePath = path.join(root, 'phase1-action-invoice.txt');
  const invoiceContent = 'Invoice 114 for Phase 1 governed action acceptance. Supplier Delta. Payment terms 14 days.';
  let succeeded = false;

  await fs.writeFile(invoicePath, invoiceContent, 'utf8');
  const initialManifest = await manifest(root);

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByPlaceholder('Local folder path').fill(root);
    await page.getByRole('button', { name: 'Build Knowledge' }).click();
    await expect(page.getByText(/Workspace ready with \d+ indexed file\(s\)/)).toBeVisible({ timeout: 60_000 });

    const filesPayload = await getJson(request, '/api/files?limit=250');
    const invoice = filesPayload.files.find((file: any) => file.absolute_path === invoicePath);
    expect(invoice, 'Disposable invoice must be indexed before Admin planning starts').toBeTruthy();

    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
    await expect(page.getByText('ADMIN DASHBOARD').first()).toBeVisible();
    await page.getByRole('button', { name: 'Planning', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'AI Planning Center' })).toBeVisible();

    await page.getByRole('button', { name: /AI Analyze/ }).click();
    await expect(page.getByText(/AI analysis complete\. \d+ suggested action\(s\) ready\./)).toBeVisible({ timeout: 60_000 });

    const moveSuggestion = page.locator(`[data-file-id="${invoice.id}"][data-action-type="move"]`).first();
    await expect(moveSuggestion).toBeVisible();
    await expect(moveSuggestion).toContainText('Source: phase1-action-invoice.txt');

    const destination = page.getByPlaceholder('e.g. Finance, Projects, Customer Docs');
    await destination.fill(root);
    await moveSuggestion.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Dry Run Preview' }).click();

    const readyPreview = page.locator('[data-testid^="preview-"][data-preview-status="ready"]').first();
    await expect(readyPreview).toBeVisible();
    await expect(readyPreview).toContainText(`Source: ${invoicePath}`);
    await expect(readyPreview).toContainText('Target:');
    expect(await manifest(root)).toEqual(initialManifest);

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'phase1-governed-action-preview.png'),
      fullPage: true,
    });

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Execute move?');
      expect(dialog.message()).toContain(root);
      await dialog.accept();
    });
    await readyPreview.getByRole('button', { name: 'Execute' }).click();
    await expect(page.getByText('EverythingAI admin is ready')).toBeVisible({ timeout: 60_000 });
    expect(await manifest(root)).not.toEqual(initialManifest);

    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Logging & Analytics Dashboard' })).toBeVisible();

    const executionRow = page.locator('[data-testid^="execution-"][data-execution-status="executed"]')
      .filter({ hasText: 'move' })
      .filter({ hasText: 'phase1-action-invoice.txt' })
      .first();
    await expect(executionRow).toBeVisible();
    const executionTestId = await executionRow.getAttribute('data-testid');
    const executionId = executionTestId?.replace('execution-', '');
    expect(executionId).toBeTruthy();

    const auditRow = page.locator(`[data-entity-id="${executionId}"]`).first();
    await expect(auditRow).toBeVisible();
    await expect(auditRow).toContainText('action_execution');
    await expect(auditRow).toContainText(/execut/i);
    await expect(auditRow.locator('td').last()).not.toHaveText('');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'phase1-governed-action-audit.png'),
      fullPage: true,
    });

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Undo approved action?');
      expect(dialog.message()).toContain('move:');
      await dialog.accept();
    });
    await executionRow.getByRole('button', { name: 'Undo move execution' }).click();

    const undoneRow = page.locator(`[data-testid="execution-${executionId}"][data-execution-status="undone"]`);
    await expect(undoneRow).toBeVisible({ timeout: 30_000 });
    await expect(undoneRow).toContainText('Restored');
    expect(await manifest(root)).toEqual(initialManifest);
    expect(await fs.readFile(invoicePath, 'utf8')).toBe(invoiceContent);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'phase1-governed-action-undone.png'),
      fullPage: true,
    });

    succeeded = true;
  } finally {
    if (succeeded) {
      await fs.rm(root, { recursive: true, force: true });
    } else {
      await fs.mkdir(ARTIFACT_DIR, { recursive: true });
      await fs.writeFile(
        path.join(ARTIFACT_DIR, 'phase1-governed-action-failure.txt'),
        `Disposable fixture preserved for failure inspection: ${root}\nPlaywright status: ${testInfo.status}\n`,
        'utf8',
      );
      console.error(`Phase 1 governed-action fixture preserved after failure: ${root}`);
    }
  }
});