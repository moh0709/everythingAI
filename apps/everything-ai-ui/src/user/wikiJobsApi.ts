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

export type WikiQualitySummary = {
  page_id: string;
  slug: string;
  title: string;
  page_type: string;
  status: string;
  quality_score: number;
  quality_grade: string;
  source_count: number;
  chunk_count: number;
  dependency_count: number;
  citation_coverage_score: number;
  weak_source_warning: boolean;
  validation_state: {
    source_validation: string;
    runtime_validation: string;
    ai_validation: string;
    human_validation: string;
  };
  reasons: string[];
};

export type WikiWorkspaceTrustHealth = {
  status: string;
  quality_score: number;
  quality_grade: string;
  page_count: number;
  grade_counts: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  reasons: string[];
};

export type WikiHumanValidationStatus = 'unreviewed' | 'reviewed' | 'approved' | 'needs_attention' | 'rejected';
export type WikiHumanValidationWriteStatus = Exclude<WikiHumanValidationStatus, 'unreviewed'>;

export type WikiHumanValidation = {
  id: string | null;
  page_id: string;
  status: WikiHumanValidationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WikiHumanValidationUpdate = {
  status: WikiHumanValidationWriteStatus;
  reviewed_by: string;
  notes?: string;
};

export type WikiDiagnostics = {
  generated_at: string;
  page_stats: {
    total_pages: number;
    active_pages: number;
    stale_pages: number;
    failed_pages: number;
    archived_pages: number;
  };
  evidence_stats: {
    section_count: number;
    source_count: number;
    chunk_count: number;
    relation_count: number;
  };
  workspace_trust_health?: WikiWorkspaceTrustHealth;
  quality_summary?: WikiQualitySummary[];
  build_state: Array<{
    key: string;
    value: string;
    updated_at: string;
  }>;
  fingerprints: Array<{
    file_id: string;
    absolute_path?: string | null;
    content_hash?: string | null;
    content_length?: number | null;
    extracted_at?: string | null;
    updated_at: string;
  }>;
  dependencies: Array<{
    id: string;
    page_id: string;
    file_id: string;
    source_ref?: string | null;
    updated_at: string;
  }>;
  rebuilds: Array<{
    id: string;
    mode: string;
    status: string;
    input?: Record<string, unknown>;
    summary?: Record<string, unknown>;
    started_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    error_message?: string | null;
  }>;
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

export async function fetchWikiDiagnostics(options: ApiOptions) {
  return apiRequest<{ diagnostics: WikiDiagnostics }>(options, '/api/wiki/diagnostics');
}

export async function fetchWikiHumanValidation(options: ApiOptions, pageId: string) {
  return apiRequest<{ validation: WikiHumanValidation }>(
    options,
    `/api/wiki/pages/${encodeURIComponent(pageId)}/human-validation`
  );
}

export async function updateWikiHumanValidation(
  options: ApiOptions,
  pageId: string,
  payload: WikiHumanValidationUpdate
) {
  return apiRequest<{ validation: WikiHumanValidation }>(
    options,
    `/api/wiki/pages/${encodeURIComponent(pageId)}/human-validation`,
    payload,
    'POST'
  );
}
