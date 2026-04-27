import { Router } from 'express';
import { openDatabase, getSystemStatus } from '../db/client.js';
import { getProviderSettings, updateProviderSettings } from '../settings/providerSettings.js';

export function createSystemRouter() {
  const router = Router();

  router.get('/status', (_req, res) => {
    const db = openDatabase();
    const status = getSystemStatus(db);
    const providerSettings = getProviderSettings();
    db.close();

    res.json({
      status,
      provider: {
        chat: providerSettings.provider,
        model: providerSettings.ollama.model || null,
        configured: Boolean(providerSettings.ollama.model),
      },
    });
  });

  router.get('/provider-settings', (_req, res) => {
    res.json({ settings: getProviderSettings() });
  });

  router.put('/provider-settings', (req, res) => {
    res.json({ settings: updateProviderSettings(req.body) });
  });

  return router;
}
