import { useState } from 'react';
import { apiRequest, type ApiOptions, type Suggestion } from '../../api';
import type { PreviewRecord } from '../components';

export function useAdminPlanning() {
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);

  async function createPreview(options: ApiOptions, suggestion: Suggestion, destinationFolder?: string) {
    const payload = await apiRequest<{ preview: PreviewRecord }>(
      options,
      '/api/action-previews',
      { suggestionId: suggestion.id, destinationFolder: destinationFolder || undefined },
      'POST',
    );

    setPreviews((current) => [
      payload.preview,
      ...current.filter((item) => item.suggestion_id !== suggestion.id),
    ]);

    return payload.preview;
  }

  async function previewSelected(options: ApiOptions, suggestions: Suggestion[], destinationFolder?: string) {
    const selected = suggestions.filter((item) => selectedSuggestionIds.has(item.id));
    const list = selected.length ? selected : suggestions.slice(0, 25);
    const created: PreviewRecord[] = [];

    for (const suggestion of list) {
      created.push(await createPreview(options, suggestion, destinationFolder));
    }

    return created;
  }

  async function executePreview(options: ApiOptions, preview: PreviewRecord) {
    if (preview.preview_status !== 'ready') {
      return { skipped: true, reason: preview.blocked_reason || 'not executable' };
    }

    const payload = await apiRequest<any>(
      options,
      '/api/action-executions',
      { previewId: preview.id, approve: true },
      'POST',
    );

    setPreviews((current) => current.filter((item) => item.id !== preview.id));
    return payload;
  }

  async function executeReadyPreviews(options: ApiOptions) {
    const ready = previews.filter((preview) => preview.preview_status === 'ready');
    const results = [];

    for (const preview of ready) {
      results.push(await executePreview(options, preview));
    }

    setPreviews([]);
    return results;
  }

  function clearPlanningSelection() {
    setSelectedSuggestionIds(new Set());
  }

  function clearPreviews() {
    setPreviews([]);
  }

  return {
    selectedSuggestionIds,
    setSelectedSuggestionIds,
    previews,
    setPreviews,
    createPreview,
    previewSelected,
    executePreview,
    executeReadyPreviews,
    clearPlanningSelection,
    clearPreviews,
  };
}

export default useAdminPlanning;
