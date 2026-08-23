import { Brain, FolderTree, Sparkles } from 'lucide-react';
import type { IndexedFile, Suggestion } from '../../api';
import { averageConfidence } from '../utils/format';

export type PreviewRecord = {
  id: string;
  suggestion_id?: string;
  file_id?: string;
  action_type: string;
  source_path?: string;
  target_path?: string;
  suggested_value: string;
  preview_status: string;
  blocked_reason?: string;
};

type PlanningViewProps = {
  files: IndexedFile[];
  suggestions: Suggestion[];
  previews: PreviewRecord[];
  selectedSuggestionIds: Set<string>;
  setSelectedSuggestionIds: (ids: Set<string>) => void;
  createPreview: (suggestion: Suggestion) => void;
  previewSelected: () => void;
  executePreview: (preview: PreviewRecord) => void;
  executeSelectedPreviews: () => void;
  deepAnalysis: () => void;
  busy: boolean;
  openSettings: () => void;
  destinationFolder: string;
  setDestinationFolder: (value: string) => void;
};

type SuggestionGroup = {
  key: string;
  title: string;
  description: string;
  suggestions: Suggestion[];
};

const FILESYSTEM_ACTIONS = new Set(['move', 'rename']);

function isFilesystemAction(suggestion: Pick<Suggestion, 'action_type'>) {
  return FILESYSTEM_ACTIONS.has(suggestion.action_type);
}

function isSameFileMutation(a: Suggestion, b: Suggestion) {
  return a.file_id === b.file_id && isFilesystemAction(a) && isFilesystemAction(b);
}

function parentPath(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '');
  const separator = normalized.lastIndexOf('/');
  if (separator <= 0) return null;
  return normalized.slice(0, separator);
}

function groupDescriptor(suggestion: Suggestion, sourceFile?: IndexedFile): Omit<SuggestionGroup, 'suggestions'> {
  const actionType = suggestion.action_type.toLowerCase();

  if (actionType === 'move') {
    return {
      key: `move:${suggestion.suggested_value}`,
      title: `Move to ${suggestion.suggested_value}`,
      description: 'Proposed destination from the suggestion. Final filesystem target is still validated by dry-run preview.',
    };
  }

  if (actionType === 'rename') {
    const folder = parentPath(sourceFile?.absolute_path || suggestion.current_value);
    return {
      key: `rename:${folder || 'in-place'}`,
      title: folder ? `Rename in ${folder}` : 'Rename in current folder',
      description: 'Rename suggestions grouped by their genuine source folder. No file is changed until preview and approval.',
    };
  }

  return {
    key: `${actionType}:metadata`,
    title: `${actionType.charAt(0).toUpperCase()}${actionType.slice(1)} suggestions`,
    description: 'Related non-filesystem suggestions grouped by action type.',
  };
}

function buildSuggestionGroups(suggestions: Suggestion[], filesById: Map<string, IndexedFile>) {
  const groups = new Map<string, SuggestionGroup>();

  for (const suggestion of suggestions.slice(0, 60)) {
    const descriptor = groupDescriptor(suggestion, filesById.get(suggestion.file_id));
    const current = groups.get(descriptor.key);
    if (current) {
      current.suggestions.push(suggestion);
    } else {
      groups.set(descriptor.key, { ...descriptor, suggestions: [suggestion] });
    }
  }

  return Array.from(groups.values());
}

function safeSelectionForSuggestions(candidates: Suggestion[], allSuggestions: Suggestion[], seed: Set<string>) {
  const next = new Set(seed);
  const selectedMutationFiles = new Set(
    allSuggestions
      .filter((suggestion) => next.has(suggestion.id) && isFilesystemAction(suggestion))
      .map((suggestion) => suggestion.file_id),
  );

  for (const suggestion of candidates) {
    if (!isFilesystemAction(suggestion)) {
      next.add(suggestion.id);
      continue;
    }

    if (!selectedMutationFiles.has(suggestion.file_id)) {
      next.add(suggestion.id);
      selectedMutationFiles.add(suggestion.file_id);
    }
  }

  return next;
}

