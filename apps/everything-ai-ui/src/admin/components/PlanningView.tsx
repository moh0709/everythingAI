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
const MAX_VISIBLE_SUGGESTIONS = 60;

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

  for (const suggestion of suggestions.slice(0, MAX_VISIBLE_SUGGESTIONS)) {
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

function selectedMutationForFile(suggestion: Suggestion, selectedSuggestions: Suggestion[]) {
  if (!isFilesystemAction(suggestion)) return undefined;
  return selectedSuggestions.find((candidate) => (
    candidate.id !== suggestion.id && isSameFileMutation(candidate, suggestion)
  ));
}

function actionContext(suggestion: Suggestion) {
  return `${suggestion.action_type} → ${suggestion.suggested_value}`;
}

function previewTarget(preview: PreviewRecord) {
  return preview.target_path || preview.suggested_value || null;
}

function previewDecisionLabel(preview: PreviewRecord) {
  return preview.preview_status === 'ready' ? 'Ready for approval' : 'Blocked by backend validation';
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
  const visibleSuggestions = suggestions.slice(0, MAX_VISIBLE_SUGGESTIONS);
  const selectedSuggestions = suggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.id));
  const selectedVisibleSuggestions = visibleSuggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.id));
  const selectedFilesystemKeys = new Set(
    selectedSuggestions
      .filter(isFilesystemAction)
      .map((suggestion) => suggestion.file_id),
  );
  const mutationConflictCount = visibleSuggestions.filter((suggestion) => (
    !selectedSuggestionIds.has(suggestion.id)
    && isFilesystemAction(suggestion)
    && selectedFilesystemKeys.has(suggestion.file_id)
  )).length;
  const filesById = new Map(files.map((file) => [file.id, file]));
  const groups = buildSuggestionGroups(suggestions, filesById);
  const readyPreviewCount = previews.filter((preview) => preview.preview_status === 'ready').length;
  const blockedPreviewCount = previews.length - readyPreviewCount;

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
    const allSelected = visibleSuggestions.length > 0 && visibleSuggestions.every((suggestion) => selectedSuggestionIds.has(suggestion.id));
    const next = new Set(selectedSuggestionIds);

    if (allSelected) {
      visibleSuggestions.forEach((suggestion) => next.delete(suggestion.id));
    } else {
      setSelectedSuggestionIds(safeSelectionForSuggestions(visibleSuggestions, suggestions, next));
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
        <p>Executable previews: <b>{readyPreviewCount}</b></p>
        <p className="muted">Safety: group selection changes checkboxes only. It cannot execute or bypass backend policy. Only one move/rename action can be selected per file.</p>
      </div>

      <div className="panel" data-testid="planning-selection-review">
        <h3>Review Selection</h3>
        <p><span className="chip green">Included</span> <b>{selectedVisibleSuggestions.length}</b> visible action(s) will be sent to the next dry run.</p>
        <p><span className="chip blue">Not selected</span> <b>{Math.max(0, visibleSuggestions.length - selectedVisibleSuggestions.length - mutationConflictCount)}</b> visible action(s) remain outside the review batch.</p>
        <p><span className="chip orange">Safety conflict</span> <b>{mutationConflictCount}</b> visible move/rename alternative(s) are excluded because another filesystem mutation is already selected for the same file.</p>
        <p className="muted">Selection is review intent only. Dry run and backend policy still decide whether an action can proceed, and execution still requires the existing approval path.</p>
      </div>

      <div className="panel wide planning-groups-panel">
        <div className="planning-section-header">
          <div>
            <h3><FolderTree size={18} /> Proposed Structure</h3>
            <p className="muted">Grouped from genuine suggestion targets, action types, and source folders.</p>
          </div>
          <div className="planning-bulk-actions">
            <button className="outline" onClick={selectAllSuggestions} disabled={!suggestions.length}>
              {visibleSuggestions.length > 0 && visibleSuggestions.every((suggestion) => selectedSuggestionIds.has(suggestion.id)) ? 'Deselect All' : 'Select Safe Batch'}
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
                  const conflictingSelection = selectedMutationForFile(suggestion, selectedSuggestions);
                  const disabledByMutationGuard = !isSelected && Boolean(conflictingSelection);
                  const sourceFile = filesById.get(suggestion.file_id);
                  const selectionState = isSelected ? 'included' : disabledByMutationGuard ? 'conflict' : 'not-selected';
                  const selectionExplanation = isSelected
                    ? 'Included in the current review batch. Dry Run Preview will validate this action before any execution.'
                    : conflictingSelection
                      ? `Excluded by the filesystem safety guard: ${actionContext(conflictingSelection)} is already selected for this file.`
                      : 'Not selected for the current review batch. Select this action to include it in the next dry run.';

                  return <div
                    className="suggestion-line selectable"
                    key={suggestion.id}
                    data-testid={`suggestion-${suggestion.id}`}
                    data-file-id={suggestion.file_id}
                    data-action-type={suggestion.action_type}
                    data-selection-state={selectionState}
                  >
                    <label title={disabledByMutationGuard ? selectionExplanation : undefined}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disabledByMutationGuard}
                        onChange={() => toggleSuggestion(suggestion.id)}
                      />
                      <span>
                        <b>{suggestion.action_type}</b> → {suggestion.suggested_value}
                        {sourceFile?.filename && <small className="muted" style={{ display: 'block' }}>Source: {sourceFile.filename}</small>}
                        <small className="muted" style={{ display: 'block' }}>Why suggested: {suggestion.reason}</small>
                        <small data-testid="planning-selection-explanation" style={{ display: 'block' }}><b>Review status:</b> {selectionExplanation}</small>
                      </span>
                    </label>
                    <span className="chip blue">{Math.round(Number(suggestion.confidence || 0) * 100)}%</span>
                    {isSelected && <span className="chip green">included</span>}
                    {!isSelected && !disabledByMutationGuard && <span className="chip blue">not selected</span>}
                    {disabledByMutationGuard && <span className="chip orange">safety conflict</span>}
                    <button onClick={() => createPreview(suggestion)}>Preview</button>
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
      </div>

      <div className="panel wide" data-testid="planning-preview-queue">
        <div className="planning-section-header">
          <div>
            <h3>Dry Run / Execution Queue</h3>
            <p className="muted">Dry run validates a proposal only. It never executes a file action. A ready preview still requires a separate explicit execution approval.</p>
          </div>
        </div>
        {previews.length > 0 && <div className="planning-preview-summary" data-testid="planning-preview-summary">
          <p><span className="chip green">Ready for approval</span> <b>{readyPreviewCount}</b> preview(s) passed backend validation.</p>
          <p><span className="chip orange">Blocked</span> <b>{blockedPreviewCount}</b> preview(s) cannot execute in their current backend-validated state.</p>
          <p className="muted">Review source → target impact and any backend block reason below before approving execution.</p>
        </div>}
        {!previews.length && <p className="muted">Run Dry Run Preview to validate selected actions before execution.</p>}
        {previews.map((preview) => {
          const isReady = preview.preview_status === 'ready';
          const target = previewTarget(preview);
          return <div
            className="suggestion-line planning-preview-row"
            key={preview.id}
            data-testid={`preview-${preview.id}`}
            data-preview-status={preview.preview_status}
            data-preview-decision={isReady ? 'ready-for-approval' : 'blocked'}
          >
            <div>
              <p><span className={isReady ? 'chip green' : 'chip orange'}>{previewDecisionLabel(preview)}</span></p>
              <p><b>{preview.action_type}</b></p>
              <p data-testid="preview-impact"><b>Impact:</b> {preview.source_path || 'Source not available'} → {target || 'Target not available'}</p>
              {isReady
                ? <p className="muted" data-testid="preview-decision-explanation">Dry run passed backend validation. Execution remains a separate explicit approval.</p>
                : <p className="muted" data-testid="preview-decision-explanation"><b>Backend reason:</b> {preview.blocked_reason || 'No blocked reason was provided by the backend.'}</p>}
            </div>
            <span className={isReady ? 'chip green' : 'chip orange'}>{preview.preview_status}</span>
            <button disabled={!isReady} onClick={() => executePreview(preview)}>Execute</button>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

export default PlanningView;
