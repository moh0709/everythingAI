import { BarChart3 } from 'lucide-react';
import type { AppStatus } from '../../api';
import { StatCard } from './StatCard';

type AuditEvent = {
  id: string;
  created_at: string;
  entity_type?: string;
  event_type?: string;
};

type AnalyticsViewProps = {
  status: AppStatus | null;
  audit: AuditEvent[];
};

export function AnalyticsView({ status, audit }: AnalyticsViewProps) {
  return <section>
    <h1><BarChart3 /> Logging & Analytics Dashboard</h1>
    <section className="stats-grid">
      <StatCard title="Total Logs" value={audit.length} />
      <StatCard title="Errors" value={audit.filter((event) => String(event.event_type).includes('failed')).length} />
      <StatCard title="Actions" value={status?.executions || 0} />
      <StatCard title="Active Watchers" value={status?.active_watch_roots || 0} />
    </section>
    <div className="panel">
      <h2>Log Entries</h2>
      <table>
        <thead>
          <tr><th>Timestamp</th><th>Category</th><th>Message</th></tr>
        </thead>
        <tbody>
          {audit.map((event) => <tr key={event.id}>
            <td>{new Date(event.created_at).toLocaleString()}</td>
            <td>{event.entity_type}</td>
            <td>{event.event_type}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

export default AnalyticsView;
