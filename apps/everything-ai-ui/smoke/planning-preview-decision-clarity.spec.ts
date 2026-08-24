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

async function installPreviewFixture(page: import('@playwright/test').Page, root: string) {
  const suggestions: Array<Record<string, unknown>> = [];
  const actionBySuggestion = new Map<string, string>();

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
          current_value: path.join(root, 'Invoice Alpha 2026.txt'),
          suggested_value: path.join(root, 'Reviewed', 'Invoice Alpha 2026.txt'),
          reason: 'Deterministic ready-preview acceptance fixture.',
          confidence: 0.88,
          risk_level: 'medium',
        },
        {
          id: `${fileId}-category`,
          file_id: fileId,
          action_type: 'category',
          current_value: null,
          suggested_value: 'reviewed-finance',
          reason: 'Deterministic blocked-preview acceptance fixture.',
          confidence: 0.77,
          risk_level: 'low',
        },
      ];

      for (const suggestion of generated) actionBySuggestion.set(String(suggestion.id), String(suggestion.action_type));
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

  await page.route('**/api/action-previews', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as { suggestionId?: string };
    const suggestionId = String(payload.suggestionId || 'unknown');
    const actionType = actionBySuggestion.get(suggestionId) || 'category';

    if (actionType === 'move') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preview: {
            id: `preview-${suggestionId}`,
            suggestion_id: suggestionId,
            action_type: 'move',
            source_path: path.join(root, 'Invoice Alpha 2026.txt'),
            target_path: path.join(root, 'Reviewed', 'Invoice Alpha 2026.txt'),
            suggested_value: path.join(root, 'Reviewed', 'Invoice Alpha 2026.txt'),
            preview_status: 'ready',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        preview: {
          id: `preview-${suggestionId}`,
          suggestion_id: suggestionId,
          action_type: 'category',
          suggested_value: 'reviewed-finance',
          preview_status: 'blocked',
          blocked_reason: 'Policy requires manual classification review.',
        },
      }),
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

test('Planning preview queue explains ready and blocked decisions without changing execution safety', async ({ page }) => {
  test.setTimeout(150_000);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-preview-clarity-'));

  try {
    await fs.writeFile(path.join(root, 'Invoice Alpha 2026.txt'), 'Invoice Alpha finance review fixture.', 'utf8');

    await buildFixtureWorkspace(page, root);
    await installPreviewFixture(page, root);
    await openPlanning(page);

    const moveSuggestion = page.locator('[data-action-type="move"]').first();
    const categorySuggestion = page.locator('[data-action-type="category"]').first();
    await expect(moveSuggestion).toBeVisible();
    await expect(categorySuggestion).toBeVisible();

    await moveSuggestion.getByRole('button', { name: 'Preview', exact: true }).click();
    await categorySuggestion.getByRole('button', { name: 'Preview', exact: true }).click();

    const queue = page.getByTestId('planning-preview-queue');
    const summary = page.getByTestId('planning-preview-summary');
    await expect(queue).toContainText('Dry run validates a proposal only');
    await expect(queue).toContainText('separate explicit execution approval');
    await expect(summary).toContainText(/Ready for approval\s+1/);
    await expect(summary).toContainText(/Blocked\s+1/);

    const ready = page.locator('[data-preview-decision="ready-for-approval"]');
    await expect(ready).toHaveCount(1);
    await expect(ready).toContainText('Ready for approval');
    await expect(ready.getByTestId('preview-impact')).toContainText('Filesystem impact:');
    await expect(ready.getByTestId('preview-impact')).toContainText('Invoice Alpha 2026.txt');
    await expect(ready.getByTestId('preview-impact')).toContainText('Reviewed');
    await expect(ready.getByTestId('preview-decision-explanation')).toContainText('Execution remains a separate explicit approval');
    await expect(ready.getByRole('button', { name: 'Execute', exact: true })).toBeEnabled();

    const blocked = page.locator('[data-preview-decision="blocked"]');
    await expect(blocked).toHaveCount(1);
    await expect(blocked).toContainText('Blocked by backend validation');
    await expect(blocked.getByTestId('preview-impact')).toContainText('Proposed value: reviewed-finance');
    await expect(blocked.getByTestId('preview-decision-explanation')).toContainText('Backend reason: Policy requires manual classification review.');
    await expect(blocked.getByRole('button', { name: 'Execute', exact: true })).toBeDisabled();

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'product-depth-preview-clarity-desktop.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(queue).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'product-depth-preview-clarity-390.png'), fullPage: true });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
