import { useEffect, useMemo, useState } from 'react';
import { Brain, Search, Zap } from 'lucide-react';
import { apiRequest, type ApiOptions, type AppStatus, type IndexedFile, type Suggestion } from '../api';
import {
  addSourcePath,
  listSourcePaths,
  pauseSourcePath,
  resumeSourcePath,
  type SourcePathRecord,
} from '../sourcePathsApi';
import {
  getProviderModels,
  getProviderSettings,
  type ProviderModels,
  type ProviderName,
  type ProviderSettings,
  saveProviderSettings,
  testProviderConnection,
} from '../providerSettingsApi';
import { AdminHeader } from './components/AdminHeader';
import { AnalyticsView } from './components/AnalyticsView';
import { AskAIView } from './components/AskAIView';
import { DashboardView } from './components/DashboardView';
import { ExplorerView } from './components/ExplorerView';
import { PlanningView, type PreviewRecord } from './components/PlanningView';
import { SettingsView } from './components/SettingsView';
import type { AdminSection } from './types';

const DEFAULT_API = 'http://127.0.0.1:4100';
const DEFAULT_TOKEN = 'replace-with-your-local-development-token';

type FilePreview = {
  file?: IndexedFile & { extracted_text?: string };
  insight?: { summary?: string; classification?: string } | null;
  previewText?: string;
  extracted_text?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: Array<{ filename?: string; absolute_path?: string; snippet?: string; score?: number }>;
};

