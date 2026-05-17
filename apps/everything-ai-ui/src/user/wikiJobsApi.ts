import { apiRequest, type ApiOptions } from '../api';

export type WikiJob = {
  id: string;
  job_type: string;
  status: string;
  stage: string;
  progress_percent: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string;
};

export async function startWikiRebuildJob(options: ApiOptions, payload = {}) {
  return apiRequest<{ accepted: boolean; job: WikiJob }>(
    options,
    '/api/wiki/jobs/rebuild',
    payload,
    'POST'
  );
}

export async function clearWikiRebuildJobs(options: ApiOptions) {
  return apiRequest<{ deleted: number; jobs: WikiJob[] }>(
    options,
    '/api/wiki/jobs/clear',
    {},
    'POST'
  );
}

export async function fetchWikiJobs(options: ApiOptions) {
  return apiRequest<{ jobs: WikiJob[] }>(options, '/api/wiki/jobs');
}

export async function fetchWikiJob(options: ApiOptions, jobId: string) {
  return apiRequest<{ job: WikiJob }>(options, `/api/wiki/jobs/${jobId}`);
}
