import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Brain, CheckCircle, FolderOpen, Search, Settings, Upload, Zap } from 'lucide-react';
import { apiRequest, ApiOptions, AppStatus, IndexedFile, Suggestion } from './api';
import { addSourcePath, listSourcePaths, pauseSourcePath, resumeSourcePath, SourcePathRecord } from './sourcePathsApi';

type Section = 'dashboard' | 'explorer' | 'planning' | 'analytics' | 'settings';
type SourcePath = SourcePathRecord;

const DEFAULT_API = 'http://127.0.0.1:4100';
const DEFAULT_TOKEN = 'replace-with-your-local-development-token';

function formatSize(bytes = 0) {
  if (!bytes) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [folderPath, setFolderPath] = useState(localStorage.getItem('everythingai.ui.folderPath') || '');
  const [sourcePaths, setSourcePaths] = useState<SourcePath[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready for AI Analysis');
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<any[]>([]);

  const options: ApiOptions = useMemo(() => ({ baseUrl, token }), [baseUrl, token]);
  const selectedFile = files.find((file) => file.id === selectedFileId) || files[0];
  const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || 0), 0);
  const fileTypes = files.reduce<Record<string, number>>((acc, file) => {
    const ext = file.extension || 'file';
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage(label);
    try {
      await task();
    } catch (err: any) {
      setError(err.message || String(err));
      setMessage('Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    await run('Refreshing EverythingAI state...', async () => {
      const statusPayload = await apiRequest<{ status: AppStatus }>(options, '/api/status');
      const filesPayload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      const suggestionsPayload = await apiRequest<{ suggestions: Suggestion[] }>(options, '/api/suggestions?limit=250');
      const sourcePayload = await listSourcePaths(options);
      setStatus(statusPayload.status);
      setFiles(filesPayload.files || []);
      setSuggestions(suggestionsPayload.suggestions || []);
      setSourcePaths(sourcePayload.sources || []);
      setMessage('EverythingAI is ready');
    });
  }

  async function consumeSourcePath(pathToConsume: string, watch = true) {
    await run('EverythingAI is consuming the selected source path...', async () => {
      const payload = await addSourcePath(options, pathToConsume, watch);
      setSourcePaths(payload.sources || []);
      const statusPayload = await apiRequest<{ status: AppStatus }>(options, '/api/status');
      const filesPayload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      const suggestionsPayload = await apiRequest<{ suggestions: Suggestion[] }>(options, '/api/suggestions?limit=250');
      setStatus(statusPayload.status);
      setFiles(filesPayload.files || []);
      setSuggestions(suggestionsPayload.suggestions || []);
      setSection('planning');
      setMessage('Source path is now persisted in backend scope. Knowledge consumption is automatic.');
    });
  }

  async function selectFolder() {
    await run('Opening folder picker...', async () => {
      const result = await apiRequest<{ folderPath?: string; cancelled?: boolean }>(options, '/api/select-folder', {}, 'POST');
      if (result.folderPath) {
        setFolderPath(result.folderPath);
        localStorage.setItem('everythingai.ui.folderPath', result.folderPath);
        await consumeSourcePath(result.folderPath, true);
      }
    });
  }

  async function addTypedSourcePath() {
    const normalized = folderPath.trim();
    if (!normalized) {
      setError('Enter a folder path first.');
      return;
    }
    await consumeSourcePath(normalized, true);
  }

  async function rescanSource(source: SourcePath) {
    await consumeSourcePath(source.path, source.watching);
  }

  async function pauseSource(source: SourcePath) {
    await run('Pausing source surveillance...', async () => {
      const payload = await pauseSourcePath(options, source.path);
      setSourcePaths(payload.sources || []);
      setMessage('Source surveillance paused. The backend scope record remains persistent.');
    });
  }

  async function resumeSource(source: SourcePath) {
    await run('Resuming source surveillance...', async () => {
      const payload = await resumeSourcePath(options, source.path);
      setSourcePaths(payload.sources || []);
      await refreshAll();
      setMessage('Source surveillance resumed.');
    });
  }

  async function removeSource(source: SourcePath) {
    const approved = window.confirm(`Remove this source path from EverythingAI scope?\n\n${source.path}\n\nExisting indexed knowledge is not deleted in this MVP.`);
    if (!approved) return;

    await run('Removing source path from backend scope...', async () => {
      const payload = await apiRequest<{ sources: SourcePath[] }>(options, '/api/source-paths', { folderPath: source.path }, 'DELETE');
      setSourcePaths(payload.sources || []);
      setMessage('Source path removed from backend scope. Existing indexed records remain until cleanup is implemented.');
    });
  }

  async function deepAnalysis() {
    await run('Running deep AI analysis...', async () => {
      await apiRequest(options, '/api/extract', {}, 'POST');
      await apiRequest(options, '/api/embeddings', { limit: 1000 }, 'POST');
      await apiRequest(options, '/api/insights', { limit: 100, useOllama: false }, 'POST');
      await refreshAll();
      setMessage('Deep analysis complete');
    });
  }

  async function searchEverything() {
    await run('Searching EverythingAI...', async () => {
      if (!query.trim()) return;
      const payload = await apiRequest<any>(options, `/api/unified-search?q=${encodeURIComponent(query)}&limit=50`);
      setFiles(payload.files || []);
      setSuggestions(payload.suggestions || []);
      setSection('explorer');
      setMessage(`Search complete for ${query}`);
    });
  }

  async function previewAndExecute(suggestion: Suggestion) {
    await run('Creating safe preview...', async () => {
      const previewPayload = await apiRequest<any>(options, '/api/action-previews', { suggestionId: suggestion.id }, 'POST');
      const preview = previewPayload.preview;
      if (preview.preview_status !== 'ready') {
        setMessage(`Preview blocked: ${preview.blocked_reason || 'not executable'}`);
        return;
      }
      const approved = window.confirm(`Execute ${preview.action_type}?\n\nTarget: ${preview.target_path || preview.suggested_value}\n\nThis action is audited and requires your approval.`);
      if (!approved) return;
      await apiRequest(options, '/api/action-executions', { previewId: preview.id, approve: true }, 'POST');
      await refreshAll();
      setMessage('Approved action executed safely');
    });
  }

  async function loadAudit() {
    await run('Loading analytics...', async () => {
      const payload = await apiRequest<any>(options, '/api/audit-log?limit=100');
      setAudit(payload.events || []);
      setSection('analytics');
    });
  }

  function saveSettings() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    localStorage.setItem('everythingai.ui.folderPath', folderPath);
    setMessage('Settings saved');
  }

  useEffect(() => { refreshAll().catch(() => undefined); }, []);

  return <div className="app">
    <Header section={section} setSection={setSection} loadAudit={loadAudit} />
    <main className="page">
      <div className="hero-row">
        <div><h1><Brain /> AI File Intelligence Center</h1><p>Advanced AI-powered file analysis, organization, and management platform</p></div>
        <div className="hero-actions"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Explore" /></div><button className="purple" onClick={searchEverything}>Explore</button><button className="purple" onClick={() => setSection('planning')}>Start Planning</button><button className="toggle"><Zap size={16} /></button><button className="outline" onClick={loadAudit}>Advanced Stats</button></div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : message}</div>
      {section === 'dashboard' && <Dashboard files={files} status={status} totalSize={totalSize} fileTypes={fileTypes} folderPath={folderPath} setFolderPath={setFolderPath} selectFolder={selectFolder} addTypedSourcePath={addTypedSourcePath} deepAnalysis={deepAnalysis} setSection={setSection} busy={busy} sourcePaths={sourcePaths} rescanSource={rescanSource} pauseSource={pauseSource} resumeSource={resumeSource} removeSource={removeSource} />}
      {section === 'explorer' && <Explorer files={files} selectedFile={selectedFile} setSelectedFileId={setSelectedFileId} query={query} setQuery={setQuery} searchEverything={searchEverything} />}
      {section === 'planning' && <Planning files={files} suggestions={suggestions} previewAndExecute={previewAndExecute} deepAnalysis={deepAnalysis} busy={busy} />}
      {section === 'analytics' && <Analytics status={status} audit={audit} />}
      {section === 'settings' && <SettingsView baseUrl={baseUrl} setBaseUrl={setBaseUrl} token={token} setToken={setToken} folderPath={folderPath} setFolderPath={setFolderPath} saveSettings={saveSettings} sourcePaths={sourcePaths} />}
    </main>
  </div>;
}

