import { useEffect, useMemo, useState } from 'react';
import type { ApiOptions } from '../api';
import { fetchWikiDiagnostics, type WikiDiagnostics } from './wikiJobsApi';

type WikiDiagnosticsPanelProps = {
  options: ApiOptions;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatNumber(value?: number | null) {
  return Number(value || 0).toLocaleString();
}

function shortHash(value?: string | null) {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function WikiDiagnosticsPanel({ options }: WikiDiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<WikiDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDiagnostics() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWikiDiagnostics(options);
      setDiagnostics(response.diagnostics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wiki diagnostics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnostics();
  }, [options]);

  const recentRebuilds = diagnostics?.rebuilds.slice(0, 3) || [];
  const recentFingerprints = diagnostics?.fingerprints.slice(0, 3) || [];
  const recentDependencies = diagnostics?.dependencies.slice(0, 4) || [];
  const lastBuildState = useMemo(() => (
    diagnostics?.build_state.find((item) => item.key === 'last_incremental_build_at')
    || diagnostics?.build_state.find((item) => item.key === 'last_full_build_at')
  ), [diagnostics]);

  return (
    <section className="wiki-diagnostics-panel" aria-label="Wiki diagnostics">
      <div className="wiki-diagnostics-header">
        <div>
          <h4>Knowledge Diagnostics</h4>
          <p>Read-only rebuild, evidence, dependency, and fingerprint visibility.</p>
        </div>
        <button type="button" className="outline" onClick={loadDiagnostics} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh Diagnostics'}
        </button>
      </div>

      {error ? <div className="wiki-rebuild-error">{error}</div> : null}

      <div className="wiki-rebuild-summary-grid wiki-rebuild-summary-grid-wide">
        <div className="wiki-rebuild-summary-card">
          <strong>{formatNumber(diagnostics?.page_stats.active_pages)}</strong>
          <span>Active Wiki Pages</span>
        </div>
        <div className="wiki-rebuild-summary-card">
          <strong>{formatNumber(diagnostics?.evidence_stats.chunk_count)}</strong>
          <span>Evidence Chunks</span>
        </div>
        <div className="wiki-rebuild-summary-card">
          <strong>{formatNumber(diagnostics?.dependencies.length)}</strong>
          <span>Dependencies</span>
        </div>
        <div className="wiki-rebuild-summary-card">
          <strong>{formatNumber(diagnostics?.fingerprints.length)}</strong>
          <span>Fingerprints</span>
        </div>
      </div>

      <div className="wiki-diagnostics-grid">
        <article className="wiki-diagnostics-card">
          <div className="wiki-diagnostics-card-title">
            <strong>Knowledge Health</strong>
            <span>Last build: {formatTimestamp(lastBuildState?.value)}</span>
          </div>
          <div className="wiki-diagnostics-mini-grid">
            <div><span>Sections</span><strong>{formatNumber(diagnostics?.evidence_stats.section_count)}</strong></div>
            <div><span>Sources</span><strong>{formatNumber(diagnostics?.evidence_stats.source_count)}</strong></div>
            <div><span>Relations</span><strong>{formatNumber(diagnostics?.evidence_stats.relation_count)}</strong></div>
            <div><span>Stale</span><strong>{formatNumber(diagnostics?.page_stats.stale_pages)}</strong></div>
          </div>
        </article>

        <article className="wiki-diagnostics-card">
          <div className="wiki-diagnostics-card-title">
            <strong>Dependency Graph</strong>
            <span>Tracked page-to-source links</span>
          </div>
          <div className="wiki-diagnostics-list">
            {recentDependencies.map((dependency) => (
              <div key={dependency.id} className="wiki-diagnostics-row">
                <span>{dependency.page_id}</span>
                <strong>{dependency.source_ref || 'source'} → {dependency.file_id}</strong>
              </div>
            ))}
            {!recentDependencies.length ? <div className="wiki-diagnostics-empty">No dependencies recorded yet.</div> : null}
          </div>
        </article>

        <article className="wiki-diagnostics-card">
          <div className="wiki-diagnostics-card-title">
            <strong>Fingerprints</strong>
            <span>Tracked source content state</span>
          </div>
          <div className="wiki-diagnostics-list">
            {recentFingerprints.map((fingerprint) => (
              <div key={fingerprint.file_id} className="wiki-diagnostics-row">
                <span>{fingerprint.file_id}</span>
                <strong>{shortHash(fingerprint.content_hash)} · {formatNumber(fingerprint.content_length)} chars</strong>
              </div>
            ))}
            {!recentFingerprints.length ? <div className="wiki-diagnostics-empty">No fingerprints recorded yet.</div> : null}
          </div>
        </article>

        <article className="wiki-diagnostics-card">
          <div className="wiki-diagnostics-card-title">
            <strong>Recent Rebuilds</strong>
            <span>Persisted rebuild history</span>
          </div>
          <div className="wiki-diagnostics-list">
            {recentRebuilds.map((rebuild) => (
              <div key={rebuild.id} className="wiki-diagnostics-row">
                <span>{rebuild.mode} · {rebuild.status}</span>
                <strong>{formatTimestamp(rebuild.created_at)}</strong>
              </div>
            ))}
            {!recentRebuilds.length ? <div className="wiki-diagnostics-empty">No persisted rebuilds recorded yet.</div> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
