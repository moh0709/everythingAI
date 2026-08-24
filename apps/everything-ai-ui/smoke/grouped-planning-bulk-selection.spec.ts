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

async function installDeterministicPlanningSuggestions(page: import('@playwright/test').Page) {
  const suggestions: Array<Record<string, unknown>> = [];

  await page.route('**/api/suggestions**', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      const payload = request.postDataJSON() as { fileId?: string };
      const fileId = String(payload.fileId || 'fixture-file');
      const generated = [
        {
          id: `${fileId}-move`,
          file_id: fileId,
          action_type: 'move',
          current_value: 'fixture-source',
          suggested_value: 'review-folder',
          reason: 'Deterministic acceptance fixture move suggestion.',
          confidence: 0.82,
          risk_level: 'medium',
        },
        {
          id: `${fileId}-rename`,
          file_id: fileId,
          action_type: 'rename',
          current_value: 'Fixture File.txt',
          suggested_value: 'fixture-file.txt',
          reason: 'Deterministic acceptance fixture rename suggestion.',
          confidence: 0.71,
          risk_level: 'medium',
        },
        {
          id: `${fileId}-category`,
          file_id: fileId,
          action_type: 'category',
          current_value: null,
          suggested_value: 'fixture-category',
          reason: 'Deterministic acceptance fixture category suggestion.',
          confidence: 0.91,
          risk_level: 'low',
        },
      ];

      suggestions.push(...generated);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ suggestions: generated }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ suggestions }),
    });
  });
}

async function openPlanning(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('navigation').getByRole('button', { name: 'Planning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Planning Center' })).toBeVisible();
  await page.getByRole('button', { name: /AI Analyze/ }).click();
  await expect(page.getByText(/AI analysis complete\. \d+ suggested action\(s\) ready\./)).toBeVisible({ timeout: 60_000 });
}

test('Planning groups genuine file context and explains safe review selection before preview', async ({ page }) => {
  test.setTimeout(150_000);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-product-depth-planning-'));

  try {
    await fs.writeFile(path.join(root, 'Invoice Alpha 2026.txt'), 'Invoice Alpha. Supplier North. Finance payment terms 14 days.', 'utf8');
    await fs.writeFile(path.join(root, 'Project Notes.txt'), 'Project Orion notes. Customer delivery planning and milestone review.', 'utf8');

    await buildFixtureWorkspace(page, root);
    await installDeterministicPlanningSuggestions(page);
    await openPlanning(page);

    const groups = page.getByTestId('planning-group');
    await expect(groups.first()).toBeVisible();
    expect(await groups.count()).toBeGreaterThan(0);

    const selectionReview = page.getByTestId('planning-selection-review');
    await expect(selectionReview).toBeVisible();
    await expect(selectionReview).toContainText('Review Selection');
    await expect(selectionReview).toContainText('0 visible action(s) will be sent to the next dry run');
    await expect(selectionReview).toContainText('Selection is review intent only');

    const firstSuggestion = page.locator('.planning-group-list [data-testid^="suggestion-"]').first();
    await expect(firstSuggestion).toHaveAttribute('data-selection-state', 'not-selected');
    await expect(firstSuggestion.getByTestId('planning-selection-explanation')).toContainText('Not selected for the current review batch');
    await expect(firstSuggestion).toContainText('Why suggested:');
    await expect(firstSuggestion).toContainText('Source:');

    const firstGroup = groups.first();
    await expect(firstGroup).toContainText(/selected/);
    await firstGroup.getByRole('button', { name: 'Select Group' }).click();

    const checkedInGroup = firstGroup.locator('input[type="checkbox"]:checked');
    expect(await checkedInGroup.count()).toBeGreaterThan(0);
    await expect(firstGroup.locator('[data-selection-state="included"]').first()).toContainText('Included in the current review batch');
    await expect(page.locator('[data-testid^="preview-"]')).toHaveCount(0);

    const groupConflictRows = page.locator('.planning-group-list [data-selection-state="conflict"]');
    expect(await groupConflictRows.count()).toBeGreaterThan(0);
    const firstGroupConflict = groupConflictRows.first();
    await expect(firstGroupConflict).toContainText('safety conflict');
    await expect(firstGroupConflict.getByTestId('planning-selection-explanation')).toContainText('Excluded by the filesystem safety guard');
    await expect(firstGroupConflict.getByTestId('planning-selection-explanation')).toContainText('move → review-folder is already selected for this file');
    await expect(firstGroupConflict.locator('input[type="checkbox"]')).toBeDisabled();

    await page.getByRole('button', { name: 'Clear Selection' }).click();
    await expect(firstGroup.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dry Run Preview' })).toBeDisabled();
    await expect(page.locator('.planning-group-list [data-selection-state="conflict"]')).toHaveCount(0);

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

    const conflictRows = page.locator('.planning-group-list [data-selection-state="conflict"]');
    expect(await conflictRows.count()).toBeGreaterThan(0);
    const firstConflict = conflictRows.first();
    await expect(firstConflict).toContainText('safety conflict');
    await expect(firstConflict.getByTestId('planning-selection-explanation')).toContainText('Excluded by the filesystem safety guard');
    await expect(firstConflict.getByTestId('planning-selection-explanation')).toContainText('is already selected for this file');
    await expect(firstConflict.locator('input[type="checkbox"]')).toBeDisabled();
    await expect(selectionReview).toContainText(/Safety conflict\s+\d+/);

    const conflictConsistency = await conflictRows.evaluateAll((rows) => rows.every((row) => {
      const fileId = row.getAttribute('data-file-id');
      if (!fileId) return false;
      const selectedForFile = document.querySelector(`.planning-group-list [data-file-id="${CSS.escape(fileId)}"][data-selection-state="included"][data-action-type="move"], .planning-group-list [data-file-id="${CSS.escape(fileId)}"][data-selection-state="included"][data-action-type="rename"]`);
      return Boolean(selectedForFile);
    }));
    expect(conflictConsistency).toBeTruthy();

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'product-depth-planning-selection-desktop.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(selectionReview).toBeVisible();
    await expect(groups.first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'product-depth-planning-selection-390.png'), fullPage: true });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
