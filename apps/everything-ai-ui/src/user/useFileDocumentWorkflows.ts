import type { Dispatch, SetStateAction } from 'react';
import { apiRequest } from '../api';
import type { ApiOptions, IndexedFile } from '../api';
import type { DocumentContext, UserView } from './types';

type ActionRunner = (label: string, task: () => Promise<void>) => Promise<void>;

type UseFileDocumentWorkflowsArgs = {
  options: ApiOptions;
  query: string;
  selectedFileId?: string | null;
  run: ActionRunner;
  loadFiles: (files: IndexedFile[]) => void;
  selectFile: (fileId: string) => void;
  setDocumentContext: Dispatch<SetStateAction<DocumentContext | null>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setView: Dispatch<SetStateAction<UserView>>;
};

export function useFileDocumentWorkflows({
  options,
  query,
  run,
  loadFiles,
  selectFile,
  setDocumentContext,
  setStatus,
  setView,
}: UseFileDocumentWorkflowsArgs) {
  async function refreshFiles() {
    await run('Loading indexed files...', async () => {
      const payload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      loadFiles(payload.files || []);
      if (payload.files?.length) setView((current) => current === 'onboarding' ? 'explore' : current);
      setStatus(`Loaded ${payload.files?.length || 0} file(s).`);
    });
  }

  async function searchEverything() {
    await run('Searching EverythingAI...', async () => {
      const normalized = query.trim();
      if (!normalized) {
        await refreshFiles();
        return;
      }
      const payload = await apiRequest<{ files: IndexedFile[] }>(options, `/api/unified-search?q=${encodeURIComponent(normalized)}&limit=50`);
      loadFiles(payload.files || []);
      if (payload.files?.[0]) await loadDocumentContext(payload.files[0].id, false);
      setStatus(`Search complete: ${payload.files?.length || 0} file match(es).`);
    });
  }

  async function loadDocumentContext(fileId: string, wrap = true) {
    const task = async () => {
      const payload = await apiRequest<{ document: DocumentContext }>(options, `/api/intelligence/document-context/${fileId}`);
      selectFile(fileId);
      setDocumentContext(payload.document);
      setStatus(`Context loaded: ${payload.document.file?.filename || fileId}`);
    };

    if (wrap) await run('Loading document context...', task);
    else await task();
  }

  async function revealSourceFile(fileId: string, absolutePath?: string) {
    await run('Opening source file location...', async () => {
      await apiRequest(options, `/api/files/${fileId}/reveal`, { absolutePath }, 'POST');
      setStatus('Source file location opened.');
    });
  }

  return {
    refreshFiles,
    searchEverything,
    loadDocumentContext,
    revealSourceFile,
  };
}
