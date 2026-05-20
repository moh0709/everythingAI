import React from 'react';
import { FileText, Search, Server } from 'lucide-react';
import { formatSize } from './userUtils';
import type { DocumentContext } from './types';
import type { IndexedFile } from '../api';

type ExploreViewProps = {
  error: string;
  busy: boolean;
  status: string;
  baseUrl: string;
  setBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  token: string;
  setToken: React.Dispatch<React.SetStateAction<string>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  files: IndexedFile[];
  selectedFile: IndexedFile | undefined;
  documentContext: DocumentContext | null;
  refreshFiles: () => void;
  searchEverything: () => void;
  handleAskFromHero: () => void;
  loadDocumentContext: (fileId: string) => void;
  saveConnection: () => void;
};

export function ExploreView({
  error, busy, status, baseUrl, setBaseUrl, token, setToken,
  query, setQuery, files, selectedFile, documentContext,
  refreshFiles, searchEverything, handleAskFromHero, loadDocumentContext, saveConnection,
}: ExploreViewProps) {
  return <>
    <section className="hero-row">
      <div>
        <h1><Search /> Explore your indexed knowledge</h1>
        <p>Search, ask questions, and inspect source-backed file context. Planning, moving, recovery, and audit controls are reserved for the admin/operator interface.</p>
      </div>
      <div className="hero-actions">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') searchEverything(); }}
            placeholder="Search or ask about your files..."
          />
        </div>
        <button className="purple" onClick={searchEverything} disabled={busy}>Search</button>
        <button className="outline" onClick={handleAskFromHero} disabled={busy}>Ask AI</button>
      </div>
    </section>

    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="panel">
      <div className="panel-title">
        <div>
          <h2><Server /> Connection</h2>
          <p>Official user UI runs on port 5151. Backend API stays on port 4100.</p>
        </div>
        <button className="outline" onClick={saveConnection}>Save</button>
      </div>
      <div className="settings-help-grid">
        <div>
          <strong>Use the local defaults</strong>
          <p>For normal local development, keep API Base URL pointed at <code>localhost:4100</code>.</p>
        </div>
        <div>
          <strong>Token field</strong>
          <p>Only change the token if the backend token was changed. Saving stores it in this browser only.</p>
        </div>
      </div>
      <div className="settings-grid">
        <label>API Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>
        <label>API Token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label>
      </div>
    </section>

    <section className="explorer-grid">
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2><FileText /> Files</h2>
            <p>{files.length} visible file(s). This UI only reads and searches indexed knowledge.</p>
          </div>
          <button className="outline" onClick={refreshFiles} disabled={busy}>Refresh</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th></tr></thead>
          <tbody>{files.map((file) => <tr key={file.id} onClick={() => loadDocumentContext(file.id)} className={selectedFile?.id === file.id ? 'selected' : ''}>
            <td>{file.filename}</td>
            <td><span className="chip blue">{file.extension || 'file'}</span></td>
            <td>{formatSize(file.size_bytes)}</td>
            <td>{file.extraction_status || file.index_status || 'indexed'}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <aside className="details">
        <h2>{documentContext?.file?.filename || selectedFile?.filename || 'Select a file'}</h2>
        {documentContext ? <>
          <p><strong>Path:</strong> {documentContext.file?.absolute_path}</p>
          <p><strong>Recovery:</strong> {(documentContext.file as any)?.recovery_status || 'active'}</p>
          <p><strong>Extraction:</strong> {documentContext.file?.extraction_status || 'unknown'}</p>
          <p><strong>Source:</strong> {documentContext.source_reference?.source_label || documentContext.source_reference?.relative_path || 'local file'}</p>
          {documentContext.insight?.summary && <><h3>Insight</h3><p>{documentContext.insight.summary}</p></>}
          <h3>Preview Text</h3>
          <div className="preview-box text-preview">{documentContext.previewText || 'No preview text available.'}</div>
        </> : <p>Select a file to inspect source-backed context.</p>}
      </aside>
    </section>
  </>;
}
