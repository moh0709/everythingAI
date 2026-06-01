import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {
  openDatabase,
  setAppSetting,
} from '../src/db/client.js';
import { createConfiguredChatAnswer } from '../src/ai/providerRuntime.js';
import { getDefaultAiProviderSettings, mergeAiProviderSettings } from '../src/settings/aiProviderSettings.js';

const SETTINGS_KEY = 'ai_provider_settings';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-provider-errors-${Date.now()}-${Math.random()}.sqlite`);
}

function saveAiSettings(db, overrides) {
  setAppSetting(db, SETTINGS_KEY, mergeAiProviderSettings({
    ...getDefaultAiProviderSettings(),
    ...overrides,
  }));
}

function sources() {
  return [
    {
      filename: 'Alpha Notes.md',
      absolute_path: 'C:\\fixture\\Alpha Notes.md',
      snippet: '[supplier] contract alpha renewal',
    },
  ];
}

test('provider runtime explains remote provider policy blocks', async () => {
  const db = openDatabase(tempDbPath());

  try {
    saveAiSettings(db, {
      activeProvider: 'openrouter',
      remoteProvidersEnabled: false,
    });

    const result = await createConfiguredChatAnswer({
      db,
      question: 'supplier contract',
      sources: sources(),
    });

    assert.equal(result.provider, 'openrouter');
    assert.equal(result.provider_status, 'unavailable');
    assert.equal(result.provider_error_code, 'remote_policy_disabled');
    assert.match(result.provider_error_hint, /Enable remote providers/i);
  } finally {
    db.close();
  }
});

test('provider runtime explains missing API keys', async () => {
  const db = openDatabase(tempDbPath());

  try {
    saveAiSettings(db, {
      activeProvider: 'openai',
      remoteProvidersEnabled: true,
      openai: {
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
      },
    });

    const result = await createConfiguredChatAnswer({
      db,
      question: 'supplier contract',
      sources: sources(),
    });

    assert.equal(result.provider, 'openai');
    assert.equal(result.provider_status, 'unavailable');
    assert.equal(result.provider_error_code, 'missing_api_key');
    assert.match(result.provider_error_hint, /credential/i);
  } finally {
    db.close();
  }
});

test('provider runtime classifies provider HTTP authorization failures', async () => {
  const db = openDatabase(tempDbPath());
  const originalFetch = globalThis.fetch;

  try {
    saveAiSettings(db, {
      activeProvider: 'lmStudio',
      lmStudio: {
        endpoint: 'http://provider.test/v1',
        apiKey: '',
        model: 'local-model',
        temperature: 0.2,
        maxTokens: 128,
      },
    });

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      async json() {
        return {};
      },
    });

    const result = await createConfiguredChatAnswer({
      db,
      question: 'supplier contract',
      sources: sources(),
    });

    assert.equal(result.provider, 'lmStudio');
    assert.equal(result.provider_status, 'unavailable');
    assert.equal(result.provider_error_code, 'auth_failed');
    assert.match(result.provider_error_hint, /credential/i);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
});
