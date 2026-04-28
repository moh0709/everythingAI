import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Brain, CheckCircle, FileText, FolderOpen, Search, Settings, Upload, Zap } from 'lucide-react';
import { apiRequest, ApiOptions, AppStatus, IndexedFile, Suggestion } from './api';

type Section = 'dashboard' | 'explorer' | 'planning' | 'analytics' | 'settings';

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
      setStatus(statusPayload.status);
      setFiles(filesPayload.files || []);
      setSuggestions(suggestionsPayload.suggestions || []);
      setMessage('EverythingAI is ready');
    });
  }

  async function selectFolder() {
    await run('Opening folder picker...', async () => {
      const result = await apiRequest<{ folderPath?: string; cancelled?: boolean }>(options, '/api/select-folder', {}, 'POST');
      if (result.folderPath) {
        setFolderPath(result.folderPath);
        localStorage.setItem('everythingai.ui.folderPath', result.folderPath);
        await indexFolder(result.folderPath, false);
      }
    });
  }

  async function indexFolder(pathToIndex = folderPath, wrap = true) {
    const task = async () => {
      await apiRequest(options, '/api/index', { folderPath: pathToIndex, auto: true }, 'POST');
      const statusPayload = await apiRequest<{ status: AppStatus }>(options, '/api/status');
      const filesPayload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      const suggestionsPayload = await apiRequest<{ suggestions: Suggestion[] }>(options, '/api/suggestions?limit=250');
      setStatus(statusPayload.status);
      setFiles(filesPayload.files || []);
      setSuggestions(suggestionsPayload.suggestions || []);
      setSection('planning');
      setMessage('AI analysis complete. Organization plan is ready.');
    };
    if (wrap) await run('AI is indexing, extracting, embedding, and planning...', task);
    else await task();
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
      {section === 'dashboard' && <Dashboard files={files} status={status} totalSize={totalSize} fileTypes={fileTypes} folderPath={folderPath} setFolderPath={setFolderPath} selectFolder={selectFolder} indexFolder={() => indexFolder()} deepAnalysis={deepAnalysis} setSection={setSection} busy={busy} />}
      {section === 'explorer' && <Explorer files={files} selectedFile={selectedFile} setSelectedFileId={setSelectedFileId} query={query} setQuery={setQuery} searchEverything={searchEverything} />}
      {section === 'planning' && <Planning files={files} suggestions={suggestions} previewAndExecute={previewAndExecute} deepAnalysis={deepAnalysis} busy={busy} />}
      {section === 'analytics' && <Analytics status={status} audit={audit} />}
      {section === 'settings' && <SettingsView baseUrl={baseUrl} setBaseUrl={setBaseUrl} token={token} setToken={setToken} folderPath={folderPath} setFolderPath={setFolderPath} saveSettings={saveSettings} />}
    </main>
  </div>;
}

