import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'orientation-provenance-target',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-28T02:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'orientation-provenance-other',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-28T01:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'orientation-provenance-audit',
    created_at: '2026-08-28T02:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'orientation-provenance-target',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('explains review orientation provenance and unavailable state from loaded/local facts only', async ({ page }) => {
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

  const target = page.getByTestId('execution-orientation-provenance-target');
  const other = page.getByTestId('execution-orientation-provenance-other');
  await expect(target).toBeVisible();
  await expect(other).toBeVisible();

  const readsBeforeContextNavigation = { executionReads, auditReads };
  await target.getByRole('button', { name: 'View audit evidence' }).click();

  const orientation = page.getByTestId('governed-action-review-context-orientation');
  await expect(orientation).toBeVisible();
  await expect(orientation).toContainText('Orientation provenance');
  await expect(orientation).toContainText('Loaded-window facts come from the currently loaded action executions and local audit-evidence filter.');
  await expect(orientation).toContainText('Remembered-context facts come only from the exact local execution identifier recorded by explicit navigation from already-loaded audit evidence.');

  await page.getByLabel('Audit evidence filter').selectOption('without');

  await expect(orientation).toContainText('Unknown-state explanation');
  await expect(orientation).toContainText('The remembered target is not visible in the current loaded review window.');
  await expect(orientation).toContainText('That loaded-window absence does not establish global audit absence, backend persistence, or review completion.');
  await expect(orientation).toContainText('No replacement execution is inferred.');

  await expect(other).toBeVisible();
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');
  expect(executionReads).toBe(readsBeforeContextNavigation.executionReads);
  expect(auditReads).toBe(readsBeforeContextNavigation.auditReads);
  expect(mutationRequests).toBe(0);
});
