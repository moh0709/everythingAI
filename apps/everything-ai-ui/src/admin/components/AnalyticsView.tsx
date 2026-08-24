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

export function AnalyticsView({ options, status, audit }: AnalyticsViewProps) {
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [executionError, setExecutionError] = useState('');
  const [undoingId, setUndoingId] = useState<string | null>(null);

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

  async function refreshExecutions() {
    const payload = await apiRequest<{ executions: ActionExecution[] }>(
      options,
      '/api/action-executions?limit=100',
    );
    setExecutions(payload.executions || []);
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

    <div className="panel" data-testid="governed-execution-history">
      <h2>Governed Action History</h2>
      <p className="muted">Executed filesystem actions remain reviewable and can be undone only through explicit approval. Outcome labels below explain persisted execution and audit facts without changing them.</p>
      {executionError && <p className="error">{executionError}</p>}
      {!executions.length && <p className="muted">No action executions recorded.</p>}
      {executions.length > 0 && <div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Action</th><th>Source</th><th>Target</th><th>Outcome</th><th>Audit evidence</th><th>Recovery</th></tr>
          </thead>
          <tbody>
            {executions.map((execution) => {
              const outcome = executionOutcome(execution);
              const executionAudit = auditByExecution.get(execution.id) || [];

              return <tr
                key={execution.id}
                data-testid={`execution-${execution.id}`}
                data-execution-status={execution.status}
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
                    </> : <span className="muted">No matching action-execution audit event in the loaded log window.</span>}
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
              data-testid={`audit-${event.id}`}
              data-entity-id={event.entity_id || ''}
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
