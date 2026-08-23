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

const fixtureWiki = {
  generated_at: '2026-08-23T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'phase2-document-formatting-page',
      title: 'Phase 2 Document Formatting',
      slug: 'phase-2-document-formatting',
      page_type: 'document',
      summary: 'Deterministic long-form and table fixture for Phase 2 formatting acceptance.',
      markdown: [
        '# Phase 2 Document Formatting',
        '',
        '## Overview',
        'This long-form paragraph preserves the extracted source meaning while improving the reading structure. Supplier Delta uses fourteen-day payment terms [S1:C1].',
        '',
        'A second paragraph remains distinct from the first so source-backed content is not merged or rewritten by presentation logic.',
        '',
        '- Preserve source meaning [S1:C1]',
        '- Keep citations interactive',
        '- Keep narrow layouts usable',
        '',
        '## Comparison',
        '| Supplier | Payment terms | Evidence |',
        '| --- | --- | --- |',
        '| Delta | 14 days | [S1:C1] |',
        '| Echo | 30 days | [S2:C1] |',
      ].join('\n'),
      source_file_ids: ['phase2-source-delta', 'phase2-source-echo'],
      related_topics: [],
      sections: [],
      sources: [
        {
          id: 'phase2-source-delta-link',
          ref: 'S1',
          source_ref: 'S1',
          file_id: 'phase2-source-delta',
          filename: 'delta-terms.txt',
          absolute_path: '/tmp/delta-terms.txt',
          relative_path: 'delta-terms.txt',
          location: 'Lines 1-2',
          evidence: 'Supplier Delta. Payment terms 14 days.',
          source_hash: 'phase2-delta-hash',
          chunks: [{
            id: 'phase2-delta-chunk',
            ref: 'C1',
            chunk_ref: 'C1',
            source_ref: 'S1',
            chunk_number: 1,
            stable_chunk_key: 'phase2-delta-stable',
            line_start: 1,
            line_end: 2,
            location: 'Lines 1-2',
            text: 'Supplier Delta. Payment terms 14 days.',
            evidence: 'Supplier Delta. Payment terms 14 days.',
          }],
        },
        {
          id: 'phase2-source-echo-link',
          ref: 'S2',
          source_ref: 'S2',
          file_id: 'phase2-source-echo',
          filename: 'echo-terms.txt',
          absolute_path: '/tmp/echo-terms.txt',
          relative_path: 'echo-terms.txt',
          location: 'Line 1',
          evidence: 'Supplier Echo. Payment terms 30 days.',
          source_hash: 'phase2-echo-hash',
          chunks: [{
            id: 'phase2-echo-chunk',
            ref: 'C1',
            chunk_ref: 'C1',
            source_ref: 'S2',
            chunk_number: 1,
            stable_chunk_key: 'phase2-echo-stable',
            line_start: 1,
            line_end: 1,
            location: 'Line 1',
            text: 'Supplier Echo. Payment terms 30 days.',
            evidence: 'Supplier Echo. Payment terms 30 days.',
          }],
        },
      ],
      citation_coverage_score: 1,
      weak_source_warning: false,
      source_fingerprint: 'phase2-document-formatting-fingerprint',
      updated_at: '2026-08-23T00:00:00.000Z',
    },
  ],
};

async function openFixture(page: Page) {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Knowledge Base' }).click();
  await expect(page.getByRole('heading', { name: 'Phase 2 Document Formatting' })).toBeVisible();
}

test('long-form content preserves paragraph/list structure and table citations', async ({ page }) => {
  await openFixture(page);

  await expect(page.locator('.wiki-reading-paragraph')).toHaveCount(2);
  const list = page.locator('.wiki-reading-list');
  await expect(list).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(3);

  const tableRegion = page.getByRole('region', { name: 'Scrollable source-backed table' });
  await expect(tableRegion).toBeVisible();
  await expect(tableRegion.getByRole('columnheader')).toHaveCount(3);
  await expect(tableRegion.getByRole('cell')).toHaveCount(6);
  await expect(tableRegion.getByText('Delta', { exact: true })).toBeVisible();
  await expect(tableRegion.getByText('14 days', { exact: true })).toBeVisible();
  await expect(tableRegion.getByText('Echo', { exact: true })).toBeVisible();
  await expect(tableRegion.getByText('30 days', { exact: true })).toBeVisible();

  const citation = tableRegion.getByRole('button', { name: 'Inspect citation [S1:C1]' });
  await citation.click();
  await expect(page.getByLabel('Focused citation details')).toContainText('delta-terms.txt');
  await expect(page.getByLabel('Source preview drawer')).toContainText('Supplier Delta. Payment terms 14 days.');

  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `${ARTIFACT_DIR}/phase2-long-form-table-desktop.png`, fullPage: true });
});

test('wide source-backed table stays contained at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);

  const tableRegion = page.getByRole('region', { name: 'Scrollable source-backed table' });
  await expect(tableRegion).toBeVisible();
  const dimensions = await tableRegion.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(dimensions.scrollWidth).toBeGreaterThanOrEqual(dimensions.clientWidth);
  await assertNoHorizontalOverflow(page);

  const citation = tableRegion.getByRole('button', { name: 'Inspect citation [S2:C1]' });
  await citation.click();
  await expect(page.getByLabel('Focused citation details')).toContainText('echo-terms.txt');

  await page.screenshot({ path: `${ARTIFACT_DIR}/phase2-long-form-table-390px.png`, fullPage: true });
});
