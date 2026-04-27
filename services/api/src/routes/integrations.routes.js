import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { syncExtractedFilesToAnythingLlm } from '../integrations/anythingllm/anythingLlmClient.js';
import { parseLimit } from '../utils/request.js';

export function createIntegrationsRouter() {
  const router = Router();

  router.post('/integrations/anythingllm/sync', async (req, res, next) => {
    try {
      const db = openDatabase();
      const result = await syncExtractedFilesToAnythingLlm(db, {
        fileId: req.body?.fileId,
        limit: parseLimit(req.body?.limit, 25),
      });
      db.close();

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
