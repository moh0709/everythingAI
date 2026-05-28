import { useEffect, useMemo, useState } from 'react';
import type { ApiOptions } from '../api';
import {
  clearWikiRebuildJobs,
  fetchWikiJobs,
  startWikiRebuildJob,
  type WikiJob,
} from './wikiJobsApi';
import { WikiDiagnosticsPanel } from './WikiDiagnosticsPanel';
import './wikiRebuildPanel.css';

function formatTimestamp(value?: string) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type WikiRebuildPanelProps = {
  options: ApiOptions;
};

export function WikiRebuildPanel({ options }: WikiRebuildPanelProps) {
  const [jobs, setJobs] = useState<WikiJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    try {
      const response = await fetchWikiJobs(options);
      setJobs(response.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rebuild jobs');
    }
  }

  async function handleStartRebuild() {
    try {
      setRunning(true);
      setError(null);

      await startWikiRebuildJob(options);

      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start rebuild');
    } finally {
      setRunning(false);
    }
  }

  async function handleClearHistory() {
    try {
      setClearing(true);
      setError(null);

      const response = await clearWikiRebuildJobs(options);
      setJobs(response.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear rebuild history');
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    setLoading(true);

    loadJobs().finally(() => {
      setLoading(false);
    });

    const interval = setInterval(() => {
      loadJobs();
    }, 2500);

    return () => clearInterval(interval);
  }, [options]);

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === 'queued' || job.status === 'running'),
    [jobs]
  );

  const clearDisabled = clearing || activeJobs.length > 0 || !jobs.length;

  return (
    <section className="wiki-rebuild-panel panel">
      <div className="wiki-rebuild-panel-header">
        <div>
          <h3>Wiki Rebuild Orchestration</h3>
          <p>Operational incremental rebuild monitoring</p>
        </div>

        <div className="wiki-rebuild-actions">
          <button
            type="button"
            className="outline wiki-rebuild-clear-button"
            onClick={handleClearHistory}
            disabled={clearDisabled}
            title="Clears completed and failed rebuild job cards. Running or queued jobs are kept for safety."
          >
            {clearing ? 'Clearing…' : 'Clear History'}
          </button>

          <div className="wiki-action-with-help">
            <button
              type="button"
              className="purple"
              onClick={handleStartRebuild}
              disabled={running}
            >
              {running ? 'Starting…' : 'Start Async Rebuild'}
            </button>
            <span
              className="wiki-help-icon"
              tabIndex={0}
              aria-label="Start Async Rebuild help"
              data-tooltip="Runs the Wiki rebuild in the background. It checks changed files, updates affected Wiki pages, preserves unchanged pages, and shows progress without blocking the interface."
            >
              i
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="wiki-rebuild-error">{error}</div>
      ) : null}

      <div className="wiki-rebuild-summary-grid">
        <div className="wiki-rebuild-summary-card">
          <strong>{jobs.length}</strong>
          <span>Total Jobs</span>
        </div>

        <div className="wiki-rebuild-summary-card">
          <strong>{activeJobs.length}</strong>
          <span>Active Jobs</span>
        </div>
      </div>

      <WikiDiagnosticsPanel options={options} />

      {loading ? (
        <div className="wiki-rebuild-loading">Loading rebuild jobs…</div>
      ) : (
        <div className="wiki-rebuild-job-list">
          {jobs.map((job) => (
            <article
              key={job.id}
              className={`wiki-rebuild-job wiki-job-${job.status}`}
            >
              <div className="wiki-rebuild-job-top">
                <div>
                  <strong>{job.stage || 'queued'}</strong>
                  <div className="wiki-rebuild-job-id">{job.id}</div>
                </div>

                <span className={`wiki-job-status wiki-job-status-${job.status}`}>
                  {job.status}
                </span>
              </div>

              <div className="wiki-rebuild-progress-track">
                <div
                  className="wiki-rebuild-progress-bar"
                  style={{ width: `${job.progress_percent || 0}%` }}
                />
              </div>

              <div className="wiki-rebuild-progress-text">
                {job.progress_percent || 0}%
              </div>

              <div className="wiki-rebuild-meta-grid">
                <div>
                  <span>Created</span>
                  <strong>{formatTimestamp(job.created_at)}</strong>
                </div>

                <div>
                  <span>Updated</span>
                  <strong>{formatTimestamp(job.updated_at)}</strong>
                </div>
              </div>
            </article>
          ))}

          {!jobs.length ? (
            <div className="wiki-rebuild-empty">
              No rebuild jobs have been executed yet.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
