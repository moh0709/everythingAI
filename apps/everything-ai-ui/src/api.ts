export type ApiOptions = { baseUrl: string; token: string };

export async function apiRequest<T>(options: ApiOptions, path: string, body?: unknown, method = 'GET'): Promise<T> {
  const response = await fetch(`${options.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Request failed: ${response.status}`);
  return payload as T;
}

export type IndexedFile = {
  id: string;
  filename: string;
  absolute_path: string;
  extension?: string;
  size_bytes?: number;
  modified_at?: string;
  index_status?: string;
  extraction_status?: string;
};

export type Suggestion = {
  id: string;
  file_id: string;
  filename?: string;
  action_type: string;
  suggested_value: string;
  reason: string;
  confidence: number;
  risk_level: string;
};

export type AppStatus = {
  total_files: number;
  indexed_files: number;
  extracted_files: number;
  embedded_files: number;
  insight_files: number;
  suggestions: number;
  executions: number;
  active_watch_roots: number;
};
