import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';

async function buildFixtureWorkspace(page: import('@playwright/test').Page, root: string) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByPlaceholder('Local folder path').fill(root);
  await page.getByRole('button', { name: 'Build Knowledge' }).click();
  await expect(page.getByText(/Workspace ready with \d+ indexed file\(s\)/)).toBeVisible({ timeout: 60_000 });
}

async function openPlanning(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('navigation').getByRole('button', { name: 'Planning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Planning Center' })).toBeVisible();
  await page.getByRole('button', { name: /AI Analyze/ }).click();
  await expect(page.getByText(/AI analysis complete\. \d+ suggested action\(s\) ready\./)).toBeVisible({ timeout: 60_000 });
}

test('Planning groups genuine suggestions and bulk selection remains preview-only', async ({ page }) => {
  test.setTimeout(150_000);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-phase2-planning-'));

  try {
    await fs.writeFile(path.join(root, 'invoice-alpha.txt'), 'Invoice Alpha. Supplier North. Finance payment terms 14 days.', 'utf8');
    await fs.writeFile(path.join(root, 'project-notes.txt'), 'Project Orion notes. Customer delivery planning and milestone review.', 'utf8');

    await buildFixtureWorkspace(page, root);
    await openPlanning(page);

    const groups = page.getByTestId('planning-group');
    await expect(groups.first()).toBeVisible();
    expect(await groups.count()).toBeGreaterThan(0);

    const firstGroup = groups.first();
    await expect(firstGroup).toContainText(/selected/);
    await firstGroup.getByRole('button', { name: 'Select Group' }).click();

    const checkedInGroup = firstGroup.locator('input[type="checkbox"]:checked');
    expect(await checkedInGroup.count()).toBeGreaterThan(0);
    await expect(page.locator('[data-testid^="preview-"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear Selection' }).click();
    await expect(firstGroup.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dry Run Preview' })).toBeDisabled();

    await page.getByRole('button', { name: 'Select Safe Batch' }).click();
    expect(await page.locator('.planning-group-list input[type="checkbox"]:checked').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-testid^="preview-"]')).toHaveCount(0);

    const selectedFilesystemByFile = await page.locator('.planning-group-list [data-action-type="move"] input:checked, .planning-group-list [data-action-type="rename"] input:checked').evaluateAll((inputs) => {
      const counts: Record<string, number> = {};
      for (const input of inputs) {
        const row = input.closest('[data-file-id]');
        const fileId = row?.getAttribute('data-file-id') || 'unknown';
        counts[fileId] = (counts[fileId] || 0) + 1;
      }
      return counts;
    });
    expect(Object.values(selectedFilesystemByFile).every((count) => count <= 1)).toBeTruthy();

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase2-grouped-planning-desktop.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(groups.first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase2-grouped-planning-390.png'), fullPage: true });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
