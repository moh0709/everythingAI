import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, ShieldCheck, XCircle } from 'lucide-react';
import {
  applyArchiveApprovalIntent,
  deriveArchiveBulkReviewSummary,
  filterArchiveReviewItems,
  getArchiveStaleState,
  isArchiveReviewItemBlocked,
  type ArchiveReviewFilter,
  type ArchiveReviewItem,
  type ArchiveStaleState,
} from '../archiveReviewModel';

type ArchiveReviewWorkspaceProps = {
  planId: string;
  archiveDestination: string;
  items: ArchiveReviewItem[];
  policyWarnings?: string[];
  onIntentChange?: (items: ArchiveReviewItem[]) => void;
};

const STALE_LABELS: Record<ArchiveStaleState, string> = {
  current: 'Current',
  source_changed: 'Source changed',
  archive_missing: 'Archive missing',
  archive_changed: 'Archive changed',
  sidecar_missing: 'Sidecar missing',
  conflict: 'Conflict',
};

const FILTERS: Array<{ value: ArchiveReviewFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'stale', label: 'Stale' },
  { value: 'source_changed', label: 'Source changed' },
  { value: 'archive_missing', label: 'Archive missing' },
  { value: 'archive_changed', label: 'Archive changed' },
  { value: 'sidecar_missing', label: 'Sidecar missing' },
  { value: 'conflict', label: 'Conflict' },
];

export function ArchiveReviewWorkspace({
  planId,
  archiveDestination,
  items,
  policyWarnings = [],
  onIntentChange,
}: ArchiveReviewWorkspaceProps) {
  const [filter, setFilter] = useState<ArchiveReviewFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewItems, setReviewItems] = useState(items);

  const visibleItems = useMemo(() => filterArchiveReviewItems(reviewItems, filter), [reviewItems, filter]);
  const summary = useMemo(
    () => deriveArchiveBulkReviewSummary(reviewItems, selectedIds),
    [reviewItems, selectedIds],
  );

  function toggleItem(itemId: string) {
    const next = new Set(selectedIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setSelectedIds(next);
  }

  function applyIntent(intent: 'approved' | 'rejected') {
    const next = applyArchiveApprovalIntent(reviewItems, selectedIds, intent);
    setReviewItems(next);
    onIntentChange?.(next);
  }

  return <section aria-label="Archive review workspace" className="panel">
    <div className="planning-head">
      <div>
        <h2><ShieldCheck size={20} /> Managed Archive Review</h2>
        <p>Review preview-only archive proposals. Approval here records intent only; it does not execute filesystem writes.</p>
      </div>
      <span className="muted">Plan {planId}</span>
    </div>

    <div className="destination">
      <strong>Archive destination</strong>
      <div>{archiveDestination}</div>
    </div>

    {policyWarnings.length > 0 && <div role="alert" className="panel">
      <strong><AlertTriangle size={16} /> Policy warnings</strong>
      <ul>{policyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </div>}

    <div className="button-row" aria-label="Archive review filters">
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          className={filter === value ? 'purple' : 'outline'}
          onClick={() => setFilter(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>

    <div className="panel">
      <strong>Bulk review</strong>
      <p>
        Selected: <b>{summary.selected_count}</b> · Stale: <b>{summary.stale_count}</b> · Conflicts/blocked: <b>{summary.conflict_count}</b> · Reviewable: <b>{summary.reviewable_count}</b>
      </p>
      {summary.selected_count > 0 && <p className="muted">
        Source changed: {summary.stale_state_counts.source_changed} · Archive missing: {summary.stale_state_counts.archive_missing} · Archive changed: {summary.stale_state_counts.archive_changed} · Sidecar missing: {summary.stale_state_counts.sidecar_missing} · Conflict: {summary.stale_state_counts.conflict}
      </p>}
      <div className="button-row">
        <button
          type="button"
          disabled={!summary.can_approve_all}
          onClick={() => applyIntent('approved')}
        >
          <CheckCircle2 size={16} /> Mark selected approved
        </button>
        <button
          type="button"
          className="outline"
          disabled={summary.selected_count === 0}
          onClick={() => applyIntent('rejected')}
        >
          <XCircle size={16} /> Mark selected rejected
        </button>
      </div>
      <p className="muted">No execute/run action exists in this workspace foundation.</p>
    </div>

    <div className="planning-grid advanced">
      {visibleItems.map((item) => {
        const blocked = isArchiveReviewItemBlocked(item);
        const staleState = getArchiveStaleState(item);
        const manualReview = staleState === 'archive_changed' || staleState === 'conflict';
        return <article key={item.plan_item_id} className="panel">
          <label>
            <input
              type="checkbox"
              checked={selectedIds.has(item.plan_item_id)}
              onChange={() => toggleItem(item.plan_item_id)}
            />
            Select
          </label>
          <h3><FileText size={16} /> {item.source_path}</h3>
          <p><strong>Proposed archive path:</strong> {item.suggested_archive_path}</p>
          <p><strong>Archive state:</strong> {STALE_LABELS[staleState]}</p>
          {item.review_mode && <p><strong>Review mode:</strong> {item.review_mode}</p>}
          <p><strong>Approval intent:</strong> {item.approval_status}</p>
          <p><strong>Conflict state:</strong> {item.conflict_status}</p>
          {manualReview && <p role="status"><AlertTriangle size={14} /> Manual review is required for this archive state. Approval intent remains blocked until the state is resolved.</p>}
          {!manualReview && blocked && <p role="status"><AlertTriangle size={14} /> Approval is blocked until conflict/stale state is resolved.</p>}

          <div>
            <strong>AI-generated metadata fields</strong>
            {item.ai_generated_fields.length
              ? <ul>{item.ai_generated_fields.map((field) => <li key={field}>{field} <span className="muted">AI-generated</span></li>)}</ul>
              : <p className="muted">None</p>}
          </div>

          <div>
            <strong>Evidence</strong>
            {item.evidence_refs.length
              ? <ul>{item.evidence_refs.map((evidence, index) => (
                <li key={`${evidence.type}:${evidence.source_path}:${evidence.locator || index}`}>
                  {evidence.type} · {evidence.source_path}{evidence.locator ? ` · ${evidence.locator}` : ''}
                </li>
              ))}</ul>
              : <p className="muted">No evidence references supplied.</p>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}

export default ArchiveReviewWorkspace;
