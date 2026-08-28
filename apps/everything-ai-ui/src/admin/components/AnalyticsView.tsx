import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { apiRequest, type ApiOptions, type AppStatus } from '../../api';
import { StatCard } from './StatCard';

type AuditEvent = {
  id: string;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
  event_type?: string;
  actor_type?: string;
  actor_id?: string;
  actor_email?: string;
};

type ActionExecution = {
  id: string;
  execution_batch_id?: string | null;
  action_type: string;
  status: string;
  source_path?: string | null;
  target_path?: string | null;
  error_message?: string | null;
  executed_at?: string;
  undone_at?: string | null;
};

type EvidenceFilter = 'all' | 'with' | 'without';

type AnalyticsViewProps = {
  options: ApiOptions;
  status: AppStatus | null;
  audit: AuditEvent[];
};

function formatEventTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function isFilesystemAction(execution: ActionExecution) {
  return execution.action_type === 'move' || execution.action_type === 'rename';
}

function executionOutcome(execution: ActionExecution) {
  if (execution.status === 'executed') {
    return {
      label: 'Executed successfully',
      recovery: isFilesystemAction(execution)
        ? 'Undo available · explicit approval required.'
        : 'Undo action available · explicit approval required; recovery effect follows existing action semantics.',
      undoTimeLabel: 'Undo recorded',
    };
  }

  if (execution.status === 'undone') {
    if (isFilesystemAction(execution)) {
      return {
        label: 'Restored by undo',
        recovery: 'Restored',
        undoTimeLabel: 'Restored',
      };
    }

    return {
      label: 'Undo recorded',
      recovery: 'Undo completed; persisted status is undone.',
      undoTimeLabel: 'Undo recorded',
    };
  }

  if (execution.status === 'failed') {
    return {
      label: 'Execution failed',
      recovery: 'Undo unavailable after failed execution.',
      undoTimeLabel: 'Undo recorded',
    };
  }

  return {
    label: 'Execution outcome recorded',
    recovery: 'Undo availability follows the persisted execution status.',
    undoTimeLabel: 'Undo recorded',
  };
}

function evidenceFilterLabel(filter: EvidenceFilter) {
  if (filter === 'with') return 'With loaded audit evidence';
  if (filter === 'without') return 'Without loaded audit evidence';
  return 'All executions';
}

