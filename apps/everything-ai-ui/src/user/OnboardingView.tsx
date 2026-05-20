import React from 'react';
import { CheckCircle2, FolderOpen, Server, Sparkles } from 'lucide-react';
import type { SetupStep } from './types';
import './localSettingsHelp.css';

type OnboardingViewProps = {
  error: string;
  busy: boolean;
  status: string;
  setupSteps: SetupStep[];
  folderPath: string;
  setFolderPath: React.Dispatch<React.SetStateAction<string>>;
  baseUrl: string;
  setBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  token: string;
  setToken: React.Dispatch<React.SetStateAction<string>>;
  selectFolder: () => void;
  buildKnowledgeWorkspace: (pathOverride?: string) => void;
  saveConnection: () => void;
};

export function OnboardingView({
  error, busy, status, setupSteps, folderPath, setFolderPath,
  baseUrl, setBaseUrl, token, setToken,
  selectFolder, buildKnowledgeWorkspace, saveConnection,
}: OnboardingViewProps) {
  return <>
    <section className="hero-row">
      <div>
        <h1><FolderOpen /> Connect your local knowledge</h1>
        <p>Select a folder and EverythingAI will index, extract, analyze, and prepare it for search, wiki pages, and chat. This user UI remains read-only and safe.</p>
      </div>
      <div className="hero-actions">
        <button className="purple" onClick={selectFolder} disabled={busy}><FolderOpen size={16} /> Select Folder</button>
        <button className="outline" onClick={() => buildKnowledgeWorkspace()} disabled={busy || !folderPath.trim()}><Sparkles size={16} /> Build Knowledge</button>
      </div>
    </section>

    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="panel">
      <div className="panel-title">
        <div>
          <h2><CheckCircle2 /> Setup Progress</h2>
          <p>After setup, you can search files, read wiki pages, and ask source-backed questions.</p>
        </div>
      </div>
      <div className="source-list compact-source-list">
        {setupSteps.map((step) => <div className="source-card" key={step.id}>
          <strong>{step.label}</strong>
          <p>{step.status === 'done' ? 'Completed' : step.status === 'working' ? 'Working...' : step.status === 'failed' ? 'Failed' : 'Waiting'}</p>
        </div>)}
      </div>
    </section>

    <section className="panel">
      <div className="panel-title">
        <div>
          <h2><Server /> Connection & Folder</h2>
          <p>Use defaults for local development, or adjust if your backend runs elsewhere.</p>
        </div>
        <button className="outline" onClick={saveConnection}>Save</button>
      </div>
      <div className="settings-help-grid">
        <div>
          <strong>Local ports</strong>
          <p>User UI runs on <code>localhost:5151</code>. Backend API runs on <code>localhost:4100</code>.</p>
        </div>
        <div>
          <strong>Safe user mode</strong>
          <p>This screen builds the read/search/Wiki workspace. File move and rename execution stay outside the user reading flow.</p>
        </div>
        <div>
          <strong>Folder path</strong>
          <p>Use Select Folder when possible. Manual paths should point to the local folder you want indexed.</p>
        </div>
      </div>
      <div className="settings-grid">
        <label>API Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>
        <label>API Token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label>
        <label>Folder Path<input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder="Local folder path" /></label>
      </div>
    </section>
  </>;
}
