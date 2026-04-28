import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Brain, CheckCircle, Cloud, Database, FolderOpen, Search, Server, Settings, Shield, Sliders, Upload, Zap } from 'lucide-react';
import { apiRequest, ApiOptions, AppStatus, IndexedFile, Suggestion } from './api';
import { addSourcePath, listSourcePaths, pauseSourcePath, resumeSourcePath, SourcePathRecord } from './sourcePathsApi';
import { getProviderModels, getProviderSettings, ProviderModels, ProviderName, ProviderSettings, saveProviderSettings, testProviderConnection } from './providerSettingsApi';

type Section = 'dashboard' | 'explorer' | 'planning' | 'analytics' | 'settings';
type PreviewRecord = { id: string; suggestion_id?: string; action_type: string; target_path?: string; suggested_value: string; preview_status: string; blocked_reason?: string; risk_level?: string };
type FilePreview = { file?: IndexedFile & { extracted_text?: string; extraction_status?: string }; insight?: { summary?: string; classification?: string; provider?: string } | null; previewText?: string; extracted_text?: string };

const DEFAULT_API = 'http://127.0.0.1:4100';
const DEFAULT_TOKEN = 'replace-with-your-local-development-token';
const DEFAULT_DESTINATION = 'Organized Files';

function formatSize(bytes = 0) {
  if (!bytes) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function providerLabel(provider: ProviderName) {
  return { ollama: 'Local Ollama', openrouter: 'OpenRouter', cerebras: 'Cerebras', mistral: 'Mistral', google: 'Google AI' }[provider];
}

function providerIcon(provider: ProviderName) {
  return { ollama: Server, openrouter: Cloud, cerebras: Brain, mistral: Zap, google: Database }[provider];
}

function averageConfidence(suggestions: Suggestion[]) {
  const values = suggestions.map((item) => Number(item.confidence)).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return 'No plan yet';
  return `${Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100)}%`;
}

function dynamicTags(file?: IndexedFile, preview?: FilePreview | null) {
  if (!file) return [];
  const tags = new Set<string>();
  if (file.extension) tags.add(file.extension.replace('.', '').toUpperCase());
  if (file.index_status) tags.add(file.index_status);
  if (file.extraction_status) tags.add(file.extraction_status);
  if (preview?.insight?.classification) tags.add(preview.insight.classification);
  if ((file.size_bytes || 0) > 10 * 1024 * 1024) tags.add('large file');
  return Array.from(tags);
}

export function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [folderPath, setFolderPath] = useState(localStorage.getItem('everythingai.ui.folderPath') || '');
  const [destinationFolder, setDestinationFolder] = useState(localStorage.getItem('everythingai.ui.destinationFolder') || DEFAULT_DESTINATION);
  const [sourcePaths, setSourcePaths] = useState<SourcePathRecord[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterExtension, setFilterExtension] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready for AI Analysis');
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [providerSettings, setProviderSettings] = useState<ProviderSettings | null>(null);
  const [providerModels, setProviderModels] = useState<ProviderModels | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');

  const options: ApiOptions = useMemo(() => ({ baseUrl, token }), [baseUrl, token]);
  const selectedFile = files.find((file) => file.id === selectedFileId) || files[0];
  const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || 0), 0);
  const fileTypes = files.reduce<Record<string, number>>((acc, file) => {
    const ext = file.extension || 'file';
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});
  const extensionOptions = useMemo(() => Array.from(new Set(files.map((file) => file.extension || 'file'))).sort(), [files]);
  const filteredFiles = useMemo(() => files.filter((file) => {
    const extensionOk = filterExtension === 'all' || (file.extension || 'file') === filterExtension;
    const statusOk = filterStatus === 'all' || file.index_status === filterStatus || file.extraction_status === filterStatus;
    return extensionOk && statusOk;
  }), [files, filterExtension, filterStatus]);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage(label);
    try { await task(); } catch (err: any) { setError(err.message || String(err)); setMessage('Action failed'); } finally { setBusy(false); }
  }

  async function refreshProviderData() {
    const [settingsPayload, modelsPayload] = await Promise.all([getProviderSettings(options), getProviderModels(options)]);
    setProviderSettings(settingsPayload.settings);
    setProviderModels(modelsPayload.models);
  }

  async function refreshAll() {
    await run('Refreshing EverythingAI state...', async () => {
      const [statusPayload, filesPayload, suggestionsPayload, sourcePayload] = await Promise.all([
        apiRequest<{ status: AppStatus }>(options, '/api/status'),
        apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250'),
        apiRequest<{ suggestions: Suggestion[] }>(options, '/api/suggestions?limit=250'),
        listSourcePaths(options),
      ]);
      setStatus(statusPayload.status);
      setFiles(filesPayload.files || []);
      setSuggestions(suggestionsPayload.suggestions || []);
      setSourcePaths(sourcePayload.sources || []);
      await refreshProviderData();
      setMessage('EverythingAI is ready');
    });
  }

  async function consumeSourcePath(pathToConsume: string, watch = true) {
    await run('EverythingAI is consuming the selected source path...', async () => {
      const payload = await addSourcePath(options, pathToConsume, watch);
      setSourcePaths(payload.sources || []);
      await refreshAll();
      setSection('planning');
      setMessage('Source path is now persisted in backend scope. Knowledge consumption is automatic.');
    });
  }

  async function selectFolder() {
    await run('Opening folder picker...', async () => {
      const result = await apiRequest<{ folderPath?: string }>(options, '/api/select-folder', {}, 'POST');
      if (result.folderPath) {
        setFolderPath(result.folderPath);
        localStorage.setItem('everythingai.ui.folderPath', result.folderPath);
        await consumeSourcePath(result.folderPath, true);
      }
    });
  }

  async function addTypedSourcePath() {
    const normalized = folderPath.trim();
    if (!normalized) { setError('Enter a folder path first.'); return; }
    await consumeSourcePath(normalized, true);
  }

  async function pauseSource(source: SourcePathRecord) {
    await run('Pausing source surveillance...', async () => {
      const payload = await pauseSourcePath(options, source.path);
      setSourcePaths(payload.sources || []);
      setMessage('Source surveillance paused. The backend scope record remains persistent.');
    });
  }

  async function resumeSource(source: SourcePathRecord) {
    await run('Resuming source surveillance...', async () => {
      const payload = await resumeSourcePath(options, source.path);
      setSourcePaths(payload.sources || []);
      await refreshAll();
    });
  }

  async function removeSource(source: SourcePathRecord) {
    const approved = window.confirm(`Remove this source path from EverythingAI scope?\n\n${source.path}`);
    if (!approved) return;
    await run('Removing source path from backend scope...', async () => {
      const payload = await apiRequest<{ sources: SourcePathRecord[] }>(options, '/api/source-paths', { folderPath: source.path }, 'DELETE');
      setSourcePaths(payload.sources || []);
    });
  }

  async function deepAnalysis() {
    await run('Running deep AI analysis...', async () => {
      await apiRequest(options, '/api/extract', {}, 'POST');
      await apiRequest(options, '/api/embeddings', { limit: 1000 }, 'POST');
      await apiRequest(options, '/api/insights', { limit: 100 }, 'POST');
      await refreshAll();
      setMessage('Deep analysis complete. Planning suggestions are updated.');
    });
  }

  async function searchEverything() {
    await run('Searching EverythingAI...', async () => {
      if (!query.trim()) return;
      const payload = await apiRequest<any>(options, `/api/unified-search?q=${encodeURIComponent(query)}&limit=50`);
      setFiles(payload.files || []);
      setSuggestions(payload.suggestions || []);
      setSection('explorer');
    });
  }

  async function loadFilePreview(fileId: string) {
    setSelectedFileId(fileId);
    setFilePreview(null);
    try {
      const payload = await apiRequest<FilePreview>(options, `/api/files/${fileId}/preview`);
      setFilePreview(payload);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  async function createPreview(suggestion: Suggestion) {
    const payload = await apiRequest<{ preview: PreviewRecord }>(options, '/api/action-previews', { suggestionId: suggestion.id }, 'POST');
    setPreviews((current) => [payload.preview, ...current.filter((item) => item.suggestion_id !== suggestion.id)]);
    return payload.preview;
  }

  async function previewSuggestion(suggestion: Suggestion) {
    await run('Creating safe action preview...', async () => {
      const preview = await createPreview(suggestion);
      setMessage(preview.preview_status === 'ready' ? 'Safe preview created.' : `Preview blocked: ${preview.blocked_reason || 'not executable'}`);
    });
  }

  async function previewSelected() {
    await run('Creating dry-run previews for selected actions...', async () => {
      const selected = suggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.id));
      const list = selected.length ? selected : suggestions.slice(0, 25);
      for (const suggestion of list) await createPreview(suggestion);
      setMessage(`Dry run complete for ${list.length} action(s).`);
    });
  }

  async function executePreview(preview: PreviewRecord) {
    if (preview.preview_status !== 'ready') { setMessage(`Preview blocked: ${preview.blocked_reason || 'not executable'}`); return; }
    const approved = window.confirm(`Execute ${preview.action_type}?\n\nTarget: ${preview.target_path || preview.suggested_value}`);
    if (!approved) return;
    await run('Executing approved action...', async () => {
      await apiRequest(options, '/api/action-executions', { previewId: preview.id, approve: true }, 'POST');
      setPreviews((current) => current.filter((item) => item.id !== preview.id));
      await refreshAll();
    });
  }

  async function executeSelectedPreviews() {
    const ready = previews.filter((preview) => preview.preview_status === 'ready');
    if (!ready.length) { setMessage('No executable previews. Run Dry Run Preview first.'); return; }
    const approved = window.confirm(`Execute ${ready.length} approved preview action(s)?`);
    if (!approved) return;
    await run('Executing approved plan...', async () => {
      for (const preview of ready) await apiRequest(options, '/api/action-executions', { previewId: preview.id, approve: true }, 'POST');
      setPreviews([]);
      await refreshAll();
    });
  }

  async function loadAudit() {
    await run('Loading analytics...', async () => {
      const payload = await apiRequest<any>(options, '/api/audit-log?limit=100');
      setAudit(payload.events || []);
      setSection('analytics');
    });
  }

  async function saveAiSettings(next: ProviderSettings) {
    await run('Saving AI provider settings...', async () => {
      const payload = await saveProviderSettings(options, next);
      setProviderSettings(payload.settings);
      setMessage('AI provider settings saved.');
    });
  }

  async function testAiProvider(provider: ProviderName) {
    await run(`Testing ${providerLabel(provider)} connection...`, async () => {
      const payload = await testProviderConnection(options, provider);
      setConnectionMessage(payload.message);
      setMessage(payload.message);
    });
  }

  async function refreshModels() {
    await run('Refreshing available models...', async () => {
      const payload = await getProviderModels(options);
      setProviderModels(payload.models);
      setMessage('Model list refreshed.');
    });
  }

  function saveSettings() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    localStorage.setItem('everythingai.ui.folderPath', folderPath);
    localStorage.setItem('everythingai.ui.destinationFolder', destinationFolder);
    setMessage('Settings saved');
  }

  useEffect(() => { refreshAll().catch(() => undefined); }, []);

  return <div className="app">
    <Header section={section} setSection={setSection} loadAudit={loadAudit} activeProvider={providerSettings?.activeProvider || 'ollama'} />
    <main className="page">
      <div className="hero-row"><div><h1><Brain /> AI File Intelligence Center</h1><p>Advanced AI-powered file analysis, organization, and management platform</p></div><div className="hero-actions"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Explore" /></div><button className="purple" onClick={searchEverything}>Explore</button><button className="purple" onClick={() => setSection('planning')}>Start Planning</button><button className="toggle"><Zap size={16} /></button><button className="outline" onClick={loadAudit}>Advanced Stats</button></div></div>
      {error && <div className="error">{error}</div>}
      <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : message}</div>
      {section === 'dashboard' && <Dashboard files={files} suggestions={suggestions} totalSize={totalSize} fileTypes={fileTypes} folderPath={folderPath} setFolderPath={setFolderPath} selectFolder={selectFolder} addTypedSourcePath={addTypedSourcePath} deepAnalysis={deepAnalysis} setSection={setSection} busy={busy} sourcePaths={sourcePaths} rescanSource={(source: SourcePathRecord) => consumeSourcePath(source.path, source.watching)} pauseSource={pauseSource} resumeSource={resumeSource} removeSource={removeSource} />}
      {section === 'explorer' && <Explorer files={filteredFiles} allFiles={files} selectedFile={selectedFile} selectedPreview={filePreview} setSelectedFileId={loadFilePreview} query={query} setQuery={setQuery} searchEverything={searchEverything} showFilters={showFilters} setShowFilters={setShowFilters} filterExtension={filterExtension} setFilterExtension={setFilterExtension} filterStatus={filterStatus} setFilterStatus={setFilterStatus} extensionOptions={extensionOptions} />}
      {section === 'planning' && <Planning files={files} suggestions={suggestions} previews={previews} selectedSuggestionIds={selectedSuggestionIds} setSelectedSuggestionIds={setSelectedSuggestionIds} previewSuggestion={previewSuggestion} previewSelected={previewSelected} executePreview={executePreview} executeSelectedPreviews={executeSelectedPreviews} deepAnalysis={deepAnalysis} busy={busy} openSettings={() => setSection('settings')} destinationFolder={destinationFolder} setDestinationFolder={setDestinationFolder} />}
      {section === 'analytics' && <Analytics status={status} audit={audit} />}
      {section === 'settings' && <SettingsView baseUrl={baseUrl} setBaseUrl={setBaseUrl} token={token} setToken={setToken} folderPath={folderPath} setFolderPath={setFolderPath} destinationFolder={destinationFolder} setDestinationFolder={setDestinationFolder} saveSettings={saveSettings} sourcePaths={sourcePaths} providerSettings={providerSettings} providerModels={providerModels} saveAiSettings={saveAiSettings} testAiProvider={testAiProvider} refreshModels={refreshModels} connectionMessage={connectionMessage} />}
    </main>
  </div>;
}

