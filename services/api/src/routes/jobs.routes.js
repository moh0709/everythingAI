import { Router } from 'express';
import { getJob, listJobs } from '../jobs/jobService.js';
import { parseLimit } from '../utils/request.js';

export function createJobsRouter() {
  const router = Router();

  router.get('/jobs', (req, res) => {
    const jobs = listJobs({
      limit: parseLimit(req.query.limit, 100),
    });

    res.json({ jobs });
  });

  router.get('/jobs/:jobId', (req, res) => {
    const job = getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'job not found' });
    }

    return res.json({ job });
  });

  return router;
}
