import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.EVERYTHINGAI_UI_URL || 'http://localhost:5151';
const ARTIFACT_DIR = process.env.EVERYTHINGAI_SMOKE_ARTIFACT_DIR || 'test-results/everythingai-smoke';

const remoteProviders = [
  'openai', 'anthropic', 'openrouter', 'cerebras', 'mistral', 'google', 'deepseek', 'groq',
  'xai', 'moonshot', 'together', 'fireworks', 'perplexity', 'azureOpenAI', 'lmStudio', 'customOpenAI',
] as const;

function providerBlock() {
  return {
    endpoint: 'https://example.invalid/v1',
    apiKey: '',
    model: 'phase2-test-model',
    temperature: 0.2,
    maxTokens: 2048,
  };
}

function providerSettingsFixture() {
  const settings: any = {
    remoteProvidersEnabled: true,
    activeProvider: 'openai',
    ollama: {
      endpoint: 'http://127.0.0.1:11434',
      model: 'local-test-model',
      temperature: 0.2,
      maxTokens: 2048,
      timeoutMs: 120000,
    },
    planning: {
      strategy: 'deterministic',
      confidenceThreshold: 0.7,
      allowRename: true,
      allowMove: true,
      allowTag: true,
      allowCategory: true,
      requireApproval: true,
      dryRunOnly: false,
    },
    agentIntegrations: {},
  };

  for (const provider of remoteProviders) settings[provider] = providerBlock();
  settings.azureOpenAI = { ...providerBlock(), deployment: '', apiVersion: '' };
  settings.openai.apiKey = '__saved__';
  return settings;
}

function providerModelsFixture() {
  return Object.fromEntries(['ollama', ...remoteProviders].map((provider) => [provider, [{ id: 'phase2-test-model', name: 'Phase 2 test model' }]]));
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('Admin explicitly preserves, replaces, and confirms clearing saved provider keys without exposing secrets', async ({ page }) => {
  let serverSettings = providerSettingsFixture();
  const putBodies: any[] = [];

  await page.route('**/api/provider-settings', async (route) => {
    if (route.request().method() === 'PUT') {
      const incoming = route.request().postDataJSON();
      putBodies.push(incoming);
      serverSettings = structuredClone(incoming);
      serverSettings.openai.apiKey = incoming.openai.apiKey === '' ? '' : '__saved__';
      await route.fulfill({ json: { settings: serverSettings, providers: ['ollama', ...remoteProviders] } });
      return;
    }
    await route.fulfill({ json: { settings: serverSettings, providers: ['ollama', ...remoteProviders] } });
  });

  await page.route('**/api/provider-settings/models', async (route) => {
    await route.fulfill({ json: {
      models: providerModelsFixture(),
      remoteProvidersEnabled: true,
      providers: ['ollama', ...remoteProviders],
    } });
  });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await expect(page.getByText('AI Provider Configuration')).toHaveCount(0);
  await expect(page.getByLabel('OpenAI API key')).toHaveCount(0);

  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'OpenAI Remote model provider', exact: true }).click();

  const apiKeyInput = page.getByLabel('OpenAI API key');
  await expect(apiKeyInput).toBeDisabled();
  await expect(apiKeyInput).toHaveValue('');
  await expect(page.getByText('Saved key preserved', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace saved key' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('__saved__');

  await page.getByRole('button', { name: 'Replace saved key' }).click();
  await expect(apiKeyInput).toBeEnabled();
  await expect(page.getByText('Replacement mode', { exact: true })).toBeVisible();
  await apiKeyInput.fill('phase2-replacement-secret');
  await expect(page.getByText('Replace key', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save AI Settings' }).click();
  await expect.poll(() => putBodies.length).toBe(1);
  expect(putBodies[0].openai.apiKey).toBe('phase2-replacement-secret');
  await expect(page.locator('body')).not.toContainText('phase2-replacement-secret');

  const endpointInput = page.getByLabel('Endpoint');
  await endpointInput.fill('https://updated.example.invalid/v1');
  await page.getByRole('button', { name: 'Save AI Settings' }).click();
  await expect.poll(() => putBodies.length).toBe(2);
  expect(putBodies[1].openai.apiKey).toBe('__saved__');
  expect(putBodies[1].openai.endpoint).toBe('https://updated.example.invalid/v1');

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Clear the saved OpenAI API key?');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Clear key' }).click();
  await expect(page.getByText('Saved key preserved', { exact: false })).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('removed only after you click Save AI Settings');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Clear key' }).click();
  await expect(page.getByText('Clear pending', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save AI Settings' }).click();
  await expect.poll(() => putBodies.length).toBe(3);
  expect(putBodies[2].openai.apiKey).toBe('');
  await expect(page.getByText('No key configured', { exact: false })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `${ARTIFACT_DIR}/phase2-api-key-lifecycle-narrow.png`, fullPage: true });
});