function Header({ section, setSection, loadAudit }: any) {
  const items: Section[] = ['dashboard', 'explorer', 'planning', 'analytics', 'settings'];
  return <header className="top-nav"><div className="brand"><FolderOpen size={28} /><strong>EverythingAI</strong></div><nav>{items.map((item) => <button key={item} className={section === item ? 'active' : ''} onClick={() => item === 'analytics' ? loadAudit() : setSection(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="provider-pill"><span />Using Ollama</div></header>;
}

function Dashboard(props: any) {
  const { files, totalSize, fileTypes, folderPath, setFolderPath, selectFolder, indexFolder, deepAnalysis, setSection, busy } = props;
  return <><section className="processing-card"><div className="hub-head"><div><h2><Brain /> AI File Processing Hub</h2><p>Intelligent content analysis • Pattern recognition • Smart organization</p></div><div className="button-row"><button className="outline" onClick={selectFolder}><Upload size={16} /> Upload Folder</button><button className="outline purple-border" onClick={indexFolder}>Add Path</button></div></div><div className="drop-zone" onClick={selectFolder}><Upload size={44} /><h3>Drag & Drop Files/Folders or Click to Browse</h3><p>AI will analyze content, extract metadata, and suggest intelligent organization</p><div className="mini-tags"><span>Documents</span><span>Folders</span><span>AI Analysis</span><span>Secure Processing</span></div></div><div className="path-row"><input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} placeholder="C:\\path\\to\\folder" /><button onClick={indexFolder} disabled={busy}>Analyze Path</button></div></section>{!files.length ? <section className="empty-card"><div className="big-icon"><FolderOpen /></div><h2>AI File Organization Ready</h2><p>Upload your files and folders and let EverythingAI create an intelligent organization system tailored to your workflow.</p></section> : <><section className="stats-grid"><Stat title="Total Files" value={files.length} /><Stat title="Total Size" value={formatSize(totalSize)} /><Stat title="File Categories" value={Object.keys(fileTypes).length} /><Stat title="AI Confidence" value="100%" /></section><section className="two-col"><div className="panel"><h3>File Types Distribution</h3>{Object.entries(fileTypes).map(([key, value]) => <div className="bar" key={key}><span>{key}</span><div><b style={{ width: `${Math.min(100, Number(value) * 20)}%` }} /></div><small>{String(value)} files</small></div>)}</div><div className="panel"><h3>Largest Files</h3>{files.slice().sort((a: IndexedFile, b: IndexedFile) => (b.size_bytes || 0) - (a.size_bytes || 0)).slice(0, 5).map((file: IndexedFile) => <div className="file-line" key={file.id}><div><strong>{file.filename}</strong><small>{file.absolute_path}</small></div><span>{formatSize(file.size_bytes)}</span></div>)}</div></section><section className="success-card"><CheckCircle /><div><h2>AI Analysis Complete</h2><p>{files.length} files have been processed. Content has been analyzed, metadata extracted, patterns identified, and intelligent organization strategies developed.</p><div className="button-row"><button className="outline" onClick={() => setSection('explorer')}>Explore Files</button><button onClick={() => setSection('planning')}>Start Planning</button><button className="outline" onClick={deepAnalysis}>Deep Analysis</button></div></div></section></>}</>;
}

function Explorer({ files, selectedFile, setSelectedFileId, query, setQuery, searchEverything }: any) { return <section><div className="explorer-search"><input value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Search files by name, path, or tags..." /><button onClick={searchEverything}>Search</button><button className="outline">Filters</button></div><div className="chips"><span className="chip dark">All</span><span className="chip mint">Document</span><span className="chip blue">Spreadsheet</span><span className="chip orange">Presentation</span><span className="chip purple">Image</span></div><div className="explorer-grid"><table><thead><tr><th>Name</th><th>Path</th><th>Type</th><th>Size</th><th>Last Modified</th></tr></thead><tbody>{files.map((file: IndexedFile) => <tr key={file.id} onClick={() => setSelectedFileId(file.id)} className={selectedFile?.id === file.id ? 'selected' : ''}><td>{file.filename}</td><td>{file.absolute_path}</td><td><span className="chip blue">{file.extension || 'file'}</span></td><td>{formatSize(file.size_bytes)}</td><td>{file.modified_at ? new Date(file.modified_at).toLocaleDateString() : '-'}</td></tr>)}</tbody></table><aside className="details"><h2>{selectedFile?.filename || 'Select a file'}</h2>{selectedFile && <><p><strong>Path:</strong> {selectedFile.absolute_path}</p><p><strong>Type:</strong> {selectedFile.extension}</p><p><strong>Size:</strong> {formatSize(selectedFile.size_bytes)}</p><h3>Tags</h3><div className="chips"><span className="chip blue">processed</span><span className="chip mint">document</span></div><h3>Content Preview</h3><div className="preview-box">Select preview in future detail mode.</div></>}</aside></div></section>; }

function Planning({ files, suggestions, previewAndExecute, deepAnalysis, busy }: any) { return <section><div className="planning-head"><div><h1><Brain /> AI Planning Center</h1><p>Intelligent file organization powered by advanced AI content analysis</p></div><div className="button-row"><button className="outline">AI Settings</button><button className="purple" onClick={deepAnalysis} disabled={busy}>AI Analyze</button><button className="outline">Dry Run Preview</button><button onClick={() => suggestions[0] && previewAndExecute(suggestions[0])}>Execute Plan</button></div></div><div className="destination"><strong>Destination Folder</strong><input defaultValue="/Documents/Organized" /></div><div className="analysis-card"><h2><Brain /> AI Analysis Ready</h2><p>Processing {files.length} files with content analysis, pattern recognition, and business context understanding...</p><div className="progress"><span style={{ width: files.length ? '100%' : '40%' }} /></div><div className="process-tags"><span>Content Analysis</span><span>Pattern Recognition</span><span>Business Context</span><span>Structure Generation</span></div></div><div className="planning-grid"><div className="panel"><h3>AI Plan Summary</h3><p>Files analyzed: <b>{files.length}</b></p><p>Actions suggested: <b>{suggestions.length}</b></p><p>Strategy: <b>AI Content Analysis</b></p></div><div className="panel"><h3>Folder Structure</h3>{suggestions.slice(0, 12).map((s: Suggestion) => <div className="suggestion-line" key={s.id}><span>{s.suggested_value}</span><button onClick={() => previewAndExecute(s)}>Preview</button></div>)}</div><div className="panel assistant"><h3>AI Organization Assistant</h3><p>I understand actual file content, not just filenames. Review the plan and approve only the actions you want.</p></div></div></section>; }

function Analytics({ status, audit }: any) { return <section><h1><BarChart3 /> Logging & Analytics Dashboard</h1><section className="stats-grid"><Stat title="Total Logs" value={audit.length} /><Stat title="Errors" value={audit.filter((e: any) => String(e.event_type).includes('failed')).length} /><Stat title="Actions" value={status?.executions || 0} /><Stat title="Active Watchers" value={status?.active_watch_roots || 0} /></section><div className="panel"><h2>Log Entries</h2><table><thead><tr><th>Timestamp</th><th>Category</th><th>Message</th></tr></thead><tbody>{audit.map((event: any) => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString()}</td><td>{event.entity_type}</td><td>{event.event_type}</td></tr>)}</tbody></table></div></section>; }

function SettingsView({ baseUrl, setBaseUrl, token, setToken, folderPath, setFolderPath, saveSettings }: any) { return <section><h1><Settings /> Advanced Settings</h1><div className="panel"><h2><Brain /> AI Provider Configuration</h2><div className="warning">Remote AI providers are disabled until a secure server-side proxy is added.</div><div className="provider-card"><Brain /> <div><strong>Local Ollama</strong><small>Run models locally • Private & Secure</small></div></div></div><div className="panel settings-grid"><label>API Endpoint URL<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></label><label>API Token<input value={token} onChange={(e) => setToken(e.target.value)} type="password" /></label><label>Default Folder Path<input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} /></label></div><div className="panel"><h2>Security & Privacy Settings</h2><div className="security-row red">Encrypt Sensitive Data <span>On</span></div><div className="security-row yellow">Require Confirmation <span>On</span></div><div className="security-row blue">Audit Trail <span>On</span></div><button onClick={saveSettings}>Save Settings</button></div></section>; }

function Stat({ title, value }: { title: string; value: any }) { return <div className="stat"><span>{title}</span><strong>{value}</strong></div>; }
