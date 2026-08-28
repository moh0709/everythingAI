import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'orientation-target',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-27T10:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'orientation-other',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-27T09:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'orientation-audit',
    created_at: '2026-08-27T10:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'orientation-target',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('distinguishes current loaded review window from remembered local review context', async ({ page }) => {
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

  const target = page.getByTestId('execution-orientation-target');
  const other = page.getByTestId('execution-orientation-other');
  await expect(target).toBeVisible();
  await expect(other).toBeVisible();

  const readsBeforeContextNavigation = { executionReads, auditReads };
  await target.getByRole('button', { name: 'View audit evidence' }).click();

  const summary = page.getByTestId('governed-action-review-context-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Current loaded review window');
  await expect(summary).toContainText('Remembered review context');
  await expect(summary).toContainText('2 of 2 executions are visible under the local filter All executions.');
  await expect(summary).toContainText('The remembered local target is orientation-target.');

  await page.getByLabel('Audit evidence filter').selectOption('without');

  await expect(summary).toContainText('Current loaded review window');
  await expect(summary).toContainText('1 of 2 executions are visible under the local filter Without loaded audit evidence.');
  await expect(summary).toContainText('Remembered review context');
  await expect(summary).toContainText('The remembered local target is orientation-target.');
  await expect(summary).toContainText('Changing the loaded-window filter can hide this target without deleting or replacing the remembered local identifier.');
  await expect(summary).toContainText('Safe return is unavailable while the remembered target is outside the current loaded review window; no replacement execution is inferred.');

  await expect(other).toBeVisible();
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');
  expect(executionReads).toBe(readsBeforeContextNavigation.executionReads);
  expect(auditReads).toBe(readsBeforeContextNavigation.auditReads);
  expect(mutationRequests).toBe(0);
});
