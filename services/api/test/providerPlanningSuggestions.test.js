import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listOrganizationSuggestions,
  openDatabase,
  setAppSetting,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { generateConfiguredPreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { getDefaultAiProviderSettings, mergeAiProviderSettings } from '../src/settings/aiProviderSettings.js';

const SETTINGS_KEY = 'ai_provider_settings';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-provider-planning-${Date.now()}-${Math.random()}.sqlite`);
}

async function prepareDb() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-provider-planning-'));
  await fs.writeFile(path.join(root, 'Alpha Contract.md'), '# Alpha\nSupplier contract renewal for alpha account');

  const db = openDatabase(tempDbPath());
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  await scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const file = db.prepare('SELECT * FROM indexed_files WHERE filename = ?').get('Alpha Contract.md');
  return { db, file };
}

test('configured provider can generate safe planning suggestions', async () => {
  const { db, file } = await prepareDb();
  const originalFetch = global.fetch;
  const calls = [];

  const settings = mergeAiProviderSettings({
    ...getDefaultAiProviderSettings(),
    activeProvider: 'lmStudio',
    lmStudio: {
      endpoint: 'http://lmstudio.test/v1',
      model: 'planning-model',
      apiKey: '',
      temperature: 0.1,
      maxTokens: 512,
    },
  });
  setAppSetting(db, SETTINGS_KEY, settings);

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestions: [
                    {
                      action_type: 'category',
                      suggested_value: 'legal',
                      reason: 'The file is a supplier contract renewal.',
                      confidence: 0.92,
                      risk_level: 'low',
                    },
                    {
                      action_type: 'tag',
                      suggested_value: 'supplier',
                      reason: 'The document mentions a supplier account.',
                      confidence: 0.88,
                      risk_level: 'low',
                    },
                    {
                      action_type: 'move',
                      suggested_value: 'contracts',
                      reason: 'The content belongs with contract documents.',
                      confidence: 0.84,
                      risk_level: 'medium',
                    },
                  ],
                }),
              },
            },
          ],
        };
      },
    };
  };

  try {
    const suggestions = await generateConfiguredPreviewSuggestions(db, {
      fileId: file.id,
      mode: 'provider',
    });
    const storedSuggestions = listOrganizationSuggestions(db, { fileId: file.id, limit: 20 });
    const requestBody = JSON.parse(calls[0].options.body);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://lmstudio.test/v1/chat/completions');
    assert.equal(requestBody.model, 'planning-model');
    assert.match(requestBody.messages[0].content, /Return JSON only/);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'category' && suggestion.suggested_value === 'legal'), true);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'tag' && suggestion.suggested_value === 'supplier'), true);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'move' && suggestion.suggested_value === 'contracts'), true);
    assert.equal(suggestions.every((suggestion) => suggestion.requires_approval === 1), true);
    assert.equal(storedSuggestions.some((suggestion) => /Provider lmStudio/.test(suggestion.reason)), true);
  } finally {
    global.fetch = originalFetch;
    db.close();
  }
});

test('configured provider suggestion generation falls back to deterministic suggestions when provider is unavailable', async () => {
  const { db, file } = await prepareDb();

  try {
    const suggestions = await generateConfiguredPreviewSuggestions(db, {
      fileId: file.id,
      mode: 'provider',
    });

    assert.equal(suggestions.length > 0, true);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'category' && suggestion.suggested_value === 'legal'), true);
    assert.equal(suggestions.every((suggestion) => suggestion.requires_approval === 1), true);
  } finally {
    db.close();
  }
});
