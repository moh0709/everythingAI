import { useEffect, useState } from 'react';
import type { ApiOptions } from '../api';
import {
  fetchWikiHumanValidation,
  type WikiHumanValidation,
  type WikiQualitySummary,
} from './wikiJobsApi';

type HumanValidationReadOnlyCardProps = {
  options: ApiOptions;
  page?: WikiQualitySummary;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusClass(status?: string) {
  if (status === 'approved') return 'wiki-quality-good';
  if (status === 'needs_attention' || status === 'rejected') return 'wiki-quality-danger';
  return 'wiki-quality-warning';
}

export function HumanValidationReadOnlyCard({ options, page }: HumanValidationReadOnlyCardProps) {
  const [validation, setValidation] = useState<WikiHumanValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadValidation() {
      if (!page?.page_id) {
        setValidation(null);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetchWikiHumanValidation(options, page.page_id);
        if (active) setValidation(response.validation);
      } catch (err) {
        if (active) {
          setValidation(null);
          setError(err instanceof Error ? err.message : 'Failed to load human validation');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadValidation();

    return () => {
      active = false;
    };
  }, [options, page?.page_id]);

  return (
    <article className="wiki-diagnostics-card">
      <div className="wiki-diagnostics-card-title">
        <strong>Human Validation</strong>
        <span>Read-only page review state</span>
      </div>

      {!page ? (
        <div className="wiki-diagnostics-empty">No Wiki page selected for human validation display.</div>
      ) : null}

      {page ? (
        <>
          <div className="wiki-diagnostics-mini-grid">
            <div><span>Page</span><strong>{page.title}</strong></div>
            <div><span>Status</span><strong className={`wiki-quality-grade ${statusClass(validation?.status)}`}>{loading ? 'loading' : validation?.status || 'unreviewed'}</strong></div>
            <div><span>Reviewer</span><strong>{validation?.reviewed_by || '—'}</strong></div>
            <div><span>Reviewed</span><strong>{formatTimestamp(validation?.reviewed_at)}</strong></div>
          </div>
          <div className="wiki-diagnostics-detail wiki-diagnostics-detail-static">
            <p><b>Notes:</b> {validation?.notes || '—'}</p>
            <ul className="wiki-diagnostics-reasons">
              <li>This card is display-only.</li>
              <li>No approval or review write action is available here yet.</li>
              <li>Human validation is planned as the strongest governance signal.</li>
            </ul>
            {error ? <div className="wiki-diagnostics-empty">{error}</div> : null}
          </div>
        </>
      ) : null}
    </article>
  );
}
