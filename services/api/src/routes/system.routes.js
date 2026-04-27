import { Router } from 'express';
import { openDatabase, getSystemStatus } from '../db/client.js';

export function createSystemRouter() {
  const router = Router();

  router.get('/status', (_req, res) => {
    const db = openDatabase();
    const status = getSystemStatus(db);
    db.close();

    res.json({
      status,
      provider: {
        chat: process.env.OLLAMA_MODEL ? 'ollama' : 'unconfigured',
        model: process.env.OLLAMA_MODEL || null,
      },
    });
  });

  return router;
}
