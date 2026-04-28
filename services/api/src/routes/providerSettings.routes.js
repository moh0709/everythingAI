import { Router } from 'express';
import { openDatabase, getAppSetting, setAppSetting } from '../db/client.js';
import { getDefaultAiProviderSettings, listDefaultModels, mergeAiProviderSettings } from '../settings/aiProviderSettings.js';

const SETTINGS_KEY = 'ai_provider_settings';

async function fetchOllamaModels(endpoint) {
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`);
    if (!response.ok) return null;
    const payload = await response.json();
    return (payload.models || []).map((model) => ({ id: model.name, name: model.name }));
  } catch {
    return null;
  }
}

function publicSettings(settings) {
  const copy = JSON.parse(JSON.stringify(settings));
  for (const provider of ['openrouter', 'cerebras', 'mistral', 'google']) {
    if (copy[provider]?.apiKey) copy[provider].apiKey = '__saved__';
  }
  return copy;
}

function preserveSavedKeys(existing, incoming) {
  const next = mergeAiProviderSettings(incoming);
  for (const provider of ['openrouter', 'cerebras', 'mistral', 'google']) {
    if (next[provider]?.apiKey === '__saved__') next[provider].apiKey = existing[provider]?.apiKey || '';
  }
  return next;
}

export function createProviderSettingsRouter() {
  const router = Router();

  router.get('/provider-settings', (_req, res) => {
    const db = openDatabase();
    const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
    db.close();
    res.json({ settings: publicSettings(settings) });
  });

  router.put('/provider-settings', (req, res) => {
    const db = openDatabase();
    const existing = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
    const settings = preserveSavedKeys(existing, req.body || {});
    setAppSetting(db, SETTINGS_KEY, settings);
    db.close();
    res.json({ settings: publicSettings(settings) });
  });

  router.get('/provider-settings/models', async (_req, res) => {
    const db = openDatabase();
    const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
    db.close();
    const defaults = listDefaultModels();
    const ollamaModels = await fetchOllamaModels(settings.ollama.endpoint);
    res.json({ models: { ...defaults, ollama: ollamaModels?.length ? ollamaModels : defaults.ollama }, remoteProvidersEnabled: settings.remoteProvidersEnabled });
  });

  router.post('/provider-settings/test', async (req, res) => {
    const db = openDatabase();
    const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
    db.close();
    const provider = req.body?.provider || settings.activeProvider;
    if (provider === 'ollama') {
      const models = await fetchOllamaModels(settings.ollama.endpoint);
      return res.json({ provider, connected: Array.isArray(models), message: Array.isArray(models) ? 'Ollama connection successful.' : 'Ollama is not reachable.' });
    }
    if (!settings.remoteProvidersEnabled) return res.json({ provider, connected: false, message: 'Remote providers are disabled by policy.' });
    return res.json({ provider, connected: false, message: 'Remote provider test proxy is not implemented in local MVP.' });
  });

  return router;
}
