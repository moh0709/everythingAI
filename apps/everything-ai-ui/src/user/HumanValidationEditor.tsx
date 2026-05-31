import { useState } from 'react';
import type { ApiOptions } from '../api';
import {
  updateWikiHumanValidation,
  type WikiHumanValidation,
  type WikiHumanValidationWriteStatus,
  type WikiQualitySummary,
} from './wikiJobsApi';

type HumanValidationEditorProps = {
  options: ApiOptions;
  page?: WikiQualitySummary;
  onSaved?: (validation: WikiHumanValidation) => void;
};

const statuses: Array<{ value: WikiHumanValidationWriteStatus; label: string }> = [
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'rejected', label: 'Rejected' },
];

export function HumanValidationEditor({ options, page, onSaved }: HumanValidationEditorProps) {
  const [status, setStatus] = useState<WikiHumanValidationWriteStatus>('reviewed');
  const [reviewedBy, setReviewedBy] = useState('operator');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveValidation() {
    if (!page?.page_id) {
      setError('No Wiki page selected for validation.');
      return;
    }

    if (!reviewedBy.trim()) {
      setError('Reviewer is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const response = await updateWikiHumanValidation(options, page.page_id, {
        status,
        reviewed_by: reviewedBy.trim(),
        notes: notes.trim() || undefined,
      });

      setMessage(`Saved human validation as ${response.validation.status}.`);
      onSaved?.(response.validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save human validation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="wiki-diagnostics-card">
      <div className="wiki-diagnostics-card-title">
        <strong>Human Validation Update</strong>
        <span>Controlled page review action</span>
      </div>

      {!page ? <div className="wiki-diagnostics-empty">No Wiki page selected for validation update.</div> : null}

      {page ? (
        <div className="wiki-diagnostics-detail wiki-diagnostics-detail-static">
          <p><b>Page:</b> {page.title}</p>

          <label className="connection-field">
            <span>Reviewer</span>
            <input
              value={reviewedBy}
              onChange={(event) => setReviewedBy(event.target.value)}
              placeholder="Reviewer name"
            />
          </label>

          <label className="connection-field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as WikiHumanValidationWriteStatus)}>
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="connection-field">
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional review notes"
              rows={4}
            />
          </label>

          <button type="button" className="primary" onClick={saveValidation} disabled={saving}>
            {saving ? 'Saving…' : 'Save Human Validation'}
          </button>

          <ul className="wiki-diagnostics-reasons">
            <li>This updates only the selected Wiki page validation record.</li>
            <li>It does not modify Wiki content, sources, quality scoring, or rebuild state.</li>
            <li>Use rejected or needs attention when the current page should not be trusted as approved.</li>
          </ul>

          {message ? <div className="wiki-diagnostics-empty">{message}</div> : null}
          {error ? <div className="wiki-rebuild-error">{error}</div> : null}
        </div>
      ) : null}
    </article>
  );
}
