import { useEffect, useMemo, useState } from 'react';
import { apiRequest, type ApiOptions, type Suggestion } from '../api';
import {
  detectAgentIntegration,
  detectAllAgentIntegrations,
  getAgentBridgeStatus,
  getProviderModels,
  saveProviderSettings,
  runAgentProbe,
  testProviderConnection,
  type AgentBridgeStatus,
  type AgentDetectionResult,
  type ProviderName,
  type ProviderSettings,
} from '../providerSettingsApi';
import type { SourcePathRecord } from '../sourcePathsApi';
import { AdminShell, AdminViewRouter, type PreviewRecord } from './components';
import {
  useAdminAudit,
  useAdminChat,
  useAdminLocalSettings,
  useAdminPlanning,
  useAdminProviderData,
  useAdminSourcePaths,
  useAdminTaskRunner,
  useAdminWorkspaceData,
} from './hooks';
import type { AdminSection } from './types';

export function AdminRuntimeApp() {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [agentBridgeStatus, setAgentBridgeStatus] = useState<AgentBridgeStatus | null>(null);
  const [agentDetectionResults, setAgentDetectionResults] = useState<Record<string, AgentDetectionResult>>({});
  const localSettings = useAdminLocalSettings();
  const task = useAdminTaskRunner();
  const workspace = useAdminWorkspaceData();
  const providers = useAdminProviderData();
  const sources = useAdminSourcePaths();
  const planning = useAdminPlanning();
  const auditState = useAdminAudit();
  const chat = useAdminChat();

  const options: ApiOptions = useMemo(() => ({
    baseUrl: localSettings.baseUrl,
    token: localSettings.token,
  }), [localSettings.baseUrl, localSettings.token]);

  async function refreshAll() {
    await task.run('Refreshing EverythingAI admin state...', async () => {
      const [status, files, suggestions, sourcePaths] = await Promise.all([
        workspace.refreshStatus(options),
        workspace.refreshFiles(options),
        workspace.refreshSuggestions(options),
        sources.refreshSourcePaths(options),
      ]);

      await providers.refreshProviderData(options);
      const bridgeStatus = await getAgentBridgeStatus(options);
      setAgentBridgeStatus(bridgeStatus);
      workspace.setStatus(status);
      workspace.setFiles(files);
      workspace.setSuggestions(suggestions);
      sources.setSourcePaths(sourcePaths);
      task.setMessage('EverythingAI admin is ready');
    });
  }

  async function consumeSourcePath(pathValue: string, watch = true) {
    await task.run('Consuming source path...', async () => {
      await sources.consumeSourcePath(options, pathValue, watch);
      await refreshAll();
      setSection('planning');
    });
  }

  async function selectFolder() {
    await task.run('Opening folder picker...', async () => {
      const result = await apiRequest<{ folderPath?: string; cancelled?: boolean }>(options, '/api/select-folder', {}, 'POST');
      if (result.cancelled || !result.folderPath) {
        task.setMessage('Folder selection cancelled.');
        return;
      }

      localSettings.setFolderPath(result.folderPath);
      localStorage.setItem('everythingai.ui.folderPath', result.folderPath);
      await consumeSourcePath(result.folderPath, true);
    });
  }

  async function addTypedSourcePath() {
    const normalized = localSettings.folderPath.trim();
    if (!normalized) {
      task.setError('Enter a folder path first.');
      return;
    }

    await consumeSourcePath(normalized, true);
  }

  async function pauseSource(source: SourcePathRecord) {
    await task.run('Pausing source...', async () => {
      await sources.pauseSource(options, source);
    });
  }

  async function resumeSource(source: SourcePathRecord) {
    await task.run('Resuming source...', async () => {
      await sources.resumeSource(options, source);
      await refreshAll();
    });
  }

  async function removeSource(source: SourcePathRecord) {
    if (!window.confirm(`Remove source path?\n\n${source.path}`)) return;

    await task.run('Removing source...', async () => {
      const payload = await apiRequest<{ sources: SourcePathRecord[] }>(
        options,
        '/api/source-paths',
        { folderPath: source.path },
        'DELETE',
      );
      sources.setSourcePaths(payload.sources || []);
    });
  }

  async function generateSuggestionsForFiles(files: Array<{ id: string }>) {
    const generated: Suggestion[] = [];
    for (const file of files) {
      const payload = await apiRequest<{ suggestions: Suggestion[] }>(
        options,
        '/api/suggestions',
        { fileId: file.id },
        'POST',
      );
      generated.push(...(payload.suggestions || []));
    }
    return generated;
  }

  async function deepAnalysis() {
    await task.run('Running deep AI analysis and planning...', async () => {
      await apiRequest(options, '/api/extract', {}, 'POST');
      await apiRequest(options, '/api/embeddings', { limit: 1000 }, 'POST');
      await apiRequest(options, '/api/insights', { limit: 100, useProvider: true }, 'POST');
      const files = await workspace.refreshFiles(options);
      await generateSuggestionsForFiles(files);
      const suggestions = await workspace.refreshSuggestions(options);
      await workspace.refreshStatus(options);
      task.setMessage(`AI analysis complete. ${suggestions.length} suggested action(s) ready.`);
      setSection('planning');
    });
  }

  async function searchEverything() {
    await task.run('Searching EverythingAI...', async () => {
      if (!workspace.query.trim()) return;
      await workspace.searchEverything(options);
      setSection('explorer');
    });
  }

  async function loadFilePreview(fileId: string) {
    await task.run('Loading file preview...', async () => {
      await workspace.loadFilePreview(options, fileId);
    });
  }

  async function createPreview(suggestion: Suggestion) {
    await planning.createPreview(options, suggestion, localSettings.destinationFolder);
  }

  async function previewSelected() {
    await task.run('Creating dry-run previews...', async () => {
      await planning.previewSelected(options, workspace.suggestions, localSettings.destinationFolder);
    });
  }

  async function executePreview(preview: PreviewRecord) {
    if (preview.preview_status !== 'ready') {
      task.setMessage(`Blocked: ${preview.blocked_reason || 'not executable'}`);
      return;
    }

    if (!window.confirm(`Execute ${preview.action_type}?\n\n${preview.target_path || preview.suggested_value}`)) return;

    await task.run('Executing approved action...', async () => {
      await planning.executePreview(options, preview);
      await refreshAll();
    });
  }

  async function executeSelectedPreviews() {
    const ready = planning.previews.filter((preview) => preview.preview_status === 'ready');
    if (!ready.length) {
      task.setMessage('No executable previews. Run Dry Run Preview first.');
      return;
    }

    if (!window.confirm(`Execute ${ready.length} approved preview action(s)?`)) return;

    await task.run('Executing approved plan...', async () => {
      await planning.executeReadyPreviews(options);
      await refreshAll();
    });
  }

  async function loadAudit() {
    await task.run('Loading analytics...', async () => {
      await auditState.loadAudit(options);
      setSection('analytics');
    });
  }

  async function saveAiSettings(next: ProviderSettings) {
    await task.run('Saving AI provider and agent connector settings...', async () => {
      const payload = await saveProviderSettings(options, next);
      providers.setProviderSettings(payload.settings);
      const bridgeStatus = await getAgentBridgeStatus(options);
      setAgentBridgeStatus(bridgeStatus);
      task.setMessage('AI provider and agent connector settings saved.');
    });
  }

  async function testAiProvider(provider: ProviderName) {
    await task.run('Testing AI provider connection...', async () => {
      const payload = await testProviderConnection(options, provider);
      task.setMessage(payload.message);
    });
  }

  async function refreshModels() {
    await task.run('Refreshing model list...', async () => {
      const payload = await getProviderModels(options);
      providers.setProviderModels(payload.models);
      task.setMessage('Model list refreshed.');
    });
  }

  async function refreshAgentBridgeStatus() {
    await task.run('Refreshing agent bridge status...', async () => {
      const payload = await getAgentBridgeStatus(options);
      setAgentBridgeStatus(payload);
      task.setMessage(`Agent bridge is ${payload.bridgeEnabled ? 'enabled' : 'disabled'}; chat is ${payload.chatEnabled ? 'enabled' : 'disabled'}.`);
    });
  }

  async function detectAgent(agentId: string) {
    await task.run(`Detecting ${agentId} connector...`, async () => {
      const payload = await detectAgentIntegration(options, agentId);
      setAgentDetectionResults((current) => ({ ...current, [agentId]: payload }));
      task.setMessage(payload.message);
    });
  }

  async function detectAllAgents() {
    await task.run('Detecting all configured agent connectors...', async () => {
      const payload = await detectAllAgentIntegrations(options);
      const next = Object.fromEntries((payload.results || []).map((result) => [result.agentId, result]));
      setAgentDetectionResults(next);
      task.setMessage(`Detected ${payload.results?.filter((result) => result.found).length || 0} agent connector command(s).`);
    });
  }

  async function probeAgent(agentId: string) {
    await task.run(`Probing ${agentId} connector...`, async () => {
      const payload = await runAgentProbe(options, agentId, 'version');
      task.setMessage(payload.message || (payload.ok ? `${agentId} probe succeeded.` : `${agentId} probe failed.`));
    });
  }

  function saveLocalSettings() {
    localSettings.saveLocalSettings();
    task.setMessage('Local UI settings saved');
  }

  useEffect(() => {
    refreshAll().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AdminShell
    section={section}
    setSection={setSection}
    loadAudit={loadAudit}
    activeProvider={providers.providerSettings?.activeProvider || 'ollama'}
    query={workspace.query}
    setQuery={workspace.setQuery}
    searchEverything={searchEverything}
    busy={task.busy}
    message={task.message}
    error={task.error}
  >
    <AdminViewRouter
      section={section}
      options={options}
      status={workspace.status}
      audit={auditState.audit}
      files={workspace.files}
      filteredFiles={workspace.filteredFiles}
      selectedFile={workspace.selectedFile}
      selectedPreview={workspace.filePreview}
      setSelectedFileId={loadFilePreview}
      query={workspace.query}
      setQuery={workspace.setQuery}
      searchEverything={searchEverything}
      showFilters={workspace.showFilters}
      setShowFilters={workspace.setShowFilters}
      filterExtension={workspace.filterExtension}
      setFilterExtension={workspace.setFilterExtension}
      filterStatus={workspace.filterStatus}
      setFilterStatus={workspace.setFilterStatus}
      extensionOptions={workspace.extensionOptions}
      suggestions={workspace.suggestions}
      previews={planning.previews}
      selectedSuggestionIds={planning.selectedSuggestionIds}
      setSelectedSuggestionIds={planning.setSelectedSuggestionIds}
      createPreview={createPreview}
      previewSelected={previewSelected}
      executePreview={executePreview}
      executeSelectedPreviews={executeSelectedPreviews}
      deepAnalysis={deepAnalysis}
      busy={task.busy}
      openSettings={() => setSection('settings')}
      destinationFolder={localSettings.destinationFolder}
      setDestinationFolder={localSettings.setDestinationFolder}
      totalSize={workspace.totalSize}
      fileTypes={workspace.fileTypes}
      folderPath={localSettings.folderPath}
      setFolderPath={localSettings.setFolderPath}
      selectFolder={selectFolder}
      addTypedSourcePath={addTypedSourcePath}
      setSection={setSection}
      sourcePaths={sources.sourcePaths}
      rescanSource={(source) => consumeSourcePath(source.path, source.watching)}
      pauseSource={pauseSource}
      resumeSource={resumeSource}
      removeSource={removeSource}
      baseUrl={localSettings.baseUrl}
      setBaseUrl={localSettings.setBaseUrl}
      token={localSettings.token}
      setToken={localSettings.setToken}
      saveLocalSettings={saveLocalSettings}
      providerSettings={providers.providerSettings}
      providerModels={providers.providerModels}
      saveAiSettings={saveAiSettings}
      testAiProvider={testAiProvider}
      refreshModels={refreshModels}
      connectionMessage={task.message}
      connectionStatus={task.error ? 'error' : 'idle'}
      saveSettingsFeedback=""
      agentBridgeStatus={agentBridgeStatus}
      agentDetectionResults={agentDetectionResults}
      refreshAgentBridgeStatus={refreshAgentBridgeStatus}
      detectAgent={detectAgent}
      detectAllAgents={detectAllAgents}
      probeAgent={probeAgent}
      chatMessages={chat.chatMessages}
      setChatMessages={chat.setChatMessages}
    />
  </AdminShell>;
}

export default AdminRuntimeApp;
