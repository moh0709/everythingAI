import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const API_URL = process.env.EVERYTHINGAI_API_URL || 'http://localhost:4100';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';

async function saveScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${ARTIFACT_DIR}/${name}.png`,
    fullPage: true,
  });
}

test.describe('EverythingAI Client/Admin UX smoke agent', () => {
  test('client workspace clearly separates sources, files, knowledge base, and ask AI', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.getByText('CLIENT WORKSPACE')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sources & Files' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Knowledge Base' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask AI' })).toBeVisible();
    await saveScreenshot(page, '01-client-home');

    await page.getByRole('button', { name: 'Sources & Files' }).click();
    await expect(page.getByText('CLIENT SOURCES & FILE CONTENT')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sources & Files' })).toBeVisible();
    await expect(page.getByText('raw indexed files and extracted file content', { exact: false })).toBeVisible();
    await saveScreenshot(page, '02-client-sources-files');

    await page.getByRole('button', { name: 'Knowledge Base' }).click();
    await expect(page.getByText('CLIENT KNOWLEDGE BASE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible();
    await expect(page.getByText('saved knowledge database', { exact: false })).toBeVisible();
    await saveScreenshot(page, '03-client-knowledge-base');

    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect(page.getByRole('heading', { name: 'Ask AI about the Knowledge Base' })).toBeVisible();
    await expect(page.getByText('Knowledge-base chat')).toBeVisible();
    await saveScreenshot(page, '04-client-ask-ai');
  });

  test('client ask view keeps the latest message visible after submit', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect(page.getByRole('heading', { name: 'Ask AI about the Knowledge Base' })).toBeVisible();

    const input = page.getByPlaceholder('Ask about the knowledge base, file content, source context, or extracted documents...');
    await input.fill('Smoke test: confirm what source this answer is based on.');
    await page.getByRole('button', { name: 'Ask' }).click();

    await expect(page.getByText('Smoke test: confirm what source this answer is based on.')).toBeVisible();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '05-client-ask-after-message');

    const lastUserMessage = page.getByText('Smoke test: confirm what source this answer is based on.');
    await expect(lastUserMessage).toBeInViewport();
  });

  test('admin dashboard is clearly separated from client workspace', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
    await expect(page.getByText('ADMIN DASHBOARD').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Operator Control Center' })).toBeVisible();
    await expect(page.getByText('Normal users should use the Client Workspace', { exact: false })).toBeVisible();
    await saveScreenshot(page, '06-admin-dashboard');

    await expect(page.getByRole('button', { name: 'Files & Content' })).toBeVisible();
    await page.getByRole('button', { name: 'Files & Content' }).click();
    await saveScreenshot(page, '07-admin-files-content');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Advanced Settings' })).toBeVisible();
    await expect(page.getByText('AI Provider Configuration')).toBeVisible();
    await expect(page.getByText('Enable remote providers through server policy')).toBeVisible();
    await saveScreenshot(page, '08-admin-settings-providers');
  });

  test('backend API is reachable for real smoke testing', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/status`);
    expect(response.ok(), `Expected backend status endpoint to be reachable at ${API_URL}/api/status`).toBeTruthy();
  });
});
