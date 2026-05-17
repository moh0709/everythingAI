import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { listWikiJobs } from '../jobs/wikiJobRepository.js';
import {
  createAsyncWikiJob,
  executeAsyncWikiJob,
  getAsyncWikiJob,
} from '../jobs/wikiRebuildExecutor.js';

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

  router.post('/wiki/jobs/rebuild', (_req, res) => {
    const job = createAsyncWikiJob('wiki-rebuild');

    executeAsyncWikiJob(job, async ({ update }) => {
      update('planning', 10, {
        message: 'Preparing rebuild plan',
      });

      await new Promise((resolve) => setTimeout(resolve, 250));

      update('fingerprinting', 30, {
        message: 'Scanning knowledge fingerprints',
      });

      await new Promise((resolve) => setTimeout(resolve, 250));

      update('dependency-analysis', 55, {
        message: 'Calculating affected pages',
      });

      await new Promise((resolve) => setTimeout(resolve, 250));

      update('selective-rebuild', 80, {
        message: 'Executing selective rebuild plan',
      });

      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    return res.status(202).json({
      accepted: true,
      job,
    });
  });

  return router;
}