export function AnalyticsView({ options, status, audit }: AnalyticsViewProps) {
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [executionError, setExecutionError] = useState('');
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [focusedAuditId, setFocusedAuditId] = useState<string | null>(null);
  const [focusedExecutionId, setFocusedExecutionId] = useState<string | null>(null);
  const [reviewReturnExecutionId, setReviewReturnExecutionId] = useState<string | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>('all');

  const auditByExecution = useMemo(() => {
    const events = new Map<string, AuditEvent[]>();

    for (const event of audit) {
      if (event.entity_type !== 'action_execution' || !event.entity_id) continue;
      const current = events.get(event.entity_id) || [];
      current.push(event);
      events.set(event.entity_id, current);
    }

    for (const executionEvents of events.values()) {
      executionEvents.sort((left, right) => left.created_at.localeCompare(right.created_at));
    }

    return events;
  }, [audit]);

  const visibleExecutions = useMemo(() => {
    if (evidenceFilter === 'all') return executions;
    return executions.filter((execution) => {
      const hasLoadedAuditEvidence = (auditByExecution.get(execution.id) || []).length > 0;
      return evidenceFilter === 'with' ? hasLoadedAuditEvidence : !hasLoadedAuditEvidence;
    });
  }, [auditByExecution, evidenceFilter, executions]);

  const reviewReturnExecution = reviewReturnExecutionId
    ? executions.find((execution) => execution.id === reviewReturnExecutionId)
    : undefined;
  const reviewReturnExecutionVisible = Boolean(
    reviewReturnExecutionId && visibleExecutions.some((execution) => execution.id === reviewReturnExecutionId),
  );
  const reviewReturnAudit = reviewReturnExecutionId ? auditByExecution.get(reviewReturnExecutionId) || [] : [];

  async function refreshExecutions() {
    const payload = await apiRequest<{ executions: ActionExecution[] }>(
      options,
      '/api/action-executions?limit=100',
    );
    setExecutions(payload.executions || []);
  }

  function navigateToAuditEvidence(executionId: string, executionAudit: AuditEvent[]) {
    const target = executionAudit[0];
    if (!target) return;

    setReviewReturnExecutionId(executionId);
    setFocusedExecutionId(null);
    setFocusedAuditId(target.id);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`audit-evidence-${target.id}`);
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    });
  }

  function resumeExecutionReview() {
    const executionId = reviewReturnExecutionId;
    if (!executionId || !reviewReturnExecutionVisible) return;

    setFocusedAuditId(null);
    setFocusedExecutionId(executionId);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`execution-review-${executionId}`);
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    });
  }

  function clearReviewContext() {
    setReviewReturnExecutionId(null);
    setFocusedExecutionId(null);
    setFocusedAuditId(null);
  }

  async function undoExecution(execution: ActionExecution) {
    const description = `${execution.action_type}: ${execution.target_path || execution.source_path || execution.id}`;
    if (!window.confirm(`Undo approved action?\n\n${description}`)) return;

    setUndoingId(execution.id);
    setExecutionError('');
    try {
      await apiRequest(
        options,
        `/api/action-executions/${execution.id}/undo`,
        { approve: true },
        'POST',
      );
      await refreshExecutions();
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : String(error));
    } finally {
      setUndoingId(null);
    }
  }

  useEffect(() => {
    refreshExecutions().catch((error) => {
      setExecutionError(error instanceof Error ? error.message : String(error));
    });
    // options changes only when API settings change; refresh on that boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.baseUrl, options.token]);

  return <section>
    <h1><BarChart3 /> Logging & Analytics Dashboard</h1>
    <section className="stats-grid">
      <StatCard title="Total Logs" value={audit.length} />
      <StatCard title="Errors" value={audit.filter((event) => String(event.event_type).includes('failed')).length} />
      <StatCard title="Actions" value={status?.executions || 0} />
      <StatCard title="Active Watchers" value={status?.active_watch_roots || 0} />
    </section>

    <div className="panel" data-testid="governed-action-comprehension">
      <h2>Governed Action State Guide</h2>
      <p className="muted">Preview is proposal only. It does not execute an action or prove completion.</p>
      <p><b>Ready for approval:</b> backend validation passed; execution still requires explicit approval through the existing governed control.</p>
      <p><b>Blocked preview:</b> the action cannot execute in its current backend-validated state; the backend reason remains authoritative.</p>
      <p><b>Executed:</b> the persisted execution status records that the governed action ran. <b>Failed:</b> persisted failure status and error text remain authoritative. <b>Undone:</b> persisted undo state records the approved undo result.</p>
      <p className="muted">Audit evidence shown below is limited to the loaded audit window. No matching event in that window is not proof that no audit exists elsewhere.</p>
    </div>

    <div className="panel" data-testid="governed-execution-history">
      <h2>Governed Action History</h2>
      <p className="muted">Executed filesystem actions remain reviewable and can be undone only through explicit approval. Outcome labels below explain persisted execution and audit facts without changing them.</p>
      <label htmlFor="audit-evidence-filter"><strong>Audit evidence filter</strong></label>
      <select
        id="audit-evidence-filter"
        aria-label="Audit evidence filter"
        value={evidenceFilter}
        onChange={(event) => setEvidenceFilter(event.target.value as EvidenceFilter)}
      >
        <option value="all">All executions</option>
        <option value="with">With loaded audit evidence</option>
        <option value="without">Without loaded audit evidence</option>
      </select>
      <p className="muted" data-testid="governed-action-evidence-filter-context">
        Showing {visibleExecutions.length} of {executions.length} executions. This filter uses only matching action-execution evidence in the loaded audit window; a missing loaded-window match does not prove that no audit exists elsewhere.
      </p>
      {reviewReturnExecutionId ? <div data-testid="governed-action-review-context-summary">
        <h3>Review context summary</h3>
        <div data-testid="governed-action-review-context-orientation">
          <p><b>Current loaded review window:</b> {visibleExecutions.length} of {executions.length} executions are visible under the local filter {evidenceFilterLabel(evidenceFilter)}.</p>
          <p><b>Remembered review context:</b> The remembered local target is {reviewReturnExecutionId}.</p>
          <p className="muted"><b>Orientation provenance:</b> Loaded-window facts come from the currently loaded action executions and local audit-evidence filter. Remembered-context facts come only from the exact local execution identifier recorded by explicit navigation from already-loaded audit evidence.</p>
          <p className="muted">Changing the loaded-window filter can hide this target without deleting or replacing the remembered local identifier.</p>
          {!reviewReturnExecutionVisible ? <>
            <p className="muted">Safe return is unavailable while the remembered target is outside the current loaded review window; no replacement execution is inferred.</p>
            <p className="muted"><b>Unknown-state explanation:</b> The remembered target is not visible in the current loaded review window. That loaded-window absence does not establish global audit absence, backend persistence, or review completion. No replacement execution is inferred.</p>
          </> : null}
        </div>
        <p><b>Remembered execution:</b> {reviewReturnExecutionId}</p>
        <small className="muted" style={{ display: 'block' }}>Provenance: local remembered execution identifier recorded by explicit navigation from already-loaded audit evidence.</small>
        <p><b>Loaded audit evidence:</b> {reviewReturnAudit.length
          ? `Available in the current loaded audit window (${reviewReturnAudit.length} event${reviewReturnAudit.length === 1 ? '' : 's'})`
          : 'Unavailable in the current loaded audit window; this does not prove that no audit exists elsewhere.'}</p>
        <small className="muted" style={{ display: 'block' }}>Provenance: matching events from the currently loaded audit window only.</small>
        {!reviewReturnAudit.length ? <small className="muted" style={{ display: 'block' }}>Unknown-state explanation: no matching event is present in the currently loaded audit window; global audit absence is not inferred.</small> : null}
        <p><b>Navigation origin:</b> Already-loaded governed-action audit evidence</p>
        <small className="muted" style={{ display: 'block' }}>Provenance: explicit local navigation from already-loaded governed-action audit evidence.</small>
        <p><b>Loaded evidence filter:</b> {evidenceFilterLabel(evidenceFilter)}</p>
        <small className="muted" style={{ display: 'block' }}>Provenance: current local audit-evidence filter selection.</small>
        <p><b>Safe return target:</b> {reviewReturnExecution && reviewReturnExecutionVisible
          ? 'Resume exact remembered execution review'
          : 'Unavailable — remembered execution is not visible in the current loaded review window; no replacement execution is inferred.'}</p>
        <small className="muted" style={{ display: 'block' }}>Provenance: safe return is derived only from whether the exact remembered execution remains visible in the currently loaded review window.</small>
        {!(reviewReturnExecution && reviewReturnExecutionVisible) ? <small className="muted" style={{ display: 'block' }}>Unknown-state explanation: the exact remembered execution is not visible under the current loaded-window filter; no replacement execution or review completion is inferred.</small> : null}
        <p className="muted">Local navigation only; this does not prove backend persistence or review completion.</p>
      </div> : null}
      {reviewReturnExecutionId ? reviewReturnExecution && reviewReturnExecutionVisible ? <div data-testid="governed-action-review-context">
        <p className="muted">
          Remembered execution review: {reviewReturnExecution.id}. This safe resume target remains part of already-loaded governed-action review state. This local navigation context was recorded only by explicit navigation from already-loaded governed-action audit evidence; it does not mean the backend persisted review state or that review is complete.
        </p>
        <button type="button" className="outline" onClick={resumeExecutionReview}>Resume execution review</button>
        <button type="button" className="outline" onClick={clearReviewContext}>Clear remembered review context</button>
      </div> : <div data-testid="governed-action-review-context">
        <p className="muted" aria-label="Governed-action review resumption unavailable">
          Resume execution review unavailable because the remembered execution is not visible in the current loaded review window; no replacement execution is inferred.
        </p>
        <button type="button" className="outline" onClick={clearReviewContext}>Clear remembered review context</button>
      </div> : null}
      {executionError && <p className="error">{executionError}</p>}
      {!executions.length && <p className="muted">No action executions recorded.</p>}
      {executions.length > 0 && <div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Action</th><th>Source</th><th>Target</th><th>Outcome</th><th>Audit evidence</th><th>Recovery</th></tr>
          </thead>
          <tbody>
            {visibleExecutions.map((execution) => {
              const outcome = executionOutcome(execution);
              const executionAudit = auditByExecution.get(execution.id) || [];

              return <tr
                key={execution.id}
                id={`execution-review-${execution.id}`}
                tabIndex={-1}
                data-testid={`execution-${execution.id}`}
                data-execution-status={execution.status}
                data-review-focus={focusedExecutionId === execution.id ? 'true' : undefined}
              >
                <td>
                  <strong>{execution.action_type}</strong>
                  {execution.execution_batch_id ? <small className="muted" style={{ display: 'block' }}>Batch: {execution.execution_batch_id}</small> : null}
                </td>
                <td>{execution.source_path || '—'}</td>
                <td>{execution.target_path || '—'}</td>
                <td>
                  <strong>{outcome.label}</strong>
                  <small className="muted" style={{ display: 'block' }}>Persisted status: {execution.status}</small>
                  <small className="muted" style={{ display: 'block' }}>Executed: {formatEventTime(execution.executed_at)}</small>
                  {execution.undone_at ? <small className="muted" style={{ display: 'block' }}>{outcome.undoTimeLabel}: {formatEventTime(execution.undone_at)}</small> : null}
                  {execution.error_message ? <small className="error" style={{ display: 'block' }}>Failure: {execution.error_message}</small> : null}
                </td>
                <td>
                  <div data-testid={`execution-audit-${execution.id}`}>
                    {executionAudit.length ? <>
                      <strong>{executionAudit.length} persisted audit event{executionAudit.length === 1 ? '' : 's'}</strong>
                      {executionAudit.map((event) => <small key={event.id} className="muted" style={{ display: 'block' }}>
                        {event.event_type || 'audit event'} · {formatEventTime(event.created_at)}
                      </small>)}
                      <button
                        type="button"
                        onClick={() => navigateToAuditEvidence(execution.id, executionAudit)}
                        aria-label="View audit evidence"
                      >
                        View audit evidence
                      </button>
                    </> : <span className="muted">No matching action-execution audit event in the loaded log window; this does not prove that no audit exists outside the loaded window.</span>}
                  </div>
                </td>
                <td>
                  <span className="muted" style={{ display: 'block' }}>{outcome.recovery}</span>
                  {execution.status === 'executed'
                    ? <button
                      onClick={() => undoExecution(execution)}
                      disabled={undoingId === execution.id}
                      aria-label={`Undo ${execution.action_type} execution`}
                    >
                      {undoingId === execution.id ? 'Undoing…' : 'Undo'}
                    </button>
                    : null}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </div>

    <div className="panel">
      <h2>Log Entries</h2>
      <div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Timestamp</th><th>Category</th><th>Message</th><th>Actor</th></tr>
          </thead>
          <tbody>
            {audit.map((event) => <tr
              key={event.id}
              id={`audit-evidence-${event.id}`}
              tabIndex={-1}
              data-testid={`audit-${event.id}`}
              data-entity-id={event.entity_id || ''}
              data-evidence-focus={focusedAuditId === event.id ? 'true' : undefined}
            >
              <td>{new Date(event.created_at).toLocaleString()}</td>
              <td>{event.entity_type}</td>
              <td>{event.event_type}</td>
              <td>{event.actor_email || event.actor_id || event.actor_type || 'system'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}

export default AnalyticsView;