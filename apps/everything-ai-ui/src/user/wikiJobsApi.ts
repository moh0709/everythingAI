import { apiRequest } from '../api';

export async function startWikiRebuildJob(payload = {}) {
  return apiRequest('/wiki/jobs/rebuild', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchWikiJobs() {
  return apiRequest('/wiki/jobs');
}

export async function fetchWikiJob(jobId: string) {
  return apiRequest(`/wiki/jobs/${jobId}`);
}
