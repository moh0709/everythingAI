import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';

const executions = [
  {
    id: 'resume-review-target',
    execution_batch_id: null,
    action_type: 'move',
    status: 'executed',
    source_path: '/workspace/a.txt',
    target_path: '/workspace/Reviewed/a.txt',
    error_message: null,
    executed_at: '2026-08-26T07:00:00.000Z',
    undone_at: null,
  },
  {
    id: 'resume-review-other',
    execution_batch_id: null,
    action_type: 'category',
    status: 'executed',
    source_path: null,
    target_path: null,
    error_message: null,
    executed_at: '2026-08-26T06:00:00.000Z',
    undone_at: null,
  },
];

const auditEvents = [
  {
    id: 'resume-review-audit',
    created_at: '2026-08-26T07:00:01.000Z',
    entity_type: 'action_execution',
    entity_id: 'resume-review-target',
    event_type: 'action.executed',
    actor_type: 'user',
  },
];

test('preserves and safely resumes the same governed-action review context from loaded state only', async ({ page }) => {
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

  const target = page.getByTestId('execution-resume-review-target');
  const other = page.getByTestId('execution-resume-review-other');
  await expect(target).toBeVisible();
  await expect(other).toBeVisible();

  const readsBeforeReviewNavigation = { executionReads, auditReads };

  await target.getByRole('button', { name: 'View audit evidence' }).click();
  await expect(page.getByTestId('audit-resume-review-audit')).toBeFocused();

  const resume = page.getByRole('button', { name: 'Resume execution review' });
  await expect(resume).toBeVisible();
  await expect(page.getByTestId('governed-action-review-context')).toContainText('resume-review-target');
  await expect(page.getByTestId('governed-action-review-context')).toContainText('loaded state');

  await resume.click();
  await expect(target).toBeFocused();
  await expect(target).toHaveAttribute('data-review-focus', 'true');
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');

  await page.getByLabel('Audit evidence filter').selectOption('without');
  await expect(target).toHaveCount(0);
  await expect(other).toBeVisible();
  await expect(page.getByLabel('Governed-action review resumption unavailable')).toContainText('remembered execution is not visible in the current loaded review window');
  await expect(other).not.toHaveAttribute('data-review-focus', 'true');

  expect(executionReads).toBe(readsBeforeReviewNavigation.executionReads);
  expect(auditReads).toBe(readsBeforeReviewNavigation.auditReads);
  expect(mutationRequests).toBe(0);
});
