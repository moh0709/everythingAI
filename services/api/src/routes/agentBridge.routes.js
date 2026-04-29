import { Router } from 'express';
import { openDatabase, getAppSetting, setAppSetting } from '../db/client.js';
import { getDefaultAiProviderSettings, mergeAiProviderSettings } from '../settings/aiProviderSettings.js';
import {
  bridgeSecurityNotice,
  chatWithAgent,
  detectAgentIntegration,
  getBridgeStatus,
  runAgentProbe,
} from '../agents/localAgentBridge.js';
import { searchFiles } from '../search/searchService.js';
import { parseLimit } from '../utils/request.js';

const SETTINGS_KEY = 'ai_provider_settings';

function loadSettings() {
  const db = openDatabase();
  const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
  db.close();
  return settings;
}

function saveAgentSettings(agentIntegrations) {
  const db = openDatabase();
  const current = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
  const next = mergeAiProviderSettings({
    ...current,
    agentIntegrations: {
      ...(current.agentIntegrations || {}),
      ...(agentIntegrations || {}),
    },
  });
  setAppSetting(db, SETTINGS_KEY, next);
  db.close();
  return next.agentIntegrations;
}

function loadContext(query, limit) {
  if (!query || !query.toString().trim()) return [];
  const db = openDatabase();
  const results = searchFiles(db, { query, limit });
  db.close();
  return results;
}

export function createAgentBridgeRouter() {
  const router = Router();

  router.get('/agent-bridge/status', (_req, res) => {
    const settings = loadSettings();
    res.json({
      ...getBridgeStatus(settings.agentIntegrations),
      security: bridgeSecurityNotice(),
    });
  });

  router.get('/agent-bridge/security', (_req, res) => {
    res.json(bridgeSecurityNotice());
  });

  router.get('/agent-bridge/integrations', (_req, res) => {
    const settings = loadSettings();
    res.json({ integrations: settings.agentIntegrations || {} });
  });

  router.put('/agent-bridge/integrations', (req, res) => {
    const integrations = saveAgentSettings(req.body?.agentIntegrations || req.body || {});
    res.json({ integrations });
  });

  router.post('/agent-bridge/detect', async (req, res, next) => {
    try {
      const settings = loadSettings();
      const agentId = req.body?.agentId || req.body?.integration;
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const result = await detectAgentIntegration(agentId, settings);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/agent-bridge/detect-all', async (_req, res, next) => {
    try {
      const settings = loadSettings();
      const integrations = settings.agentIntegrations || {};
      const results = await Promise.all(Object.keys(integrations).map((agentId) => detectAgentIntegration(agentId, settings)));
      res.json({ results });
    } catch (error) {
      next(error);
    }
  });

  router.post('/agent-bridge/probe', async (req, res, next) => {
    try {
      const settings = loadSettings();
      const agentId = req.body?.agentId || req.body?.integration;
      const action = req.body?.action || 'version';
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      const result = await runAgentProbe(agentId, action, settings);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/agent-bridge/chat', async (req, res, next) => {
    try {
      const settings = loadSettings();
      const agentId = req.body?.agentId || req.body?.integration;
      const message = req.body?.message;
      if (!agentId) return res.status(400).json({ error: 'agentId is required' });
      if (!message || !message.toString().trim()) return res.status(400).json({ error: 'message is required' });

      const context = Array.isArray(req.body?.context)
        ? req.body.context
        : loadContext(req.body?.contextQuery || req.body?.q, parseLimit(req.body?.limit, 5));

      const result = await chatWithAgent(agentId, { message, context }, settings);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
