import React from 'react';
import { FileText, Search, Server } from 'lucide-react';
import { formatSize } from './userUtils';
import type { DocumentContext } from './types';
import type { IndexedFile } from '../api';
import { ExtractedTextPreview } from '../shared/ExtractedTextPreview';
import './localSettingsHelp.css';

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
        <span className="chip blue">CLIENT SOURCES & FILE CONTENT</span>
        <h1><Search /> Sources & Files</h1>
        <p>This page is for exploring indexed files, extracted file text, and source context. The Knowledge Base is separate: it is the saved database of organized knowledge generated from these files.</p>
      </div>
      <div className="hero-actions">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') searchEverything(); }}
            placeholder="Search filenames, paths, or extracted file content..."
          />
        </div>
        <button className="purple" onClick={searchEverything} disabled={busy}>Search Files</button>
        <button className="outline" onClick={handleAskFromHero} disabled={busy}>Ask AI</button>
      </div>
    </section>

    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="panel">
      <div className="panel-title">
        <div>
          <h2><Server /> Connection</h2>
          <p>Official client workspace runs on port 5151. Backend API stays on port 4100.</p>
        </div>
        <button className="outline" onClick={saveConnection}>Save</button>
      </div>
      <div className="settings-help-grid">
        <div>
          <strong>Files vs Knowledge Base</strong>
          <p>Sources & Files shows original indexed files and extracted content. Knowledge Base shows generated, saved knowledge pages built from those sources.</p>
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
            <h2><FileText /> Indexed File List</h2>
            <p>{files.length} visible file(s). Click a file to inspect extracted file content and source metadata.</p>
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
          <p><strong>View type:</strong> File content / source context</p>
          <p><strong>Path:</strong> {documentContext.file?.absolute_path}</p>
          <p><strong>Recovery:</strong> {(documentContext.file as any)?.recovery_status || 'active'}</p>
          <p><strong>Extraction:</strong> {documentContext.file?.extraction_status || 'unknown'}</p>
          <p><strong>Source:</strong> {documentContext.source_reference?.source_label || documentContext.source_reference?.relative_path || 'local file'}</p>
          {documentContext.insight?.summary && <><h3>File Insight</h3><p>{documentContext.insight.summary}</p></>}
          <h3>Extracted File Text</h3>
          <ExtractedTextPreview source={documentContext} fallback="No preview text available." />
        </> : <p>Select a file to inspect extracted file content. To read saved knowledge pages, open Knowledge Base.</p>}
      </aside>
    </section>
  </>;
}
