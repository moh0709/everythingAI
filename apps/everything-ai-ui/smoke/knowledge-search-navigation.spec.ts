import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const fixtureWiki = {
  generated_at: '2026-08-24T00:00:00.000Z',
  page_count: 4,
  pages: [
    {
      id: 'kb-title-page',
      title: 'Renewable Supplier Guide',
      slug: 'renewable-supplier-guide',
      page_type: 'topic',
      category: 'Procurement',
      subcategory: 'Suppliers',
      summary: 'Guidance for strategic supplier qualification.',
      markdown: '# Renewable Supplier Guide\n\nQualification rules for strategic partners.',
      sections: [],
      sources: [],
      related_topics: [],
      citation_coverage_score: 1,
      weak_source_warning: false,
    },
    {
      id: 'kb-content-page',
      title: 'Contract Operations',
      slug: 'contract-operations',
      page_type: 'topic',
      category: 'Operations',
      subcategory: 'Contracts',
      summary: 'Operational contract procedures.',
      markdown: '# Contract Operations\n\nThe renewable obligations apply to supplier onboarding and annual review.',
      sections: [],
      sources: [],
      related_topics: [],
      citation_coverage_score: 1,
      weak_source_warning: false,
    },
    {
      id: 'kb-source-page',
      title: 'Evidence Register',
      slug: 'evidence-register',
      page_type: 'file',
      category: 'Governance',
      subcategory: 'Evidence',
      summary: 'Source-backed evidence register.',
      markdown: '# Evidence Register\n\nPrimary evidence is maintained by the governance team.',
      sections: [],
      related_topics: [],
      citation_coverage_score: 1,
      weak_source_warning: false,
      sources: [
        {
          id: 'source-1',
          ref: 'S1',
          source_ref: 'S1',
          file_id: 'source-file-1',
          filename: 'renewable-audit-record.txt',
          absolute_path: '/tmp/renewable-audit-record.txt',
          relative_path: 'renewable-audit-record.txt',
          location: 'Lines 1-3',
          evidence: 'Audit evidence for annual controls.',
          chunks: [],
        },
      ],
    },
    {
      id: 'kb-substring-page',
      title: 'Legacy Energy Classification',
      slug: 'legacy-energy-classification',
      page_type: 'topic',
      category: 'Archive',
      subcategory: 'Classification',
      summary: 'Legacy terminology retained for historical comparison.',
      markdown: '# Legacy Energy Classification\n\nThe nonrenewable classification remains in the historical archive.',
      sections: [],
      sources: [],
      related_topics: [],
      citation_coverage_score: 1,
      weak_source_warning: false,
    },
  ],
};

test('Knowledge Base search explains match fields without exposing heuristic scores and highlights only literal terms', async ({ page }) => {
  await page.route('**/api/wiki?*', async (route) => {
    await route.fulfill({ json: { wiki: fixtureWiki } });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Knowledge Base' }).click();

  const search = page.getByPlaceholder('Search titles, topics, document content, source files...');
  await search.fill('renewable');

  const results = page.getByLabel('Knowledge Base search results');
  await expect(results).toBeVisible();
  await expect(results).not.toContainText('score ');
  await expect(results).not.toContainText('confidence');
  await expect(results).not.toContainText('relevance');

  const titleResult = results.getByRole('button', { name: 'Open Renewable Supplier Guide' });
  await expect(titleResult).toContainText('Matched: Title');
  await expect(titleResult.locator('mark')).toHaveCount(2);
  await expect(titleResult.locator('mark').first()).toHaveText('Renewable');

  const contentResult = results.getByRole('button', { name: 'Open Contract Operations' });
  await expect(contentResult).toContainText('Matched: Content');
  await expect(contentResult).toContainText('renewable obligations apply to supplier onboarding');
  await expect(contentResult.locator('mark')).toHaveCount(1);
  await expect(contentResult.locator('mark')).toHaveText('renewable');

  const sourceResult = results.getByRole('button', { name: 'Open Evidence Register' });
  await expect(sourceResult).toContainText('Matched: Source');
  await expect(sourceResult).toContainText('renewable-audit-record.txt');
  await expect(sourceResult.locator('mark')).toHaveCount(3);
  await expect(sourceResult.locator('mark').first()).toHaveText('renewable');

  const substringResult = results.getByRole('button', { name: 'Open Legacy Energy Classification' });
  await expect(substringResult).toContainText('Matched: Content');
  await expect(substringResult).toContainText('nonrenewable classification remains in the historical archive');
  await expect(substringResult.locator('mark')).toHaveCount(0);

  await contentResult.click();
  await expect(page.getByRole('heading', { name: 'Contract Operations' })).toBeVisible();
  await expect(page.getByText('Operations / Contracts')).toBeVisible();

  await search.fill('absentterm');
  await expect(page.getByLabel('Knowledge Base search results').locator('mark')).toHaveCount(0);
});
