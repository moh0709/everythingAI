import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'review-provenance-target',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-26T08:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'review-provenance-other',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-26T07:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'review-provenance-audit',
    created_at: '2026-08-26T08:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'review-provenance-target',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('explains remembered review provenance and clears only local review navigation context', async ({ page }) => {
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

  const target = page.getByTestId('execution-review-provenance-target');
  const other = page.getByTestId('execution-review-provenance-other');
  await expect(target).toBeVisible();
  await expect(other).toBeVisible();

  const readsBeforeContextNavigation = { executionReads, auditReads };

  await target.getByRole('button', { name: 'View audit evidence' }).click();
  await expect(page.getByTestId('audit-review-provenance-audit')).toBeFocused();

  const context = page.getByTestId('governed-action-review-context');
  await expect(context).toContainText('review-provenance-target');
  await expect(context).toContainText('explicit navigation from already-loaded governed-action audit evidence');
  await expect(context).toContainText('local navigation context');
  await expect(context).toContainText('does not mean the backend persisted review state or that review is complete');

  await context.getByRole('button', { name: 'Clear remembered review context' }).click();
  await expect(page.getByTestId('governed-action-review-context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume execution review' })).toHaveCount(0);
  await expect(target).not.toHaveAttribute('data-review-focus', 'true');
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');

  expect(executionReads).toBe(readsBeforeContextNavigation.executionReads);
  expect(auditReads).toBe(readsBeforeContextNavigation.auditReads);
  expect(mutationRequests).toBe(0);
});
