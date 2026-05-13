import { Brain, Sparkles } from 'lucide-react';
import type { IndexedFile, Suggestion } from '../../api';
import { averageConfidence } from '../utils/format';

export type PreviewRecord = {
  id: string;
  suggestion_id?: string;
  action_type: string;
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
  function toggleSuggestion(id: string) {
    const next = new Set(selectedSuggestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSuggestionIds(next);
  }

  function selectAllSuggestions() {
    const visible = suggestions.slice(0, 60);
    const allSelected = visible.every((suggestion) => selectedSuggestionIds.has(suggestion.id));
    const next = new Set(selectedSuggestionIds);

    if (allSelected) {
      visible.forEach((suggestion) => next.delete(suggestion.id));
    } else {
      visible.forEach((suggestion) => next.add(suggestion.id));
    }

    setSelectedSuggestionIds(next);
  }

  return <section>
    <div className="planning-head">
      <div>
        <h1><Brain /> AI Planning Center</h1>
        <p>Full planning workflow with AI settings, dry run previews, action selection, execution queue, and safety approval.</p>
      </div>
      <div className="button-row">
        <button className="outline" onClick={openSettings}>AI Settings</button>
        <button className="purple" onClick={deepAnalysis} disabled={busy}><Sparkles size={16} /> AI Analyze</button>
        <button className="outline" onClick={previewSelected}>Dry Run Preview</button>
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
      <p className="muted">Actual filesystem targets still come from backend-safe previews.</p>
    </div>

    <div className="planning-grid advanced">
      <div className="panel">
        <h3>AI Plan Summary</h3>
        <p>Files analyzed: <b>{files.length}</b></p>
        <p>Actions suggested: <b>{suggestions.length}</b></p>
        <p>Average confidence: <b>{averageConfidence(suggestions)}</b></p>
        <p>Selected actions: <b>{selectedSuggestionIds.size}</b></p>
        <p>Dry-run previews: <b>{previews.length}</b></p>
        <p>Executable previews: <b>{previews.filter((preview) => preview.preview_status === 'ready').length}</b></p>
      </div>

      <div className="panel wide">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Suggested Actions</h3>
          <button className="outline" onClick={selectAllSuggestions}>
            {suggestions.slice(0, 60).every((suggestion) => selectedSuggestionIds.has(suggestion.id)) ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        {suggestions.slice(0, 60).map((suggestion) => <div className="suggestion-line selectable" key={suggestion.id}>
          <label>
            <input
              type="checkbox"
              checked={selectedSuggestionIds.has(suggestion.id)}
              onChange={() => toggleSuggestion(suggestion.id)}
            />
            <b>{suggestion.action_type}</b> → {suggestion.suggested_value}
          </label>
          <span className="chip blue">{Math.round(Number(suggestion.confidence || 0) * 100)}%</span>
          <button onClick={() => createPreview(suggestion)}>Preview</button>
        </div>)}
      </div>

      <div className="panel wide">
        <h3>Dry Run / Execution Queue</h3>
        {!previews.length && <p className="muted">Run Dry Run Preview to validate selected actions before execution.</p>}
        {previews.map((preview) => <div className="suggestion-line" key={preview.id}>
          <div>
            <b>{preview.action_type}</b> → {preview.target_path || preview.suggested_value}
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
