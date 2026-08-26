import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'filter-with-evidence',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-26T05:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'filter-without-evidence',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-26T04:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'filter-audit-match',
    created_at: '2026-08-26T05:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'filter-with-evidence',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('filters governed-action history using only the loaded audit window', async ({ page }) => {
  let executionReads = 0;
  let auditReads = 0;
  let mutationRequests = 0;

  await page.route('**/api/action-executions?limit=100', async (route) => {
    if (route.request().method() !== 'GET') {
      mutationRequests += 1;
      return route.continue();
    }
    executionReads += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ executions }) });
  });

  await page.route('**/api/audit-log**', async (route) => {
    if (route.request().method() !== 'GET') {
      mutationRequests += 1;
      return route.continue();
    }
    auditReads += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: auditEvents }) });
  });

  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('navigation').getByRole('button', { name: 'Analytics', exact: true }).click();

  const filter = page.getByLabel('Audit evidence filter');
  const withEvidence = page.getByTestId('execution-filter-with-evidence');
  const withoutEvidence = page.getByTestId('execution-filter-without-evidence');
  const context = page.getByTestId('governed-action-evidence-filter-context');

  await expect(filter).toHaveValue('all');
  await expect(withEvidence).toBeVisible();
  await expect(withoutEvidence).toBeVisible();
  await expect(context).toContainText('Showing 2 of 2 executions');
  await expect(context).toContainText('loaded audit window');
  await expect(context).toContainText('does not prove');

  const readsBeforeFiltering = { executionReads, auditReads };

  await filter.selectOption('with');
  await expect(withEvidence).toBeVisible();
  await expect(withoutEvidence).toHaveCount(0);
  await expect(context).toContainText('Showing 1 of 2 executions');

  await filter.selectOption('without');
  await expect(withEvidence).toHaveCount(0);
  await expect(withoutEvidence).toBeVisible();
  await expect(context).toContainText('Showing 1 of 2 executions');
  await expect(withoutEvidence).toContainText('loaded log window');

  expect(executionReads).toBe(readsBeforeFiltering.executionReads);
  expect(auditReads).toBe(readsBeforeFiltering.auditReads);
  expect(mutationRequests).toBe(0);
});
