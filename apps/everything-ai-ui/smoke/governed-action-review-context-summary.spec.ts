import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'review-summary-target',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-26T10:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'review-summary-other',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-26T09:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'review-summary-audit',
    created_at: '2026-08-26T10:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'review-summary-target',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('summarizes only genuine loaded review context and safe return availability', async ({ page }) => {
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

  const target = page.getByTestId('execution-review-summary-target');
  const other = page.getByTestId('execution-review-summary-other');
  await expect(target).toBeVisible();
  await expect(other).toBeVisible();

  const readsBeforeContextNavigation = { executionReads, auditReads };
  await target.getByRole('button', { name: 'View audit evidence' }).click();

  const summary = page.getByTestId('governed-action-review-context-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Review context summary');
  await expect(summary).toContainText('review-summary-target');
  await expect(summary).toContainText('Loaded audit evidence: Available in the current loaded audit window (1 event)');
  await expect(summary).toContainText('Navigation origin: Already-loaded governed-action audit evidence');
  await expect(summary).toContainText('Loaded evidence filter: All executions');
  await expect(summary).toContainText('Safe return target: Resume exact remembered execution review');
  await expect(summary).toContainText('Local navigation only');
  await expect(summary).toContainText('does not prove backend persistence or review completion');

  await page.getByLabel('Audit evidence filter').selectOption('without');
  await expect(summary).toContainText('Loaded evidence filter: Without loaded audit evidence');
  await expect(summary).toContainText('Safe return target: Unavailable');
  await expect(summary).toContainText('remembered execution is not visible in the current loaded review window');
  await expect(other).toBeVisible();
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');

  expect(executionReads).toBe(readsBeforeContextNavigation.executionReads);
  expect(auditReads).toBe(readsBeforeContextNavigation.auditReads);
  expect(mutationRequests).toBe(0);
});
