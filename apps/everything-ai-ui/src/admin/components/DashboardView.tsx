import { Brain, CheckCircle, FolderOpen, Upload } from 'lucide-react';
import type { IndexedFile, Suggestion } from '../../api';
import type { SourcePathRecord } from '../../sourcePathsApi';
import { averageConfidence, formatSize } from '../utils/format';
import type { AdminSection } from '../types';
import { SourcePathsPanel } from './SourcePathsPanel';
import { StatCard } from './StatCard';

type DashboardViewProps = {
  files: IndexedFile[];
  suggestions: Suggestion[];
  totalSize: number;
  fileTypes: Record<string, number>;
  folderPath: string;
  setFolderPath: (value: string) => void;
  selectFolder: () => void;
  addTypedSourcePath: () => void;
  deepAnalysis: () => void;
  setSection: (section: AdminSection) => void;
  busy: boolean;
  sourcePaths: SourcePathRecord[];
  rescanSource: (source: SourcePathRecord) => void;
  pauseSource: (source: SourcePathRecord) => void;
  resumeSource: (source: SourcePathRecord) => void;
  removeSource: (source: SourcePathRecord) => void;
};

export function DashboardView({
  files,
  suggestions,
  totalSize,
  fileTypes,
  folderPath,
  setFolderPath,
  selectFolder,
  addTypedSourcePath,
  deepAnalysis,
  setSection,
  busy,
  sourcePaths,
  rescanSource,
  pauseSource,
  resumeSource,
  removeSource,
}: DashboardViewProps) {
  return <>
    <section className="processing-card">
      <div className="hub-head">
        <div>
          <h2><Brain /> AI File Processing Hub</h2>
          <p>Intelligent content analysis • Pattern recognition • Smart organization</p>
        </div>
        <div className="button-row">
          <button className="outline" onClick={selectFolder}><Upload size={16} /> Add Folder</button>
          <button className="outline purple-border" onClick={addTypedSourcePath}>Add Path</button>
        </div>
      </div>
      <div className="drop-zone" onClick={selectFolder}>
        <Upload size={44} />
        <h3>Add folders to EverythingAI Scope</h3>
        <p>EverythingAI automatically indexes, extracts, embeds, analyzes, and plans from every backend-persisted source path.</p>
        <div className="mini-tags"><span>Documents</span><span>Folders</span><span>Automatic Knowledge</span><span>Persistent Scope</span></div>
      </div>
      <div className="path-row">
        <input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder="C:\\path\\to\\folder" />
        <button onClick={addTypedSourcePath} disabled={busy}>Add to Scope</button>
      </div>
    </section>

    <SourcePathsPanel
      sourcePaths={sourcePaths}
      rescanSource={rescanSource}
      pauseSource={pauseSource}
      resumeSource={resumeSource}
      removeSource={removeSource}
    />

    {!files.length ? <section className="empty-card">
      <div className="big-icon"><FolderOpen /></div>
      <h2>AI File Organization Ready</h2>
      <p>Add source paths and EverythingAI will automatically consume the knowledge inside them.</p>
    </section> : <>
      <section className="stats-grid">
        <StatCard title="Total Files" value={files.length} />
        <StatCard title="Total Size" value={formatSize(totalSize)} />
        <StatCard title="File Categories" value={Object.keys(fileTypes).length} />
        <StatCard title="AI Confidence" value={averageConfidence(suggestions)} />
      </section>

      <section className="two-col">
        <div className="panel">
          <h3>File Types Distribution</h3>
          {Object.entries(fileTypes).map(([key, value]) => <div className="bar" key={key}>
            <span>{key}</span>
            <div><b style={{ width: `${Math.min(100, Number(value) * 20)}%` }} /></div>
            <small>{String(value)} files</small>
          </div>)}
        </div>
        <div className="panel">
          <h3>Largest Files</h3>
          {files
            .slice()
            .sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0))
            .slice(0, 5)
            .map((file) => <div className="file-line" key={file.id}>
              <div><strong>{file.filename}</strong><small>{file.absolute_path}</small></div>
              <span>{formatSize(file.size_bytes)}</span>
            </div>)}
        </div>
      </section>

      <section className="success-card">
        <CheckCircle />
        <div>
          <h2>AI Analysis Complete</h2>
          <p>{files.length} files have been processed from the active source scope.</p>
          <div className="button-row">
            <button className="outline" onClick={() => setSection('explorer')}>Explore Files</button>
            <button onClick={() => setSection('planning')}>Start Planning</button>
            <button className="outline" onClick={deepAnalysis}>Deep Analysis</button>
          </div>
        </div>
      </section>
    </>}
  </>;
}

export default DashboardView;
