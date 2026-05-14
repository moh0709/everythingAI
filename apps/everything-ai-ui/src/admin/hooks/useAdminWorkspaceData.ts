import { useMemo, useState } from 'react';
import { apiRequest, type ApiOptions, type AppStatus, type IndexedFile, type Suggestion } from '../../api';

export type AdminFilePreview = {
  file?: IndexedFile & { extracted_text?: string };
  insight?: { summary?: string; classification?: string } | null;
  previewText?: string;
  extracted_text?: string;
};

export function useAdminWorkspaceData() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<AdminFilePreview | null>(null);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterExtension, setFilterExtension] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const selectedFile = files.find((file) => file.id === selectedFileId) || files[0];
  const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || 0), 0);
  const fileTypes = files.reduce<Record<string, number>>((acc, file) => {
    const ext = file.extension || 'file';
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});

  const extensionOptions = useMemo(
    () => Array.from(new Set(files.map((file) => file.extension || 'file'))).sort(),
    [files],
  );

  const filteredFiles = useMemo(() => files.filter((file) => {
    const extension = file.extension || 'file';
    const extOk = filterExtension === 'all' || extension === filterExtension;
    const statusOk = filterStatus === 'all' || file.index_status === filterStatus || file.extraction_status === filterStatus;
    return extOk && statusOk;
  }), [files, filterExtension, filterStatus]);

  async function refreshStatus(options: ApiOptions) {
    const payload = await apiRequest<{ status: AppStatus }>(options, '/api/status');
    setStatus(payload.status);
    return payload.status;
  }

  async function refreshFiles(options: ApiOptions, limit = 250) {
    const payload = await apiRequest<{ files: IndexedFile[] }>(options, `/api/files?limit=${limit}`);
    setFiles(payload.files || []);
    if (!selectedFileId && payload.files?.[0]) setSelectedFileId(payload.files[0].id);
    return payload.files || [];
  }

  async function refreshSuggestions(options: ApiOptions, limit = 250) {
    const payload = await apiRequest<{ suggestions: Suggestion[] }>(options, `/api/suggestions?limit=${limit}`);
    setSuggestions(payload.suggestions || []);
    return payload.suggestions || [];
  }

  async function loadFilePreview(options: ApiOptions, fileId: string) {
    setSelectedFileId(fileId);
    setFilePreview(null);
    const preview = await apiRequest<AdminFilePreview>(options, `/api/files/${fileId}/preview`);
    setFilePreview(preview);
    return preview;
  }

  async function searchEverything(options: ApiOptions, searchQuery = query, limit = 50) {
    const normalized = searchQuery.trim();
    if (!normalized) return { files, suggestions };

    const payload = await apiRequest<any>(options, `/api/unified-search?q=${encodeURIComponent(normalized)}&limit=${limit}`);
    setFiles(payload.files || []);
    setSuggestions(payload.suggestions || []);
    return payload;
  }

  return {
    status,
    setStatus,
    files,
    setFiles,
    suggestions,
    setSuggestions,
    selectedFileId,
    setSelectedFileId,
    selectedFile,
    filePreview,
    setFilePreview,
    query,
    setQuery,
    showFilters,
    setShowFilters,
    filterExtension,
    setFilterExtension,
    filterStatus,
    setFilterStatus,
    extensionOptions,
    filteredFiles,
    totalSize,
    fileTypes,
    refreshStatus,
    refreshFiles,
    refreshSuggestions,
    loadFilePreview,
    searchEverything,
  };
}

export default useAdminWorkspaceData;
