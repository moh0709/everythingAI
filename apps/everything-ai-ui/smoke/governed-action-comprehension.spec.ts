import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'comprehension-executed',
    execution_batch_id: 'batch-comprehension',
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/invoice.txt',
    target_path: '/workspace/Reviewed/invoice.txt',
    error_message: null,
    executed_at: '2026-08-26T01:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'comprehension-failed',
    execution_batch_id: null,
    action_type: 'move',
    status: 'failed',
    source_path: '/workspace/report.txt',
    target_path: '/workspace/Archive/report.txt',
    error_message: 'Target path already exists.',
    executed_at: '2026-08-26T00:30:00.000Z',
    undone_at: null,
  },
  {
    id: 'comprehension-undone',
    execution_batch_id: null,
    action_type: 'rename',
    status: 'undone',
    source_path: '/workspace/draft.txt',
    target_path: '/workspace/final.txt',
    error_message: null,
    executed_at: '2026-08-26T00:00:00.000Z',
    undone_at: '2026-08-26T00:10:00.000Z',
  },
  {
    id: 'comprehension-no-audit',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-25T23:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'comprehension-audit-executed',
    created_at: '2026-08-26T01:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'comprehension-executed',
    event_type: 'action.executed',
    actor_type: 'user',
  },
  {
    id: 'comprehension-audit-failed',
    created_at: '2026-08-26T00:30:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'comprehension-failed',
    event_type: 'action.failed',
    actor_type: 'user',
  },
  {
    id: 'comprehension-audit-undone',
    created_at: '2026-08-26T00:10:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'comprehension-undone',
    event_type: 'action.undone',
    actor_type: 'user',
  },
];

test('Analytics explains the governed-action lifecycle without changing authoritative states', async ({ page }) => {
  await page.route('**/api/action-executions?limit=100', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ executions }) });
  });

  await page.route('**/api/audit-log**', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: auditEvents }) });
  });

  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('navigation').getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Logging & Analytics Dashboard' })).toBeVisible();

  const guide = page.getByTestId('governed-action-comprehension');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Preview is proposal only');
  await expect(guide).toContainText('Ready for approval');
  await expect(guide).toContainText('explicit approval');
  await expect(guide).toContainText('Blocked preview');
  await expect(guide).toContainText('backend reason');
  await expect(guide).toContainText('Executed');
  await expect(guide).toContainText('Failed');
  await expect(guide).toContainText('Undone');
  await expect(guide).toContainText('loaded audit window');

  const executed = page.getByTestId('execution-comprehension-executed');
  await expect(executed).toContainText('Persisted status: executed');
  await expect(executed.getByRole('button', { name: 'Undo move execution' })).toBeEnabled();

  const failed = page.getByTestId('execution-comprehension-failed');
  await expect(failed).toContainText('Persisted status: failed');
  await expect(failed).toContainText('Target path already exists.');
  await expect(failed.getByRole('button', { name: /Undo/ })).toHaveCount(0);

  const undone = page.getByTestId('execution-comprehension-undone');
  await expect(undone).toContainText('Persisted status: undone');
  await expect(undone.getByRole('button', { name: /Undo/ })).toHaveCount(0);

  const noAudit = page.getByTestId('execution-comprehension-no-audit');
  await expect(noAudit.getByTestId('execution-audit-comprehension-no-audit')).toContainText('loaded log window');
  await expect(noAudit).not.toContainText('No audit exists');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(guide).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
});
