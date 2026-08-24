import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'execution-ready-1',
    execution_batch_id: 'batch-1',
    preview_id: 'preview-1',
    file_id: 'file-1',
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/invoice.txt',
    target_path: '/workspace/Reviewed/invoice.txt',
    error_message: null,
    executed_at: '2026-08-24T06:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'execution-undone-1',
    execution_batch_id: 'batch-1',
    preview_id: 'preview-2',
    file_id: 'file-2',
    action_type: 'rename',
    status: 'undone',
    source_path: '/workspace/draft.txt',
    target_path: '/workspace/final.txt',
    error_message: null,
    executed_at: '2026-08-24T05:00:00.000Z',
    undone_at: '2026-08-24T05:10:00.000Z',
  },
  {
    id: 'execution-failed-1',
    execution_batch_id: null,
    preview_id: 'preview-3',
    file_id: 'file-3',
    action_type: 'move',
    status: 'failed',
    source_path: '/workspace/report.txt',
    target_path: '/workspace/Archive/report.txt',
    error_message: 'Target path already exists.',
    executed_at: '2026-08-24T04:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'execution-label-undone-1',
    execution_batch_id: null,
    preview_id: 'preview-4',
    file_id: 'file-4',
    action_type: 'category',
    status: 'undone',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-24T03:00:00.000Z',
    undone_at: '2026-08-24T03:05:00.000Z',
  },
];

const auditEvents = [
  {
    id: 'audit-executed-1',
    created_at: '2026-08-24T06:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'execution-ready-1',
    event_type: 'action.executed',
    actor_type: 'user',
    actor_id: 'admin-1',
  },
  {
    id: 'audit-executed-2',
    created_at: '2026-08-24T05:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'execution-undone-1',
    event_type: 'action.executed',
    actor_type: 'user',
    actor_id: 'admin-1',
  },
  {
    id: 'audit-undone-2',
    created_at: '2026-08-24T05:10:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'execution-undone-1',
    event_type: 'action.undone',
    actor_type: 'user',
    actor_id: 'admin-1',
  },
  {
    id: 'audit-failed-3',
    created_at: '2026-08-24T04:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'execution-failed-1',
    event_type: 'action.failed',
    actor_type: 'user',
    actor_id: 'admin-1',
  },
  {
    id: 'audit-label-undone-4',
    created_at: '2026-08-24T03:05:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'execution-label-undone-1',
    event_type: 'action.undone',
    actor_type: 'user',
    actor_id: 'admin-1',
  },
  {
    id: 'audit-unrelated',
    created_at: '2026-08-24T02:00:00.000Z',
    entity_type: 'indexed_file',
    entity_id: 'file-other',
    event_type: 'file.indexed',
    actor_type: 'system',
  },
];

test('Analytics explains governed execution, audit, and undo outcomes from persisted facts', async ({ page }) => {
  await page.route('**/api/action-executions?limit=100', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ executions }),
    });
  });

  await page.route('**/api/audit-log**', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ events: auditEvents }),
    });
  });

  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('navigation').getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Logging & Analytics Dashboard' })).toBeVisible();

  const executed = page.getByTestId('execution-execution-ready-1');
  await expect(executed).toContainText('Executed successfully');
  await expect(executed).toContainText('Persisted status: executed');
  await expect(executed).toContainText('Executed:');
  await expect(executed).toContainText('2026');
  await expect(executed.getByTestId('execution-audit-execution-ready-1')).toContainText('action.executed');
  await expect(executed).not.toContainText('file.indexed');
  await expect(executed).toContainText('Undo available');
  await expect(executed).toContainText('explicit approval required');
  await expect(executed.getByRole('button', { name: 'Undo move execution' })).toBeEnabled();

  const undone = page.getByTestId('execution-execution-undone-1');
  await expect(undone).toContainText('Restored by undo');
  await expect(undone).toContainText('Persisted status: undone');
  await expect(undone).toContainText('Restored:');
  await expect(undone.getByTestId('execution-audit-execution-undone-1')).toContainText('action.executed');
  await expect(undone.getByTestId('execution-audit-execution-undone-1')).toContainText('action.undone');
  await expect(undone).toContainText('Restored');
  await expect(undone.getByRole('button', { name: /Undo/ })).toHaveCount(0);

  const failed = page.getByTestId('execution-execution-failed-1');
  await expect(failed).toContainText('Execution failed');
  await expect(failed).toContainText('Persisted status: failed');
  await expect(failed).toContainText('Target path already exists.');
  await expect(failed.getByTestId('execution-audit-execution-failed-1')).toContainText('action.failed');
  await expect(failed).toContainText('Undo unavailable');
  await expect(failed.getByRole('button', { name: /Undo/ })).toHaveCount(0);

  const labelUndo = page.getByTestId('execution-execution-label-undone-1');
  await expect(labelUndo).toContainText('Undo recorded');
  await expect(labelUndo).toContainText('Persisted status: undone');
  await expect(labelUndo).not.toContainText('Restored by undo');
  await expect(labelUndo.getByTestId('execution-audit-execution-label-undone-1')).toContainText('action.undone');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(executed).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
});
