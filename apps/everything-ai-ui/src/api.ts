import { showUserToast } from './user/toastBus';

export type ApiOptions = { baseUrl: string; token: string };

type ApiToast = {
  title: string;
  message?: string;
};

function apiSuccessToast(path: string, method: string, payload: any): ApiToast | null {
  const normalizedMethod = method.toUpperCase();

  if (/^\/api\/files\/[^/]+\/reveal/.test(path)) {
    return {
      title: 'Source location opened',
      message: payload?.file?.filename || 'The source file was revealed.',
    };
  }

  if (path.startsWith('/api/wiki/build')) {
    return {
      title: 'Wiki built',
      message: `${payload?.wiki?.page_count ?? 0} source-backed wiki page(s) generated.`,
    };
  }

  if (path.startsWith('/api/wiki')) {
    return {
      title: 'Wiki loaded',
      message: `${payload?.wiki?.page_count ?? 0} wiki page(s) ready.`,
    };
  }

  if (path.startsWith('/api/select-folder')) {
    if (payload?.cancelled) return { title: 'Folder selection cancelled' };
    return {
      title: 'Folder selected',
      message: payload?.folderPath || 'Local folder is ready.',
    };
  }

  if (path.startsWith('/api/index')) {
    return {
      title: 'Files indexed',
      message: `${payload?.indexed ?? payload?.count ?? 'Local'} file index updated.`,
    };
  }

  if (path.startsWith('/api/extract')) {
    return {
      title: 'Content extracted',
      message: `${payload?.extracted ?? payload?.processed ?? 'Document'} extraction completed.`,
    };
  }

  if (path.startsWith('/api/insights')) {
    return {
      title: 'Insights generated',
      message: `${payload?.generated ?? payload?.insights?.length ?? 0} insight(s) available.`,
    };
  }

  if (path.startsWith('/api/chat')) {
    return {
      title: 'Answer ready',
      message: `${payload?.sources?.length ?? 0} source reference(s) used.`,
    };
  }

  if (path.startsWith('/api/unified-search')) {
    return {
      title: 'Search complete',
      message: `${payload?.files?.length ?? 0} file match(es) found.`,
    };
  }

  if (path.startsWith('/api/files') && normalizedMethod === 'GET') {
    return {
      title: 'Files loaded',
      message: `${payload?.files?.length ?? 0} indexed file(s) visible.`,
    };
  }

  if (path.startsWith('/api/intelligence/document-context/')) {
    return {
      title: 'Source context loaded',
      message: payload?.document?.file?.filename || 'Document context is ready.',
    };
  }

  if (path.startsWith('/api/knowledge/build')) {
    return {
      title: 'Knowledge base built',
      message: `${payload?.knowledge?.classification_count ?? 0} classification group(s) available.`,
    };
  }

  if (path.startsWith('/api/knowledge')) {
    return {
      title: 'Knowledge loaded',
      message: `${payload?.classification_count ?? 0} classification group(s) available.`,
    };
  }

  if (normalizedMethod !== 'GET') {
    return {
      title: 'Action completed',
      message: path.replace('/api/', '').replace(/-/g, ' '),
    };
  }

  return null;
}

export async function apiRequest<T>(options: ApiOptions, path: string, body?: unknown, method = 'GET'): Promise<T> {
  let payload: any = {};

  try {
    const response = await fetch(`${options.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload.message || payload.error || `Request failed: ${response.status}`;
      showUserToast({
        tone: 'error',
        title: 'Action failed',
        message,
      });
      throw new Error(message);
    }

    const toast = apiSuccessToast(path, method, payload);
    if (toast) {
      showUserToast({
        tone: 'success',
        title: toast.title,
        message: toast.message,
      });
    }

    return payload as T;
  } catch (error: any) {
    if (error instanceof Error && !String(error.message || '').startsWith('Request failed')) {
      showUserToast({
        tone: 'error',
        title: 'Connection problem',
        message: error.message || String(error),
      });
    }
    throw error;
  }
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
  current_value?: string | null;
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
