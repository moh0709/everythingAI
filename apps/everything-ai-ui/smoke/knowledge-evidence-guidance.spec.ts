import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const fixtureWiki = {
  generated_at: '2026-08-24T00:00:00.000Z',
  page_count: 1,
  pages: [
    {
      id: 'kb-evidence-page',
      title: 'Supplier Evidence Guide',
      slug: 'supplier-evidence-guide',
      page_type: 'topic',
      category: 'Procurement',
      subcategory: 'Evidence',
      summary: 'Source-backed supplier evidence guidance.',
      markdown: '# Supplier Evidence Guide\n\nA cited statement [S1:C1] and an uncited statement.',
      sections: [],
      related_topics: [],
      citation_coverage_score: 0.5,
      weak_source_warning: true,
      source_fingerprint: 'abcdef1234567890',
      sources: [
        {
          id: 'source-1',
          ref: 'S1',
          source_ref: 'S1',
          file_id: 'source-file-1',
          filename: 'supplier-audit.txt',
          absolute_path: '/tmp/supplier-audit.txt',
          relative_path: 'supplier-audit.txt',
          location: 'Lines 1-3',
          evidence: 'Supplier audit evidence.',
          chunks: [
            { ref: 'C1', text: 'Supplier audit evidence.' },
          ],
        },
      ],
    },
  ],
};

test('Knowledge Base explains evidence quality and freshness without inventing confidence or automatic rebuild', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Knowledge Base' }).click();

  const guidance = page.getByLabel('Knowledge evidence guidance');
  await expect(guidance).toBeVisible();
  await expect(guidance).toContainText('50% citation coverage');
  await expect(guidance).toContainText('weak source coverage');
  await expect(guidance).toContainText('not a confidence score');
  await expect(guidance).toContainText('Freshness: unknown.');
  await expect(guidance).toContainText('does not include a verified source-update timestamp');
  await expect(guidance).toContainText('source fingerprint identifies the persisted source set');
  await expect(guidance).toContainText('not a freshness timestamp');
  await expect(guidance).toContainText('Neither action is triggered automatically');

  await guidance.getByRole('button', { name: 'Inspect source evidence' }).click();
  await expect(page.getByLabel('Focused citation details')).toBeVisible();
  await expect(page.getByLabel('Focused citation details')).toContainText('supplier-audit.txt');

  await expect(guidance.getByRole('button', { name: 'Refresh saved knowledge' })).toBeEnabled();
  await expect(guidance.getByRole('button', { name: 'Rebuild from indexed files' })).toBeEnabled();
});