function Header({ section, setSection, loadAudit, activeProvider }: any) {
  const items: Section[] = ['dashboard', 'explorer', 'planning', 'analytics', 'settings'];
  return <header className="top-nav"><div className="brand"><FolderOpen size={28} /><strong>EverythingAI</strong></div><nav>{items.map((item) => <button key={item} className={section === item ? 'active' : ''} onClick={() => item === 'analytics' ? loadAudit() : setSection(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="provider-pill"><span />{providerLabel(activeProvider)}</div></header>;
}

function Dashboard({ files, suggestions, totalSize, fileTypes, folderPath, setFolderPath, selectFolder, addTypedSourcePath, deepAnalysis, setSection, busy, sourcePaths, rescanSource, pauseSource, resumeSource, removeSource }: any) {
  return <><section className="processing-card"><div className="hub-head"><div><h2><Brain /> AI File Processing Hub</h2><p>Intelligent content analysis • Pattern recognition • Smart organization</p></div><div className="button-row"><button className="outline" onClick={selectFolder}><Upload size={16} /> Add Folder</button><button className="outline purple-border" onClick={addTypedSourcePath}>Add Path</button></div></div><div className="drop-zone" onClick={selectFolder}><Upload size={44} /><h3>Add folders to EverythingAI Scope</h3><p>EverythingAI automatically indexes, extracts, embeds, analyzes, and plans from every backend-persisted source path.</p><div className="mini-tags"><span>Documents</span><span>Folders</span><span>Automatic Knowledge</span><span>Persistent Scope</span></div></div><div className="path-row"><input value={folderPath} onChange={(e: any) => setFolderPath(e.target.value)} placeholder="C:\\path\\to\\folder" /><button onClick={addTypedSourcePath} disabled={busy}>Add to Scope</button></div></section><SourcePathsPanel sourcePaths={sourcePaths} rescanSource={rescanSource} pauseSource={pauseSource} resumeSource={resumeSource} removeSource={removeSource} />{!files.length ? <section className="empty-card"><div className="big-icon"><FolderOpen /></div><h2>AI File Organization Ready</h2><p>Add source paths and EverythingAI will automatically consume the knowledge inside them.</p></section> : <><section className="stats-grid"><Stat title="Total Files" value={files.length} /><Stat title="Total Size" value={formatSize(totalSize)} /><Stat title="File Categories" value={Object.keys(fileTypes).length} /><Stat title="AI Confidence" value={averageConfidence(suggestions)} /></section><section className="two-col"><div className="panel"><h3>File Types Distribution</h3>{Object.entries(fileTypes).map(([key, value]) => <div className="bar" key={key}><span>{key}</span><div><b style={{ width: `${Math.min(100, Number(value) * 20)}%` }} /></div><small>{String(value)} files</small></div>)}</div><div className="panel"><h3>Largest Files</h3>{files.slice().sort((a: IndexedFile, b: IndexedFile) => (b.size_bytes || 0) - (a.size_bytes || 0)).slice(0, 5).map((file: IndexedFile) => <div className="file-line" key={file.id}><div><strong>{file.filename}</strong><small>{file.absolute_path}</small></div><span>{formatSize(file.size_bytes)}</span></div>)}</div></section><section className="success-card"><CheckCircle /><div><h2>AI Analysis Complete</h2><p>{files.length} files have been processed from the active source scope. EverythingAI will keep consuming watched folders automatically.</p><div className="button-row"><button className="outline" onClick={() => setSection('explorer')}>Explore Files</button><button onClick={() => setSection('planning')}>Start Planning</button><button className="outline" onClick={deepAnalysis}>Deep Analysis</button></div></div></section></>}</>;
}

function SourcePathsPanel({ sourcePaths, rescanSource, pauseSource, resumeSource, removeSource }: any) {
  return <section className="panel source-panel"><div className="panel-title"><div><h2><FolderOpen /> Source Paths</h2><p>Backend-persisted folders inside EverythingAI scope. Knowledge consumption is automatic for these paths.</p></div><span className="scope-pill">{sourcePaths.length} scoped path(s)</span></div>{!sourcePaths.length ? <div className="empty-source">No source paths added yet. Add a folder above to start automatic knowledge consumption.</div> : <div className="source-list">{sourcePaths.map((source: SourcePathRecord) => <article className="source-card" key={source.id}><div><strong>{source.path}</strong><p>Status: <b>{source.status}</b> • Surveillance: <b>{source.watching ? 'On' : 'Off'}</b>{source.lastRun ? ` • Last run: ${new Date(source.lastRun).toLocaleString()}` : ''}</p>{source.error && <p className="source-error">{source.error}</p>}</div><div className="button-row"><button className="outline" onClick={() => rescanSource(source)}>Re-scan</button>{source.watching ? <button className="outline" onClick={() => pauseSource(source)}>Pause</button> : <button className="outline" onClick={() => resumeSource(source)}>Resume</button>}<button className="outline danger" onClick={() => removeSource(source)}>Remove</button></div></article>)}</div>}</section>;
}

function Explorer({ files, allFiles, selectedFile, selectedPreview, setSelectedFileId, query, setQuery, searchEverything, showFilters, setShowFilters, filterExtension, setFilterExtension, filterStatus, setFilterStatus, extensionOptions }: any) {
  const previewText = selectedPreview?.previewText || selectedPreview?.extracted_text || selectedPreview?.file?.extracted_text || '';
  return <section><div className="explorer-search"><input value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Search files by name, path, or tags..." /><button onClick={searchEverything}>Search</button><button className="outline" onClick={() => setShowFilters(!showFilters)}>Filters</button><button className="outline" onClick={() => { setQuery(''); setFilterExtension('all'); setFilterStatus('all'); }}>Clear</button></div>{showFilters && <div className="filter-panel"><label>Extension<select value={filterExtension} onChange={(e) => setFilterExtension(e.target.value)}><option value="all">All extensions</option>{extensionOptions.map((extension: string) => <option key={extension} value={extension}>{extension}</option>)}</select></label><label>Status<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">All statuses</option><option value="indexed">Indexed</option><option value="failed">Failed</option><option value="extracted">Extracted</option><option value="unsupported">Unsupported</option></select></label><span>{files.length}/{allFiles.length} files visible</span></div>}<div className="chips"><span className="chip dark">All</span>{extensionOptions.slice(0, 8).map((extension: string) => <span key={extension} className="chip blue">{extension}</span>)}</div><div className="explorer-grid"><table><thead><tr><th>Name</th><th>Path</th><th>Type</th><th>Size</th><th>Last Modified</th></tr></thead><tbody>{files.map((file: IndexedFile) => <tr key={file.id} onClick={() => setSelectedFileId(file.id)} className={selectedFile?.id === file.id ? 'selected' : ''}><td>{file.filename}</td><td>{file.absolute_path}</td><td><span className="chip blue">{file.extension || 'file'}</span></td><td>{formatSize(file.size_bytes)}</td><td>{file.modified_at ? new Date(file.modified_at).toLocaleDateString() : '-'}</td></tr>)}</tbody></table><aside className="details"><h2>{selectedFile?.filename || 'Select a file'}</h2>{selectedFile && <><p><strong>Path:</strong> {selectedFile.absolute_path}</p><p><strong>Type:</strong> {selectedFile.extension}</p><p><strong>Size:</strong> {formatSize(selectedFile.size_bytes)}</p><h3>Tags</h3><div className="chips">{dynamicTags(selectedFile, selectedPreview).map((tag) => <span className="chip blue" key={tag}>{tag}</span>)}</div>{selectedPreview?.insight?.summary && <><h3>AI Insight</h3><p>{selectedPreview.insight.summary}</p></>}<h3>Content Preview</h3><div className="preview-box text-preview">{previewText || 'Select a file to load extracted text and insight preview.'}</div></>}</aside></div></section>;
}

function Planning({ files, suggestions, previews, selectedSuggestionIds, setSelectedSuggestionIds, previewSuggestion, previewSelected, executePreview, executeSelectedPreviews, deepAnalysis, busy, openSettings, destinationFolder, setDestinationFolder }: any) {
  function toggleSuggestion(id: string) { const next = new Set(selectedSuggestionIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedSuggestionIds(next); }
  return <section><div className="planning-head"><div><h1><Brain /> AI Planning Center</h1><p>Full planning workflow with AI settings, dry run previews, action selection, execution queue, and safety approval.</p></div><div className="button-row"><button className="outline" onClick={openSettings}><Sliders size={16} /> AI Settings</button><button className="purple" onClick={deepAnalysis} disabled={busy}>AI Analyze</button><button className="outline" onClick={previewSelected}>Dry Run Preview</button><button onClick={executeSelectedPreviews}>Execute Plan</button></div></div><div className="destination"><strong>Destination Folder / Planning Label</strong><input value={destinationFolder} onChange={(e) => setDestinationFolder(e.target.value)} placeholder="e.g. Finance, Projects, Customer Docs" /><p className="muted">Saved as a UI planning preference. Actual filesystem targets still come from backend-safe previews.</p></div><div className="analysis-card"><h2><Brain /> AI Analysis Ready</h2><p>Processing {files.length} files with content analysis, pattern recognition, and business context understanding...</p><div className="progress"><span style={{ width: files.length ? '100%' : '40%' }} /></div><div className="process-tags"><span>Content Analysis</span><span>Pattern Recognition</span><span>Business Context</span><span>Structure Generation</span></div></div><div className="planning-grid advanced"><div className="panel"><h3>AI Plan Summary</h3><p>Files analyzed: <b>{files.length}</b></p><p>Actions suggested: <b>{suggestions.length}</b></p><p>Average confidence: <b>{averageConfidence(suggestions)}</b></p><p>Selected actions: <b>{selectedSuggestionIds.size}</b></p><p>Dry-run previews: <b>{previews.length}</b></p><p>Executable previews: <b>{previews.filter((p: PreviewRecord) => p.preview_status === 'ready').length}</b></p></div><div className="panel wide"><h3>Suggested Actions</h3>{suggestions.slice(0, 60).map((s: Suggestion) => <div className="suggestion-line selectable" key={s.id}><label><input type="checkbox" checked={selectedSuggestionIds.has(s.id)} onChange={() => toggleSuggestion(s.id)} /> <b>{s.action_type}</b> → {s.suggested_value}</label><span className="chip blue">{Math.round(Number(s.confidence || 0) * 100)}%</span><button onClick={() => previewSuggestion(s)}>Preview</button></div>)}</div><div className="panel wide"><h3>Dry Run / Execution Queue</h3>{!previews.length && <p className="muted">Run Dry Run Preview to validate selected actions before execution.</p>}{previews.map((p: PreviewRecord) => <div className="suggestion-line" key={p.id}><div><b>{p.action_type}</b> → {p.target_path || p.suggested_value}<p className="muted">{p.preview_status === 'ready' ? 'Ready to execute' : `Blocked: ${p.blocked_reason}`}</p></div><span className={p.preview_status === 'ready' ? 'chip green' : 'chip orange'}>{p.preview_status}</span><button disabled={p.preview_status !== 'ready'} onClick={() => executePreview(p)}>Execute</button></div>)}</div></div></section>;
}

function Analytics({ status, audit }: any) {
  return <section><h1><BarChart3 /> Logging & Analytics Dashboard</h1><section className="stats-grid"><Stat title="Total Logs" value={audit.length} /><Stat title="Errors" value={audit.filter((e: any) => String(e.event_type).includes('failed')).length} /><Stat title="Actions" value={status?.executions || 0} /><Stat title="Active Watchers" value={status?.active_watch_roots || 0} /></section><div className="panel"><h2>Log Entries</h2><table><thead><tr><th>Timestamp</th><th>Category</th><th>Message</th></tr></thead><tbody>{audit.map((event: any) => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString()}</td><td>{event.entity_type}</td><td>{event.event_type}</td></tr>)}</tbody></table></div></section>;
}

function SettingsView({ baseUrl, setBaseUrl, token, setToken, folderPath, setFolderPath, destinationFolder, setDestinationFolder, saveSettings, sourcePaths, providerSettings, providerModels, saveAiSettings, testAiProvider, refreshModels, connectionMessage }: any) {
  const [draft, setDraft] = useState<ProviderSettings | null>(providerSettings);
  useEffect(() => setDraft(providerSettings), [providerSettings]);
  if (!draft) return <section><h1><Settings /> Advanced Settings</h1><div className="panel">Loading provider settings...</div></section>;
  const providers: ProviderName[] = ['ollama', 'openrouter', 'cerebras', 'mistral', 'google'];
  function update(path: string, value: any) { const copy: any = JSON.parse(JSON.stringify(draft)); const keys = path.split('.'); let current = copy; keys.slice(0, -1).forEach((key) => { current = current[key]; }); current[keys[keys.length - 1]] = value; setDraft(copy); }
  const active = draft.activeProvider;
  const models = providerModels?.[active] || [];
  return <section><div className="settings-header"><div><h1><Settings /> Advanced Settings</h1><p>Configure AI providers, model selector, planning rules, security, and local API connection.</p></div><div className="button-row"><button className="outline" onClick={refreshModels}>Refresh Models</button><button className="outline" onClick={() => testAiProvider(active)}>Test Connection</button><button onClick={() => saveAiSettings(draft)}>Save AI Settings</button></div></div>{connectionMessage && <div className="status-strip ready">{connectionMessage}</div>}<div className="panel"><h2><Brain /> AI Provider Configuration</h2><div className="provider-grid">{providers.map((provider) => { const Icon = providerIcon(provider); const disabled = provider !== 'ollama' && !draft.remoteProvidersEnabled; return <button key={provider} className={`provider-card-button ${active === provider ? 'selected' : ''}`} disabled={disabled} onClick={() => update('activeProvider', provider)}><Icon /><strong>{providerLabel(provider)}</strong><small>{provider === 'ollama' ? 'Run models locally' : disabled ? 'Disabled by policy' : 'Remote model provider'}</small></button>; })}</div><label className="setting-check"><input type="checkbox" checked={draft.remoteProvidersEnabled} onChange={(e) => update('remoteProvidersEnabled', e.target.checked)} /> Enable remote providers through server policy</label></div><div className="panel"><h2><Server /> {providerLabel(active)} Configuration</h2>{active === 'ollama' ? <div className="settings-grid"><label>Endpoint URL<input value={draft.ollama.endpoint} onChange={(e) => update('ollama.endpoint', e.target.value)} /></label><label>Model<select value={draft.ollama.model} onChange={(e) => update('ollama.model', e.target.value)}>{models.map((model: any) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label><label>Temperature: {draft.ollama.temperature}<input type="range" min="0" max="2" step="0.1" value={draft.ollama.temperature} onChange={(e) => update('ollama.temperature', Number(e.target.value))} /></label><label>Max Tokens<input type="number" value={draft.ollama.maxTokens} onChange={(e) => update('ollama.maxTokens', Number(e.target.value))} /></label><label>Timeout MS<input type="number" value={draft.ollama.timeoutMs} onChange={(e) => update('ollama.timeoutMs', Number(e.target.value))} /></label></div> : <div className="settings-grid"><label>Credential<input type="password" value={(draft as any)[active].apiKey} onChange={(e) => update(`${active}.apiKey`, e.target.value)} placeholder="Stored in backend settings" /></label><label>Model<select value={(draft as any)[active].model} onChange={(e) => update(`${active}.model`, e.target.value)}>{models.map((model: any) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label><label>Temperature: {(draft as any)[active].temperature}<input type="range" min="0" max="2" step="0.1" value={(draft as any)[active].temperature} onChange={(e) => update(`${active}.temperature`, Number(e.target.value))} /></label><label>Max Tokens<input type="number" value={(draft as any)[active].maxTokens} onChange={(e) => update(`${active}.maxTokens`, Number(e.target.value))} /></label></div>}</div><div className="panel"><h2><Sliders /> Planning Rules</h2><div className="settings-grid"><label>Planning Strategy<select value={draft.planning.strategy} onChange={(e) => update('planning.strategy', e.target.value)}><option value="content-first">Content-first</option><option value="filename-first">Filename-first</option><option value="hybrid">Hybrid</option></select></label><label>Confidence Threshold: {draft.planning.confidenceThreshold}<input type="range" min="0" max="1" step="0.05" value={draft.planning.confidenceThreshold} onChange={(e) => update('planning.confidenceThreshold', Number(e.target.value))} /></label><label className="setting-check"><input type="checkbox" checked={draft.planning.allowRename} onChange={(e) => update('planning.allowRename', e.target.checked)} /> Allow rename suggestions</label><label className="setting-check"><input type="checkbox" checked={draft.planning.allowMove} onChange={(e) => update('planning.allowMove', e.target.checked)} /> Allow move suggestions</label><label className="setting-check"><input type="checkbox" checked={draft.planning.allowTag} onChange={(e) => update('planning.allowTag', e.target.checked)} /> Allow tag suggestions</label><label className="setting-check"><input type="checkbox" checked={draft.planning.requireApproval} onChange={(e) => update('planning.requireApproval', e.target.checked)} /> Require approval before execution</label></div></div><div className="panel settings-grid"><label>API Endpoint URL<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></label><label>API Token<input value={token} onChange={(e) => setToken(e.target.value)} type="password" /></label><label>Default Folder Path<input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} /></label><label>Destination Folder / Planning Label<input value={destinationFolder} onChange={(e) => setDestinationFolder(e.target.value)} /></label><label>Backend Source Paths<input value={`${sourcePaths.length} source path(s)`} readOnly /></label><button onClick={saveSettings}>Save Local UI Settings</button></div><div className="panel"><h2><Shield /> Security & Privacy Settings</h2><div className="security-row red">Remote providers require explicit enablement <span>{draft.remoteProvidersEnabled ? 'On' : 'Off'}</span></div><div className="security-row yellow">Require file action confirmation <span>{draft.planning.requireApproval ? 'On' : 'Off'}</span></div><div className="security-row blue">Audit Trail <span>On</span></div></div></section>;
}

function Stat({ title, value }: { title: string; value: any }) { return <div className="stat"><span>{title}</span><strong>{value}</strong></div>; }
