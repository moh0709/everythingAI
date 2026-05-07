import crypto from 'node:crypto';
import { JOB_STATUSES, JOB_PRIORITIES } from './jobTypes.js';

const jobs = new Map();

function now() {
  return new Date().toISOString();
}

function defaultProgress() {
  return {
    percent: 0,
    currentStep: null,
    totalItems: null,
    completedItems: null,
    failedItems: null,
    skippedItems: null,
    message: null,
  };
}

function cloneJob(job) {
  return structuredClone(job);
}

export function createJob({
  type,
  priority = JOB_PRIORITIES.NORMAL,
  input = {},
} = {}) {
  const id = crypto.randomUUID();

  const job = {
    id,
    type,
    status: JOB_STATUSES.CREATED,
    priority,
    progress: defaultProgress(),
    input,
    output: null,
    errorMessage: null,
    createdAt: now(),
    startedAt: null,
    completedAt: null,
  };

  jobs.set(id, job);

  return cloneJob(job);
}

export function startJob(jobId, progress = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.status = JOB_STATUSES.RUNNING;
  job.startedAt = now();
  job.progress = {
    ...job.progress,
    percent: 10,
    ...progress,
  };

  return cloneJob(job);
}

export function updateJobProgress(jobId, progress = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.progress = {
    ...job.progress,
    ...progress,
  };

  return cloneJob(job);
}

export function completeJob(jobId, output = null, progress = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.status = JOB_STATUSES.COMPLETED;
  job.output = output;
  job.completedAt = now();
  job.progress = {
    ...job.progress,
    percent: 100,
    ...progress,
  };

  return cloneJob(job);
}

export function failJob(jobId, error, progress = {}) {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.status = JOB_STATUSES.FAILED;
  job.completedAt = now();
  job.errorMessage = error?.message || String(error);
  job.progress = {
    ...job.progress,
    ...progress,
  };

  return cloneJob(job);
}

export function getJob(jobId) {
  const job = jobs.get(jobId);
  return job ? cloneJob(job) : null;
}

export function listJobs({ limit = 100 } = {}) {
  return Array.from(jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(cloneJob);
}

export function clearJobs() {
  jobs.clear();
}