export function PlanningView({
  files,
  suggestions,
  previews,
  selectedSuggestionIds,
  setSelectedSuggestionIds,
  createPreview,
  previewSelected,
  executePreview,
  executeSelectedPreviews,
  deepAnalysis,
  busy,
  openSettings,
  destinationFolder,
  setDestinationFolder,
}: PlanningViewProps) {
  const selectedSuggestions = suggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.id));
  const selectedFilesystemKeys = new Set(
    selectedSuggestions
      .filter(isFilesystemAction)
      .map((suggestion) => suggestion.file_id),
  );
  const filesById = new Map(files.map((file) => [file.id, file]));
  const groups = buildSuggestionGroups(suggestions, filesById);

  function toggleSuggestion(id: string) {
    const suggestion = suggestions.find((item) => item.id === id);
    if (!suggestion) return;

    const next = new Set(selectedSuggestionIds);

    if (next.has(id)) {
      next.delete(id);
      setSelectedSuggestionIds(next);
      return;
    }

    if (isFilesystemAction(suggestion)) {
      suggestions
        .filter((candidate) => isSameFileMutation(candidate, suggestion))
        .forEach((candidate) => next.delete(candidate.id));
    }

    next.add(id);
    setSelectedSuggestionIds(next);
  }

  function selectAllSuggestions() {
    const visible = suggestions.slice(0, 60);
    const allSelected = visible.length > 0 && visible.every((suggestion) => selectedSuggestionIds.has(suggestion.id));
    const next = new Set(selectedSuggestionIds);

    if (allSelected) {
      visible.forEach((suggestion) => next.delete(suggestion.id));
    } else {
      setSelectedSuggestionIds(safeSelectionForSuggestions(visible, suggestions, next));
      return;
    }

    setSelectedSuggestionIds(next);
  }

  function selectGroup(group: SuggestionGroup) {
    const allSelected = group.suggestions.every((suggestion) => selectedSuggestionIds.has(suggestion.id));
    const next = new Set(selectedSuggestionIds);

    if (allSelected) {
      group.suggestions.forEach((suggestion) => next.delete(suggestion.id));
      setSelectedSuggestionIds(next);
      return;
    }

    setSelectedSuggestionIds(safeSelectionForSuggestions(group.suggestions, suggestions, next));
  }

  function clearSelection() {
    setSelectedSuggestionIds(new Set());
  }

  return <section>
    <div className="planning-head">
      <div>
        <h1><Brain /> AI Planning Center</h1>
        <p>Review proposed structure, select coherent groups, dry-run changes, and approve only validated actions.</p>
      </div>
      <div className="button-row">
        <button className="outline" onClick={openSettings}>AI Settings</button>
        <button className="purple" onClick={deepAnalysis} disabled={busy}><Sparkles size={16} /> AI Analyze</button>
        <button className="outline" onClick={previewSelected} disabled={!selectedSuggestionIds.size}>Dry Run Preview</button>
        <button onClick={executeSelectedPreviews}>Execute Plan</button>
      </div>
    </div>

    <div className="destination">
      <strong>Destination Folder / Planning Label</strong>
      <input
        value={destinationFolder}
        onChange={(event) => setDestinationFolder(event.target.value)}
        placeholder="e.g. Finance, Projects, Customer Docs"
      />
      <p className="muted">This input is planning context. Actual filesystem targets still come from backend-safe previews.</p>
    </div>

    <div className="planning-grid advanced">
      <div className="panel">
        <h3>AI Plan Summary</h3>
        <p>Files analyzed: <b>{files.length}</b></p>
        <p>Actions suggested: <b>{suggestions.length}</b></p>
        <p>Folder/action groups: <b>{groups.length}</b></p>
        <p>Average confidence: <b>{averageConfidence(suggestions)}</b></p>
        <p>Selected actions: <b>{selectedSuggestionIds.size}</b></p>
        <p>Dry-run previews: <b>{previews.length}</b></p>
        <p>Executable previews: <b>{previews.filter((preview) => preview.preview_status === 'ready').length}</b></p>
        <p className="muted">Safety: group selection changes checkboxes only. It cannot execute or bypass backend policy. Only one move/rename action can be selected per file.</p>
      </div>

      <div className="panel wide planning-groups-panel">
        <div className="planning-section-header">
          <div>
            <h3><FolderTree size={18} /> Proposed Structure</h3>
            <p className="muted">Grouped from genuine suggestion targets, action types, and source folders.</p>
          </div>
          <div className="planning-bulk-actions">
            <button className="outline" onClick={selectAllSuggestions} disabled={!suggestions.length}>
              {suggestions.slice(0, 60).length > 0 && suggestions.slice(0, 60).every((suggestion) => selectedSuggestionIds.has(suggestion.id)) ? 'Deselect All' : 'Select Safe Batch'}
            </button>
            <button className="outline" onClick={clearSelection} disabled={!selectedSuggestionIds.size}>Clear Selection</button>
          </div>
        </div>

        {!groups.length && <p className="muted">Run AI Analyze to generate grouped planning suggestions.</p>}

        <div className="planning-group-list" data-testid="planning-group-list">
          {groups.map((group) => {
            const selectedCount = group.suggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.id)).length;
            const allSelected = group.suggestions.length > 0 && selectedCount === group.suggestions.length;
            return <section className="planning-group" key={group.key} data-testid="planning-group" data-group-key={group.key}>
              <div className="planning-group-header">
                <div>
                  <strong>{group.title}</strong>
                  <p>{group.description}</p>
                  <span>{selectedCount}/{group.suggestions.length} selected</span>
                </div>
                <button className="outline" onClick={() => selectGroup(group)}>
                  {allSelected ? 'Clear Group' : 'Select Group'}
                </button>
              </div>

              <div className="planning-group-items">
                {group.suggestions.map((suggestion) => {
                  const isSelected = selectedSuggestionIds.has(suggestion.id);
                  const disabledByMutationGuard = !isSelected && isFilesystemAction(suggestion) && selectedFilesystemKeys.has(suggestion.file_id);
                  const sourceFile = filesById.get(suggestion.file_id);
                  return <div
                    className="suggestion-line selectable"
                    key={suggestion.id}
                    data-testid={`suggestion-${suggestion.id}`}
                    data-file-id={suggestion.file_id}
                    data-action-type={suggestion.action_type}
                  >
                    <label title={disabledByMutationGuard ? 'Another move/rename action is already selected for this file.' : undefined}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disabledByMutationGuard}
                        onChange={() => toggleSuggestion(suggestion.id)}
                      />
                      <span>
                        <b>{suggestion.action_type}</b> → {suggestion.suggested_value}
                        {sourceFile?.filename && <small className="muted" style={{ display: 'block' }}>Source: {sourceFile.filename}</small>}
                      </span>
                    </label>
                    <span className="chip blue">{Math.round(Number(suggestion.confidence || 0) * 100)}%</span>
                    {disabledByMutationGuard && <span className="chip orange">file mutation already selected</span>}
                    <button onClick={() => createPreview(suggestion)}>Preview</button>
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
      </div>

      <div className="panel wide">
        <h3>Dry Run / Execution Queue</h3>
        {!previews.length && <p className="muted">Run Dry Run Preview to validate selected actions before execution.</p>}
        {previews.map((preview) => <div
          className="suggestion-line"
          key={preview.id}
          data-testid={`preview-${preview.id}`}
          data-preview-status={preview.preview_status}
        >
          <div>
            <b>{preview.action_type}</b>
            {preview.source_path && <p className="muted">Source: {preview.source_path}</p>}
            <p className="muted">Target: {preview.target_path || preview.suggested_value}</p>
            <p className="muted">
              {preview.preview_status === 'ready' ? 'Ready to execute' : `Blocked: ${preview.blocked_reason}`}
            </p>
          </div>
          <span className={preview.preview_status === 'ready' ? 'chip green' : 'chip orange'}>{preview.preview_status}</span>
          <button disabled={preview.preview_status !== 'ready'} onClick={() => executePreview(preview)}>Execute</button>
        </div>)}
      </div>
    </div>
  </section>;
}

export default PlanningView;
