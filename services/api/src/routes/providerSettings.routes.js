import { Router } from 'express';
import { openDatabase, getAppSetting, setAppSetting } from '../db/client.js';
import { getDefaultAiProviderSettings, listDefaultModels, mergeAiProviderSettings } from '../settings/aiProviderSettings.js';
import { fetchProviderModels } from '../settings/providerModelFetchers.js';

const SETTINGS_KEY = 'ai_provider_settings';
const REMOTE_PROVIDERS = ['openrouter', 'cerebras', 'mistral', 'google'];
const ALL_PROVIDERS = ['ollama', 'openrouter', 'cerebras', 'mistral', 'google'];

function publicSettings(settings) {
  const copy = JSON.parse(JSON.stringify(settings));
  for (const provider of REMOTE_PROVIDERS) {
    if (copy[provider]?.apiKey) copy[provider].apiKey = '__saved__';
  }
  return copy;
}

function preserveSavedKeys(existing, incoming) {
  const next = mergeAiProviderSettings(incoming);
  for (const provider of REMOTE_PROVIDERS) {
    if (next[provider]?.apiKey === '__saved__') next[provider].apiKey = existing[provider]?.apiKey || '';
  }
  return next;
}

function loadSettings() {
  const db = openDatabase();
  const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
  db.close();
  return settings;
}

async function modelsFor(provider, settings, defaults) {
  const liveModels = await fetchProviderModels(provider, settings);
  return {
    models: liveModels?.length ? liveModels : defaults[provider],
    live: Boolean(liveModels?.length),
  };
}

export function createProviderSettingsRouter() {
  const router = Router();

  router.get('/provider-settings', (_req, res) => {
    const settings = loadSettings();
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
    const settings = loadSettings();
    const defaults = listDefaultModels();
    const entries = await Promise.all(ALL_PROVIDERS.map(async (provider) => {
      const result = await modelsFor(provider, settings, defaults);
      return [provider, result.models];
    }));
    res.json({ models: Object.fromEntries(entries), remoteProvidersEnabled: settings.remoteProvidersEnabled });
  });

  router.get('/provider-settings/models/:provider', async (req, res) => {
    const provider = req.params.provider;
    const defaults = listDefaultModels();
    if (!defaults[provider]) return res.status(404).json({ error: 'Unknown provider' });
    const settings = loadSettings();
    const result = await modelsFor(provider, settings, defaults);
    res.json({ provider, models: result.models, live: result.live });
  });

  router.post('/provider-settings/test', async (req, res) => {
    const settings = loadSettings();
    const defaults = listDefaultModels();
    const provider = req.body?.provider || settings.activeProvider;
    if (!defaults[provider]) return res.status(404).json({ provider, connected: false, message: 'Unknown provider.' });
    if (provider !== 'ollama' && !settings.remoteProvidersEnabled) return res.json({ provider, connected: false, message: 'Remote providers are disabled by policy.' });
    const result = await modelsFor(provider, settings, defaults);
    res.json({
      provider,
      connected: result.live,
      modelCount: result.models.length,
      message: result.live ? `${provider} connection successful. ${result.models.length} model(s) available.` : `${provider} is not reachable or credentials are missing. Showing fallback models.`,
    });
  });

  return router;
}
