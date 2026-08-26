import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'nav-matched',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-26T02:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'nav-unmatched',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-26T01:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'nav-audit-first',
    created_at: '2026-08-26T02:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'nav-matched',
    event_type: 'action.executed',
    actor_type: 'user',
  },
  {
    id: 'nav-audit-second',
    created_at: '2026-08-26T02:00:02.000Z',
    entity_type: 'action_execution',
    entity_id: 'nav-matched',
    event_type: 'action.reviewed',
    actor_type: 'system',
  },
];

test('execution outcome navigates only to genuine matching audit evidence already loaded', async ({ page }) => {
  let mutationRequests = 0;

  await page.route('**/api/action-executions?limit=100', async (route) => {
    if (route.request().method() !== 'GET') {
      mutationRequests += 1;
      return route.continue();
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ executions }) });
  });

  await page.route('**/api/audit-log**', async (route) => {
    if (route.request().method() !== 'GET') {
      mutationRequests += 1;
      return route.continue();
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: auditEvents }) });
  });

  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('navigation').getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Logging & Analytics Dashboard' })).toBeVisible();

  const matched = page.getByTestId('execution-nav-matched');
  const unmatched = page.getByTestId('execution-nav-unmatched');

  const evidenceButton = matched.getByRole('button', { name: 'View audit evidence' });
  await expect(evidenceButton).toBeVisible();
  await expect(matched).toContainText('2 persisted audit events');

  await expect(unmatched.getByRole('button', { name: 'View audit evidence' })).toHaveCount(0);
  await expect(unmatched).toContainText('loaded log window');

  const firstAudit = page.getByTestId('audit-nav-audit-first');
  const secondAudit = page.getByTestId('audit-nav-audit-second');
  await expect(firstAudit).not.toHaveAttribute('data-evidence-focus', 'true');
  await expect(secondAudit).not.toHaveAttribute('data-evidence-focus', 'true');

  await evidenceButton.click();

  await expect(firstAudit).toHaveAttribute('data-evidence-focus', 'true');
  await expect(firstAudit).toBeFocused();
  await expect(secondAudit).not.toHaveAttribute('data-evidence-focus', 'true');
  expect(mutationRequests).toBe(0);
});