function Header({ section, setSection, loadAudit }: any) {
  const items: Section[] = ['dashboard', 'explorer', 'planning', 'analytics', 'settings'];
  return <header className="top-nav"><div className="brand"><FolderOpen size={28} /><strong>EverythingAI</strong></div><nav>{items.map((item) => <button key={item} className={section === item ? 'active' : ''} onClick={() => item === 'analytics' ? loadAudit() : setSection(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="provider-pill"><span />Using Ollama</div></header>;
}

function Dashboard(props: any) {
  const { files, totalSize, fileTypes, folderPath, setFolderPath, selectFolder, addTypedSourcePath, deepAnalysis, setSection, busy, sourcePaths, rescanSource, pauseSource, resumeSource, removeSource } = props;
  return <><section className="processing-card"><div className="hub-head"><div><h2><Brain /> AI File Processing Hub</h2><p>Intelligent content analysis • Pattern recognition • Smart organization</p></div><div className="button-row"><button className="outline" onClick={selectFolder}><Upload size={16} /> Add Folder</button><button className="outline purple-border" onClick={addTypedSourcePath}>Add Path</button></div></div><div className="drop-zone" onClick={selectFolder}><Upload size={44} /><h3>Add folders to EverythingAI Scope</h3><p>EverythingAI automatically indexes, extracts, embeds, analyzes, and plans from every backend-persisted source path.</p><div className="mini-tags"><span>Documents</span><span>Folders</span><span>Automatic Knowledge</span><span>Persistent Scope</span></div></div><div className="path-row"><input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} placeholder="C:\\path\\to\\folder" /><button onClick={addTypedSourcePath} disabled={busy}>Add to Scope</button></div></section><SourcePathsPanel sourcePaths={sourcePaths} rescanSource={rescanSource} pauseSource={pauseSource} resumeSource={resumeSource} removeSource={removeSource} />{!files.length ? <section className="empty-card"><div className="big-icon"><FolderOpen /></div><h2>AI File Organization Ready</h2><p>Add source paths and EverythingAI will automatically consume the knowledge inside them.</p></section> : <><section className="stats-grid"><Stat title="Total Files" value={files.length} /><Stat title="Total Size" value={formatSize(totalSize)} /><Stat title="File Categories" value={Object.keys(fileTypes).length} /><Stat title="AI Confidence" value="100%" /></section><section className="two-col"><div className="panel"><h3>File Types Distribution</h3>{Object.entries(fileTypes).map(([key, value]) => <div className="bar" key={key}><span>{key}</span><div><b style={{ width: `${Math.min(100, Number(value) * 20)}%` }} /></div><small>{String(value)} files</small></div>)}</div><div className="panel"><h3>Largest Files</h3>{files.slice().sort((a: IndexedFile, b: IndexedFile) => (b.size_bytes || 0) - (a.size_bytes || 0)).slice(0, 5).map((file: IndexedFile) => <div className="file-line" key={file.id}><div><strong>{file.filename}</strong><small>{file.absolute_path}</small></div><span>{formatSize(file.size_bytes)}</span></div>)}</div></section><section className="success-card"><CheckCircle /><div><h2>AI Analysis Complete</h2><p>{files.length} files have been processed from the active source scope. EverythingAI will keep consuming watched folders automatically.</p><div className="button-row"><button className="outline" onClick={() => setSection('explorer')}>Explore Files</button><button onClick={() => setSection('planning')}>Start Planning</button><button className="outline" onClick={deepAnalysis}>Deep Analysis</button></div></div></section></>}</>;
}

function SourcePathsPanel({ sourcePaths, rescanSource, pauseSource, resumeSource, removeSource }: any) {
  return <section className="panel source-panel"><div className="panel-title"><div><h2><FolderOpen /> Source Paths</h2><p>Backend-persisted folders inside EverythingAI scope. Knowledge consumption is automatic for these paths.</p></div><span className="scope-pill">{sourcePaths.length} scoped path(s)</span></div>{!sourcePaths.length ? <div className="empty-source">No source paths added yet. Add a folder above to start automatic knowledge consumption.</div> : <div className="source-list">{sourcePaths.map((source: SourcePath) => <article className="source-card" key={source.id}><div><strong>{source.path}</strong><p>Status: <b>{source.status}</b> • Surveillance: <b>{source.watching ? 'On' : 'Off'}</b>{source.lastRun ? ` • Last run: ${new Date(source.lastRun).toLocaleString()}` : ''}</p>{source.error && <p className="source-error">{source.error}</p>}</div><div className="button-row"><button className="outline" onClick={() => rescanSource(source)}>Re-scan</button>{source.watching ? <button className="outline" onClick={() => pauseSource(source)}>Pause</button> : <button className="outline" onClick={() => resumeSource(source)}>Resume</button>}<button className="outline danger" onClick={() => removeSource(source)}>Remove</button></div></article>)}</div>}</section>;
}

function Explorer({ files, selectedFile, setSelectedFileId, query, setQuery, searchEverything }: any) { return <section><div className="explorer-search"><input value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Search files by name, path, or tags..." /><button onClick={searchEverything}>Search</button><button className="outline">Filters</button></div><div className="chips"><span className="chip dark">All</span><span className="chip mint">Document</span><span className="chip blue">Spreadsheet</span><span className="chip orange">Presentation</span><span className="chip purple">Image</span></div><div className="explorer-grid"><table><thead><tr><th>Name</th><th>Path</th><th>Type</th><th>Size</th><th>Last Modified</th></tr></thead><tbody>{files.map((file: IndexedFile) => <tr key={file.id} onClick={() => setSelectedFileId(file.id)} className={selectedFile?.id === file.id ? 'selected' : ''}><td>{file.filename}</td><td>{file.absolute_path}</td><td><span className="chip blue">{file.extension || 'file'}</span></td><td>{formatSize(file.size_bytes)}</td><td>{file.modified_at ? new Date(file.modified_at).toLocaleDateString() : '-'}</td></tr>)}</tbody></table><aside className="details"><h2>{selectedFile?.filename || 'Select a file'}</h2>{selectedFile && <><p><strong>Path:</strong> {selectedFile.absolute_path}</p><p><strong>Type:</strong> {selectedFile.extension}</p><p><strong>Size:</strong> {formatSize(selectedFile.size_bytes)}</p><h3>Tags</h3><div className="chips"><span className="chip blue">processed</span><span className="chip mint">document</span></div><h3>Content Preview</h3><div className="preview-box">Select preview in future detail mode.</div></>}</aside></div></section>; }

function Planning({ files, suggestions, previewAndExecute, deepAnalysis, busy }: any) { return <section><div className="planning-head"><div><h1><Brain /> AI Planning Center</h1><p>Intelligent file organization powered by automatic source-path knowledge consumption</p></div><div className="button-row"><button className="outline">AI Settings</button><button className="purple" onClick={deepAnalysis} disabled={busy}>AI Analyze</button><button className="outline">Dry Run Preview</button><button onClick={() => suggestions[0] && previewAndExecute(suggestions[0])}>Execute Plan</button></div></div><div className="destination"><strong>Destination Folder</strong><input defaultValue="/Documents/Organized" /></div><div className="analysis-card"><h2><Brain /> AI Analysis Ready</h2><p>Processing {files.length} files with content analysis, pattern recognition, and business context understanding...</p><div className="progress"><span style={{ width: files.length ? '100%' : '40%' }} /></div><div className="process-tags"><span>Content Analysis</span><span>Pattern Recognition</span><span>Business Context</span><span>Structure Generation</span></div></div><div className="planning-grid"><div className="panel"><h3>AI Plan Summary</h3><p>Files analyzed: <b>{files.length}</b></p><p>Actions suggested: <b>{suggestions.length}</b></p><p>Strategy: <b>AI Content Analysis</b></p></div><div className="panel"><h3>Folder Structure</h3>{suggestions.slice(0, 12).map((s: Suggestion) => <div className="suggestion-line" key={s.id}><span>{s.suggested_value}</span><button onClick={() => previewAndExecute(s)}>Preview</button></div>)}</div><div className="panel assistant"><h3>AI Organization Assistant</h3><p>I automatically consume knowledge from backend-persisted scoped folders. You only approve safe file actions.</p></div></div></section>; }

function Analytics({ status, audit }: any) { return <section><h1><BarChart3 /> Logging & Analytics Dashboard</h1><section className="stats-grid"><Stat title="Total Logs" value={audit.length} /><Stat title="Errors" value={audit.filter((e: any) => String(e.event_type).includes('failed')).length} /><Stat title="Actions" value={status?.executions || 0} /><Stat title="Active Watchers" value={status?.active_watch_roots || 0} /></section><div className="panel"><h2>Log Entries</h2><table><thead><tr><th>Timestamp</th><th>Category</th><th>Message</th></tr></thead><tbody>{audit.map((event: any) => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString()}</td><td>{event.entity_type}</td><td>{event.event_type}</td></tr>)}</tbody></table></div></section>; }

function SettingsView({ baseUrl, setBaseUrl, token, setToken, folderPath, setFolderPath, saveSettings, sourcePaths }: any) { return <section><h1><Settings /> Advanced Settings</h1><div className="panel"><h2><Brain /> AI Provider Configuration</h2><div className="warning">Remote AI providers are disabled until a secure server-side proxy is added.</div><div className="provider-card"><Brain /> <div><strong>Local Ollama</strong><small>Run models locally • Private & Secure</small></div></div></div><div className="panel settings-grid"><label>API Endpoint URL<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></label><label>API Token<input value={token} onChange={(e) => setToken(e.target.value)} type="password" /></label><label>Default Folder Path<input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} /></label><label>Backend Source Paths<input value={`${sourcePaths.length} source path(s)`} readOnly /></label></div><div className="panel"><h2>Security & Privacy Settings</h2><div className="security-row red">Encrypt Sensitive Data <span>On</span></div><div className="security-row yellow">Require Confirmation <span>On</span></div><div className="security-row blue">Audit Trail <span>On</span></div><button onClick={saveSettings}>Save Settings</button></div></section>; }

function Stat({ title, value }: { title: string; value: any }) { return <div className="stat"><span>{title}</span><strong>{value}</strong></div>; }
