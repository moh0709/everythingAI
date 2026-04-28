import { apiRequest, ApiOptions } from './api';

export type SourcePathRecord = {
  id: string;
  path: string;
  status: string;
  watching: boolean;
  lastRun?: string;
  error?: string | null;
};

export async function listSourcePaths(options: ApiOptions) {
  return apiRequest<{ sources: SourcePathRecord[] }>(options, '/api/source-paths');
}

export async function addSourcePath(options: ApiOptions, folderPath: string, watch = true) {
  return apiRequest<{ source: SourcePathRecord; sources: SourcePathRecord[] }>(
    options,
    '/api/source-paths',
    { folderPath, watch },
    'POST',
  );
}

export async function pauseSourcePath(options: ApiOptions, folderPath: string) {
  return apiRequest<{ sources: SourcePathRecord[] }>(
    options,
    '/api/source-paths/pause',
    { folderPath },
    'POST',
  );
}

export async function resumeSourcePath(options: ApiOptions, folderPath: string) {
  return apiRequest<{ sources: SourcePathRecord[] }>(
    options,
    '/api/source-paths/resume',
    { folderPath },
    'POST',
  );
}