export function AdminAppV2() {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [folderPath, setFolderPath] = useState(localStorage.getItem('everythingai.ui.folderPath') || '');
  const [destinationFolder, setDestinationFolder] = useState(localStorage.getItem('everythingai.ui.destinationFolder') || 'Organized Files');
  const [sourcePaths, setSourcePaths] = useState<SourcePathRecord[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterExtension, setFilterExtension] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [providerSettings, setProviderSettings] = useState<ProviderSettings | null>(null);
  const [providerModels, setProviderModels] = useState<ProviderModels | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [saveSettingsFeedback, setSaveSettingsFeedback] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready for AI Analysis');
  const [error, setError] = useState('');

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
    const extOk = filterExtension === 'all' || (file.extension || 'file') === filterExtension;
    const statusOk = filterStatus === 'all' || file.index_status === filterStatus || file.extraction_status === filterStatus;
    return extOk && statusOk;
  }), [files, filterExtension, filterStatus]);

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

  async function refreshProviderData() {
    const [settingsPayload, modelsPayload] = await Promise.all([
      getProviderSettings(options),
      getProviderModels(options),
    ]);
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

  async function consumeSourcePath(pathValue: string, watch = true) {
    await run('Consuming source path...', async () => {
      const payload = await addSourcePath(options, pathValue, watch);
      setSourcePaths(payload.sources || []);
      await refreshAll();
      setSection('planning');
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
    const pathValue = folderPath.trim();
    if (!pathValue) {
      setError('Enter a folder path first.');
      return;
    }
    await consumeSourcePath(pathValue, true);
  }

  async function pauseSource(source: SourcePathRecord) {
    await run('Pausing source...', async () => {
      const payload = await pauseSourcePath(options, source.path);
      setSourcePaths(payload.sources || []);
    });
  }

  async function resumeSource(source: SourcePathRecord) {
    await run('Resuming source...', async () => {
      const payload = await resumeSourcePath(options, source.path);
      setSourcePaths(payload.sources || []);
      await refreshAll();
    });
  }

  async function removeSource(source: SourcePathRecord) {
    if (!window.confirm(`Remove source path?\n\n${source.path}`)) return;
    await run('Removing source...', async () => {
      const payload = await apiRequest<{ sources: SourcePathRecord[] }>(options, '/api/source-paths', { folderPath: source.path }, 'DELETE');
      setSourcePaths(payload.sources || []);
    });
  }

  async function deepAnalysis() {
    await run('Running deep AI analysis...', async () => {
      await apiRequest(options, '/api/extract', {}, 'POST');
      await apiRequest(options, '/api/embeddings', { limit: 1000 }, 'POST');
      await apiRequest(options, '/api/insights', { limit: 100, useProvider: true }, 'POST');
      await refreshAll();
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
      setFilePreview(await apiRequest<FilePreview>(options, `/api/files/${fileId}/preview`));
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  async function createPreview(suggestion: Suggestion) {
    const payload = await apiRequest<{ preview: PreviewRecord }>(options, '/api/action-previews', {
      suggestionId: suggestion.id,
      destinationFolder: destinationFolder || undefined,
    }, 'POST');
    setPreviews((current) => [payload.preview, ...current.filter((item) => item.suggestion_id !== suggestion.id)]);
  }

  async function previewSelected() {
    await run('Creating dry-run previews...', async () => {
      const selected = suggestions.filter((item) => selectedSuggestionIds.has(item.id));
      const list = selected.length ? selected : suggestions.slice(0, 25);
      for (const suggestion of list) await createPreview(suggestion);
    });
  }

  async function executePreview(preview: PreviewRecord) {
    if (preview.preview_status !== 'ready') {
      setMessage(`Blocked: ${preview.blocked_reason || 'not executable'}`);
      return;
    }
    if (!window.confirm(`Execute ${preview.action_type}?\n\n${preview.target_path || preview.suggested_value}`)) return;
    await run('Executing approved action...', async () => {
      await apiRequest(options, '/api/action-executions', { previewId: preview.id, approve: true }, 'POST');
      setPreviews((current) => current.filter((item) => item.id !== preview.id));
      await refreshAll();
    });
  }

  async function executeSelectedPreviews() {
    const ready = previews.filter((preview) => preview.preview_status === 'ready');
    if (!ready.length) {
      setMessage('No executable previews. Run Dry Run Preview first.');
      return;
    }
    if (!window.confirm(`Execute ${ready.length} approved preview action(s)?`)) return;
    await run('Executing approved plan...', async () => {
      let succeeded = 0;
      let skipped = 0;
      for (const preview of ready) {
        try {
          const result = await apiRequest<any>(options, '/api/action-executions', { previewId: preview.id, approve: true }, 'POST');
          if (result?.skipped) skipped++;
          else succeeded++;
        } catch {
          skipped++;
        }
      }
      setPreviews([]);
      await refreshAll();
      setMessage(`Execution complete: ${succeeded} succeeded, ${skipped} skipped.`);
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
      setSaveSettingsFeedback('Settings saved successfully.');
      setTimeout(() => setSaveSettingsFeedback(''), 4000);
    });
  }

  async function testAiProvider(provider: ProviderName) {
    setConnectionStatus('idle');
    setConnectionMessage('Testing connection...');
    try {
      const payload = await testProviderConnection(options, provider);
      setConnectionStatus(payload.connected ? 'ok' : 'error');
      setConnectionMessage(payload.message);
      if (payload.connected) {
        const modelsPayload = await apiRequest<any>(options, `/api/provider-settings/models/${provider}`);
        setProviderModels((prev: any) => ({ ...prev, [provider]: modelsPayload.models }));
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMessage(err.message || 'Connection failed');
    }
  }

  async function refreshModels() {
    await run('Refreshing model list...', async () => {
      const payload = await getProviderModels(options);
      setProviderModels(payload.models);
    });
  }

  function saveLocalSettings() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    localStorage.setItem('everythingai.ui.folderPath', folderPath);
    localStorage.setItem('everythingai.ui.destinationFolder', destinationFolder);
    setMessage('Local UI settings saved');
  }

  useEffect(() => {
    refreshAll().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="app">
    <AdminHeader
      section={section}
      setSection={setSection}
      loadAudit={loadAudit}
      activeProvider={providerSettings?.activeProvider || 'ollama'}
    />
    <main className="page">
      <div className="hero-row">
        <div><h1><Brain /> AI File Intelligence Center</h1><p>Admin/operator control center for governed planning, execution, provider settings, and audit review.</p></div>
        <div className="hero-actions">
          <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Explore" /></div>
          <button className="purple" onClick={searchEverything}>Explore</button>
          <button className="purple" onClick={() => setSection('planning')}>Start Planning</button>
          <button className="toggle"><Zap size={16} /></button>
          <button className="outline" onClick={loadAudit}>Advanced Stats</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : message}</div>

      {section === 'dashboard' && <DashboardView
        files={files}
        suggestions={suggestions}
        totalSize={totalSize}
        fileTypes={fileTypes}
        folderPath={folderPath}
        setFolderPath={setFolderPath}
        selectFolder={selectFolder}
        addTypedSourcePath={addTypedSourcePath}
        deepAnalysis={deepAnalysis}
        setSection={setSection}
        busy={busy}
        sourcePaths={sourcePaths}
        rescanSource={(source) => consumeSourcePath(source.path, source.watching)}
        pauseSource={pauseSource}
        resumeSource={resumeSource}
        removeSource={removeSource}
      />}

      {section === 'explorer' && <ExplorerView
        files={filteredFiles}
        allFiles={files}
        selectedFile={selectedFile}
        selectedPreview={filePreview}
        setSelectedFileId={loadFilePreview}
        query={query}
        setQuery={setQuery}
        searchEverything={searchEverything}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filterExtension={filterExtension}
        setFilterExtension={setFilterExtension}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        extensionOptions={extensionOptions}
      />}

      {section === 'planning' && <PlanningView
        files={files}
        suggestions={suggestions}
        previews={previews}
        selectedSuggestionIds={selectedSuggestionIds}
        setSelectedSuggestionIds={setSelectedSuggestionIds}
        createPreview={createPreview}
        previewSelected={previewSelected}
        executePreview={executePreview}
        executeSelectedPreviews={executeSelectedPreviews}
        deepAnalysis={deepAnalysis}
        busy={busy}
        openSettings={() => setSection('settings')}
        destinationFolder={destinationFolder}
        setDestinationFolder={setDestinationFolder}
      />}

      {section === 'analytics' && <AnalyticsView status={status} audit={audit} />}

      {section === 'settings' && <SettingsView
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        token={token}
        setToken={setToken}
        folderPath={folderPath}
        setFolderPath={setFolderPath}
        destinationFolder={destinationFolder}
        setDestinationFolder={setDestinationFolder}
        saveLocalSettings={saveLocalSettings}
        sourcePaths={sourcePaths}
        providerSettings={providerSettings}
        providerModels={providerModels}
        saveAiSettings={saveAiSettings}
        testAiProvider={testAiProvider}
        refreshModels={refreshModels}
        connectionMessage={connectionMessage}
        connectionStatus={connectionStatus}
        saveSettingsFeedback={saveSettingsFeedback}
      />}

      {section === 'askai' && <AskAIView
        options={options}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
      />}
    </main>
  </div>;
}

export default AdminAppV2;
