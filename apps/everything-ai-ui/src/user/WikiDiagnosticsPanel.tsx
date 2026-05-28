import { useEffect, useMemo, useState } from 'react';
import type { ApiOptions } from '../api';
import { fetchWikiDiagnostics, type WikiDiagnostics } from './wikiJobsApi';

type WikiDiagnosticsPanelProps = {
  options: ApiOptions;
};

type ExpandedDiagnosticType = 'dependency' | 'fingerprint' | 'rebuild';

type ExpandedDiagnostic = {
  type: ExpandedDiagnosticType;
  id: string;
} | null;

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

function isExpanded(expanded: ExpandedDiagnostic, type: ExpandedDiagnosticType, id: string) {
  return expanded !== null && expanded.type === type && expanded.id === id;
}

export function WikiDiagnosticsPanel({ options }: WikiDiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<WikiDiagnostics | null>(null);
  const [expanded, setExpanded] = useState<ExpandedDiagnostic>(null);
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

  function toggleExpanded(type: ExpandedDiagnosticType, id: string) {
    setExpanded((current) => (isExpanded(current, type, id) ? null : { type, id }));
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
              <button
                key={dependency.id}
                type="button"
                className="wiki-diagnostics-row wiki-diagnostics-row-button"
                onClick={() => toggleExpanded('dependency', dependency.id)}
              >
                <span>{dependency.page_id}</span>
                <strong>{dependency.source_ref || 'source'} → {dependency.file_id}</strong>
                {isExpanded(expanded, 'dependency', dependency.id) ? (
                  <div className="wiki-diagnostics-detail">
                    <p><b>Why it matters:</b> this Wiki page depends on this source file. If the file fingerprint changes, this page can be targeted for selective rebuild.</p>
                    <dl>
                      <div><dt>Page</dt><dd>{dependency.page_id}</dd></div>
                      <div><dt>File</dt><dd>{dependency.file_id}</dd></div>
                      <div><dt>Source ref</dt><dd>{dependency.source_ref || 'source'}</dd></div>
                      <div><dt>Updated</dt><dd>{formatTimestamp(dependency.updated_at)}</dd></div>
                    </dl>
                  </div>
                ) : null}
              </button>
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
              <button
                key={fingerprint.file_id}
                type="button"
                className="wiki-diagnostics-row wiki-diagnostics-row-button"
                onClick={() => toggleExpanded('fingerprint', fingerprint.file_id)}
              >
                <span>{fingerprint.file_id}</span>
                <strong>{shortHash(fingerprint.content_hash)} · {formatNumber(fingerprint.content_length)} chars</strong>
                {isExpanded(expanded, 'fingerprint', fingerprint.file_id) ? (
                  <div className="wiki-diagnostics-detail">
                    <p><b>Why it matters:</b> this fingerprint represents the source content state used to detect whether a Wiki page needs rebuilding.</p>
                    <dl>
                      <div><dt>File</dt><dd>{fingerprint.file_id}</dd></div>
                      <div><dt>Hash</dt><dd>{fingerprint.content_hash || '—'}</dd></div>
                      <div><dt>Length</dt><dd>{formatNumber(fingerprint.content_length)} chars</dd></div>
                      <div><dt>Updated</dt><dd>{formatTimestamp(fingerprint.updated_at)}</dd></div>
                    </dl>
                  </div>
                ) : null}
              </button>
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
              <button
                key={rebuild.id}
                type="button"
                className="wiki-diagnostics-row wiki-diagnostics-row-button"
                onClick={() => toggleExpanded('rebuild', rebuild.id)}
              >
                <span>{rebuild.mode} · {rebuild.status}</span>
                <strong>{formatTimestamp(rebuild.created_at)}</strong>
                {isExpanded(expanded, 'rebuild', rebuild.id) ? (
                  <div className="wiki-diagnostics-detail">
                    <p><b>Why it matters:</b> this record explains how the Wiki was rebuilt and whether the operation was full, incremental, selective, or failed.</p>
                    <dl>
                      <div><dt>Mode</dt><dd>{rebuild.mode}</dd></div>
                      <div><dt>Status</dt><dd>{rebuild.status}</dd></div>
                      <div><dt>Started</dt><dd>{formatTimestamp(rebuild.started_at)}</dd></div>
                      <div><dt>Completed</dt><dd>{formatTimestamp(rebuild.completed_at)}</dd></div>
                    </dl>
                  </div>
                ) : null}
              </button>
            ))}
            {!recentRebuilds.length ? <div className="wiki-diagnostics-empty">No persisted rebuilds recorded yet.</div> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
