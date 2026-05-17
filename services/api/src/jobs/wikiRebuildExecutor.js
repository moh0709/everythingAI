import crypto from 'node:crypto';
import { openDatabase } from '../db/client.js';
import {
  createWikiJob,
  updateWikiJob,
  getWikiJob,
} from './wikiJobRepository.js';

const runningJobs = new Map();

function createJobId() {
  return `wiki-job-${crypto.randomUUID()}`;
}

async function runJobStages(jobId, worker) {
  try {
    runningJobs.set(jobId, true);

    await worker({
      update(stage, progress, metadata = {}) {
        const db = openDatabase();

        updateWikiJob(db, jobId, {
          status: 'running',
          stage,
          progress_percent: progress,
          metadata,
          started_at: new Date().toISOString(),
        });

        db.close();
      },
    });

    const db = openDatabase();

    updateWikiJob(db, jobId, {
      status: 'completed',
      progress_percent: 100,
      stage: 'completed',
      completed_at: new Date().toISOString(),
    });

    db.close();
  } catch (error) {
    const db = openDatabase();

    updateWikiJob(db, jobId, {
      status: 'failed',
      stage: 'failed',
      metadata: {
        error: error?.message || 'Unknown rebuild error',
      },
      completed_at: new Date().toISOString(),
    });

    db.close();
  } finally {
    runningJobs.delete(jobId);
  }
}

export function createAsyncWikiJob(jobType = 'wiki-rebuild') {
  const db = openDatabase();

  const job = createWikiJob(db, {
    id: createJobId(),
    job_type: jobType,
    status: 'queued',
    progress_percent: 0,
    stage: 'queued',
  });

  db.close();

  return job;
}

export function executeAsyncWikiJob(job, worker) {
  setTimeout(() => {
    runJobStages(job.id, worker);
  }, 0);

  return job;
}

export function getAsyncWikiJob(jobId) {
  const db = openDatabase();
  const job = getWikiJob(db, jobId);
  db.close();

  return job;
}

export function isWikiJobRunning(jobId) {
  return runningJobs.has(jobId);
}
