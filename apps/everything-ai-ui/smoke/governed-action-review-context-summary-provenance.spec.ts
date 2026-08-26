import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'review-summary-provenance-target',
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
    id: 'review-summary-provenance-other',
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
    id: 'review-summary-provenance-audit',
    created_at: '2026-08-26T10:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'review-summary-provenance-target',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('explains review summary provenance and unknown states from loaded local context only', async ({ page }) => {
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

  const target = page.getByTestId('execution-review-summary-provenance-target');
  const other = page.getByTestId('execution-review-summary-provenance-other');
  await expect(target).toBeVisible();
  await expect(other).toBeVisible();

  const readsBeforeContextNavigation = { executionReads, auditReads };
  await target.getByRole('button', { name: 'View audit evidence' }).click();

  const summary = page.getByTestId('governed-action-review-context-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Provenance: local remembered execution identifier recorded by explicit navigation from already-loaded audit evidence.');
  await expect(summary).toContainText('Provenance: matching events from the currently loaded audit window only.');
  await expect(summary).toContainText('Provenance: current local audit-evidence filter selection.');
  await expect(summary).toContainText('Provenance: safe return is derived only from whether the exact remembered execution remains visible in the currently loaded review window.');

  await page.getByLabel('Audit evidence filter').selectOption('without');
  await expect(summary).toContainText('Unknown-state explanation: the exact remembered execution is not visible under the current loaded-window filter; no replacement execution or review completion is inferred.');
  await expect(other).toBeVisible();
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');

  expect(executionReads).toBe(readsBeforeContextNavigation.executionReads);
  expect(auditReads).toBe(readsBeforeContextNavigation.auditReads);
  expect(mutationRequests).toBe(0);
});
