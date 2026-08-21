import { useEffect, useState } from 'react';
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
  action_type: string;
  status: string;
  source_path?: string | null;
  target_path?: string | null;
  executed_at?: string;
  undone_at?: string | null;
};

type AnalyticsViewProps = {
  options: ApiOptions;
  status: AppStatus | null;
  audit: AuditEvent[];
};

export function AnalyticsView({ options, status, audit }: AnalyticsViewProps) {
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [executionError, setExecutionError] = useState('');
  const [undoingId, setUndoingId] = useState<string | null>(null);

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
      <p className="muted">Executed filesystem actions remain reviewable and can be undone only through explicit approval.</p>
      {executionError && <p className="error">{executionError}</p>}
      {!executions.length && <p className="muted">No action executions recorded.</p>}
      {executions.length > 0 && <table>
        <thead>
          <tr><th>Action</th><th>Source</th><th>Target</th><th>Status</th><th>Recovery</th></tr>
        </thead>
        <tbody>
          {executions.map((execution) => <tr
            key={execution.id}
            data-testid={`execution-${execution.id}`}
            data-execution-status={execution.status}
          >
            <td>{execution.action_type}</td>
            <td>{execution.source_path || '—'}</td>
            <td>{execution.target_path || '—'}</td>
            <td>{execution.status}</td>
            <td>
              {execution.status === 'executed'
                ? <button
                  onClick={() => undoExecution(execution)}
                  disabled={undoingId === execution.id}
                  aria-label={`Undo ${execution.action_type} execution`}
                >
                  {undoingId === execution.id ? 'Undoing…' : 'Undo'}
                </button>
                : <span className="muted">{execution.status === 'undone' ? 'Restored' : 'Not available'}</span>}
            </td>
          </tr>)}
        </tbody>
      </table>}
    </div>

    <div className="panel">
      <h2>Log Entries</h2>
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
  </section>;
}

export default AnalyticsView;
