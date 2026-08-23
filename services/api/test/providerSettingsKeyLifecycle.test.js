import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultAiProviderSettings } from '../src/settings/aiProviderSettings.js';
import { isMaskedApiKeyPlaceholder, preserveSavedKeys } from '../src/routes/providerSettings.routes.js';

test('masked API-key placeholders are identified defensively', () => {
  assert.equal(isMaskedApiKeyPlaceholder('__saved__'), true);
  assert.equal(isMaskedApiKeyPlaceholder('********'), true);
  assert.equal(isMaskedApiKeyPlaceholder('••••••••'), true);
  assert.equal(isMaskedApiKeyPlaceholder('real-secret-value'), false);
  assert.equal(isMaskedApiKeyPlaceholder(''), false);
});

test('ordinary provider edits preserve an existing saved key when the public sentinel is returned', () => {
  const existing = getDefaultAiProviderSettings();
  existing.openai.apiKey = 'existing-secret';
  existing.openai.model = 'old-model';

  const incoming = structuredClone(existing);
  incoming.openai.apiKey = '__saved__';
  incoming.openai.model = 'new-model';

  const result = preserveSavedKeys(existing, incoming);
  assert.equal(result.openai.apiKey, 'existing-secret');
  assert.equal(result.openai.model, 'new-model');
});

test('mask-like placeholder text can never replace a stored credential', () => {
  const existing = getDefaultAiProviderSettings();
  existing.openai.apiKey = 'existing-secret';

  for (const placeholder of ['********', '••••••••']) {
    const incoming = structuredClone(existing);
    incoming.openai.apiKey = placeholder;
    const result = preserveSavedKeys(existing, incoming);
    assert.equal(result.openai.apiKey, 'existing-secret');
  }
});

test('explicit empty API key clears a stored credential', () => {
  const existing = getDefaultAiProviderSettings();
  existing.openai.apiKey = 'existing-secret';

  const incoming = structuredClone(existing);
  incoming.openai.apiKey = '';

  const result = preserveSavedKeys(existing, incoming);
  assert.equal(result.openai.apiKey, '');
});

test('a genuine replacement API key replaces the stored credential', () => {
  const existing = getDefaultAiProviderSettings();
  existing.openai.apiKey = 'existing-secret';

  const incoming = structuredClone(existing);
  incoming.openai.apiKey = 'replacement-secret';

  const result = preserveSavedKeys(existing, incoming);
  assert.equal(result.openai.apiKey, 'replacement-secret');
});
