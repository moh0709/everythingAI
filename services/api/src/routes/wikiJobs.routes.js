import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { listWikiJobs } from '../jobs/wikiJobRepository.js';
import {
  createAsyncWikiJob,
  executeAsyncWikiJob,
  getAsyncWikiJob,
} from '../jobs/wikiRebuildExecutor.js';
import { runOperationalWikiRebuild } from '../jobs/wikiOperationalRebuildWorker.js';
import { parseLimit } from '../utils/request.js';

export function createWikiJobsRouter() {
  const router = Router();

  router.get('/wiki/jobs', (_req, res) => {
    const db = openDatabase();

    const jobs = listWikiJobs(db, 50);

    db.close();

    res.json({ jobs });
  });

  router.get('/wiki/jobs/:jobId', (req, res) => {
    const job = getAsyncWikiJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Wiki rebuild job not found.',
      });
    }

    return res.json({ job });
  });

  router.post('/wiki/jobs/rebuild', (req, res) => {
    const job = createAsyncWikiJob('wiki-rebuild');
    const limit = parseLimit(req.body?.limit, 500);
    const filePageLimit = parseLimit(req.body?.filePageLimit, 50);

    executeAsyncWikiJob(job, async ({ update }) => {
      const result = await runOperationalWikiRebuild({
        update,
        limit,
        filePageLimit,
      });

      update('completed', 100, {
        changed_file_count: result.incremental_plan?.changed_file_count || 0,
        affected_page_count: result.replacement_plan?.affected_page_count || 0,
        strategy: result.replacement_plan?.strategy || 'unknown',
        page_count: result.wiki?.page_count || 0,
      });
    });

    return res.status(202).json({
      accepted: true,
      job,
    });
  });

  return router;
}
