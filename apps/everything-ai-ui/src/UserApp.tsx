import React, { useEffect, useMemo, useState } from 'react';
import { Brain, FileText, MessageCircle, Search, Server, Shield } from 'lucide-react';
import { apiRequest, ApiOptions, IndexedFile } from './api';

const DEFAULT_API = 'http://127.0.0.1:4100';
const DEFAULT_TOKEN = 'replace-with-your-local-development-token';

type SourceReference = {
  file_id?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  source_type?: string;
  source_label?: string;
};

type DocumentContext = {
  file?: IndexedFile & {
    relative_path?: string;
    recovery_status?: string;
    source_reference?: string;
  };
  previewText?: string;
  insight?: {
    summary?: string;
    classification?: string;
    provider?: string;
  } | null;
  source_reference?: SourceReference;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: Array<{ filename?: string; absolute_path?: string; snippet?: string }>;
};

function formatSize(bytes = 0) {
  if (!bytes) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function UserApp() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const options: ApiOptions = useMemo(() => ({ baseUrl, token }), [baseUrl, token]);
  const selectedFile = files.find((file) => file.id === selectedFileId) || files[0];

  function saveConnection() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    setStatus('Connection settings saved.');
  }

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus(label);
    try {
      await task();
    } catch (err: any) {
      setError(err.message || String(err));
      setStatus('Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function refreshFiles() {
    await run('Loading indexed files...', async () => {
      const payload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      setFiles(payload.files || []);
      if (!selectedFileId && payload.files?.[0]) setSelectedFileId(payload.files[0].id);
      setStatus(`Loaded ${payload.files?.length || 0} file(s).`);
    });
  }

  async function searchEverything() {
    await run('Searching EverythingAI...', async () => {
      const normalized = query.trim();
      if (!normalized) {
        await refreshFiles();
        return;
      }
      const payload = await apiRequest<any>(options, `/api/unified-search?q=${encodeURIComponent(normalized)}&limit=50`);
      setFiles(payload.files || []);
      if (payload.files?.[0]) {
        setSelectedFileId(payload.files[0].id);
        await loadDocumentContext(payload.files[0].id, false);
      }
      setStatus(`Search complete: ${payload.files?.length || 0} file match(es).`);
    });
  }

  async function loadDocumentContext(fileId: string, wrap = true) {
    const task = async () => {
      const payload = await apiRequest<{ document: DocumentContext }>(options, `/api/intelligence/document-context/${fileId}`);
      setSelectedFileId(fileId);
      setDocumentContext(payload.document);
      setStatus(`Context loaded: ${payload.document.file?.filename || fileId}`);
    };

    if (wrap) await run('Loading document context...', task);
    else await task();
  }

  async function askEverything() {
    const question = query.trim();
    if (!question) return;

    await run('Asking indexed sources...', async () => {
      setChatMessages((current) => [...current, { role: 'user', text: question }]);
      const payload = await apiRequest<any>(options, '/api/chat', { question, limit: 5 }, 'POST');
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: payload.answer || 'No answer returned.',
        sources: payload.sources || [],
      }]);
      setStatus(`Answer prepared from ${payload.sources?.length || 0} referenced source(s).`);
    });
  }

  useEffect(() => {
    refreshFiles().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="app">
    <header className="top-nav">
      <div className="brand"><Brain size={28} /><strong>EverythingAI</strong></div>
      <nav>
        <button className="active">Explore</button>
        <button onClick={askEverything}>Ask</button>
      </nav>
      <div className="provider-pill"><span />User MVP • Safe mode</div>
    </header>

    <main className="page">
      <section className="hero-row">
        <div>
          <h1><Search /> Explore your indexed knowledge</h1>
          <p>Search, ask questions, and inspect source-backed file context. Planning, moving, recovery, and audit controls are reserved for the admin/operator interface.</p>
        </div>
        <div className="hero-actions">
          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchEverything(); }} placeholder="Search or ask about your files..." />
          </div>
          <button className="purple" onClick={searchEverything} disabled={busy}>Search</button>
          <button className="outline" onClick={askEverything} disabled={busy}>Ask AI</button>
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

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2><MessageCircle /> Ask EverythingAI</h2>
            <p>Answers are based on indexed local sources. Sources are shown when referenced by the backend.</p>
          </div>
          <Shield className="muted-icon" />
        </div>
        <div className="chat-thread">
          {!chatMessages.length && <div className="empty-source">Ask a question in the search bar above.</div>}
          {chatMessages.map((message, index) => <article key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'EverythingAI' : 'Error'}</strong>
            <p>{message.text}</p>
            {!!message.sources?.length && <div className="source-list compact-source-list">{message.sources.map((source, sourceIndex) => <div key={`${source.filename}-${sourceIndex}`} className="source-card">
              <strong>{source.filename || 'Source'}</strong>
              <p>{source.absolute_path}</p>
              {source.snippet && <small>{source.snippet}</small>}
            </div>)}</div>}
          </article>)}
        </div>
      </section>
    </main>
  </div>;
}
