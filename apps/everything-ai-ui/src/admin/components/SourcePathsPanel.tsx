import { FolderOpen } from 'lucide-react';
import type { SourcePathRecord } from '../../sourcePathsApi';

type SourcePathsPanelProps = {
  sourcePaths: SourcePathRecord[];
  rescanSource: (source: SourcePathRecord) => void;
  pauseSource: (source: SourcePathRecord) => void;
  resumeSource: (source: SourcePathRecord) => void;
  removeSource: (source: SourcePathRecord) => void;
};

export function SourcePathsPanel({
  sourcePaths,
  rescanSource,
  pauseSource,
  resumeSource,
  removeSource,
}: SourcePathsPanelProps) {
  return <section className="panel source-panel">
    <div className="panel-title">
      <div>
        <h2><FolderOpen /> Source Paths</h2>
        <p>Backend-persisted folders inside EverythingAI scope.</p>
      </div>
      <span className="scope-pill">{sourcePaths.length} scoped path(s)</span>
    </div>

    {!sourcePaths.length ? <div className="empty-source">No source paths added yet.</div> : <div className="source-list">
      {sourcePaths.map((source) => <article className="source-card" key={source.id}>
        <div>
          <strong>{source.path}</strong>
          <p>
            Status: <b>{source.status}</b> • Surveillance: <b>{source.watching ? 'On' : 'Off'}</b>
            {source.lastRun ? ` • Last run: ${new Date(source.lastRun).toLocaleString()}` : ''}
          </p>
          {source.error && <p className="source-error">{source.error}</p>}
        </div>
        <div className="button-row">
          <button className="outline" onClick={() => rescanSource(source)}>Re-scan</button>
          {source.watching
            ? <button className="outline" onClick={() => pauseSource(source)}>Pause</button>
            : <button className="outline" onClick={() => resumeSource(source)}>Resume</button>}
          <button className="outline danger" onClick={() => removeSource(source)}>Remove</button>
        </div>
      </article>)}
    </div>}
  </section>;
}

export default SourcePathsPanel;
