import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import type { AgentBridgeStatus, AgentDetectionResult, AgentIntegrationSettings, AgentProbeResult, ProviderModels, ProviderName, ProviderSettings } from '../../providerSettingsApi';
import type { SourcePathRecord } from '../../sourcePathsApi';
import { AgentConnectorsPanel } from './AgentConnectorsPanel';
import { PlanningPolicyPanel } from './PlanningPolicyPanel';
import { ProviderConfigurationPanel } from './ProviderConfigurationPanel';
import { ProviderSelectorPanel } from './ProviderSelectorPanel';

type SettingsViewProps = {
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  folderPath: string;
  setFolderPath: (value: string) => void;
  destinationFolder: string;
  setDestinationFolder: (value: string) => void;
  saveLocalSettings: () => void;
  sourcePaths: SourcePathRecord[];
  providerSettings: ProviderSettings | null;
  providerModels: ProviderModels | null;
  saveAiSettings: (settings: ProviderSettings) => void;
  testAiProvider: (provider: ProviderName) => void;
  refreshModels: () => void;
  connectionMessage: string;
  connectionStatus: 'idle' | 'ok' | 'error';
  saveSettingsFeedback: string;
  agentBridgeStatus?: AgentBridgeStatus | null;
  agentDetectionResults?: Record<string, AgentDetectionResult>;
  agentProbeResults?: Record<string, AgentProbeResult>;
  refreshAgentBridgeStatus?: () => void;
  detectAgent?: (agentId: string) => void;
  detectAllAgents?: () => void;
  probeAgent?: (agentId: string) => void;
  busy?: boolean;
};

function noop() {}

export function SettingsView({
  baseUrl,
  setBaseUrl,
  token,
  setToken,
  folderPath,
  setFolderPath,
  destinationFolder,
  setDestinationFolder,
  saveLocalSettings,
  sourcePaths,
  providerSettings,
  providerModels,
  saveAiSettings,
  testAiProvider,
  refreshModels,
  connectionMessage,
  connectionStatus,
  saveSettingsFeedback,
  agentBridgeStatus = null,
  agentDetectionResults = {},
  agentProbeResults = {},
  refreshAgentBridgeStatus = noop,
  detectAgent = noop,
  detectAllAgents = noop,
  probeAgent = noop,
  busy = false,
}: SettingsViewProps) {
  const [draft, setDraft] = useState<ProviderSettings | null>(providerSettings);
  const [filter, setFilter] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => setDraft(providerSettings), [providerSettings]);

  if (!draft) {
    return <section>
      <h1><Settings /> Advanced Settings</h1>
      <div className="panel">Loading provider settings...</div>
    </section>;
  }

  const activeDraft = draft;

  function update(path: string, value: unknown) {
    const copy: any = JSON.parse(JSON.stringify(activeDraft));
    const keys = path.split('.');
    let current = copy;
    keys.slice(0, -1).forEach((key) => { current = current[key]; });
    current[keys[keys.length - 1]] = value;
    setDraft(copy);
  }

  function updateAgentIntegration(agentId: string, patch: Partial<AgentIntegrationSettings>) {
    const current = activeDraft.agentIntegrations?.[agentId] || {
      enabled: false,
      mode: 'local-cli',
      command: '',
      authStrategy: 'external-app',
      chatEnabled: false,
      chatMode: 'stdin',
      chatArgs: [],
      allowWorkspaceContext: false,
      maxInputChars: 12000,
      timeoutMs: 120000,
    };
    setDraft({
      ...activeDraft,
      agentIntegrations: {
        ...(activeDraft.agentIntegrations || {}),
        [agentId]: {
          ...current,
          ...patch,
        },
      },
    });
  }

  async function handleTest() {
    setTesting(true);
    await testAiProvider(activeDraft.activeProvider);
    setTesting(false);
  }

  const statusTone = connectionStatus === 'error' ? 'error' : 'ready';

  return <section>
    <div className="settings-header">
      <div>
        <h1><Settings /> Advanced Settings</h1>
        <p>Configure local API connection, AI providers, admin-only agent connectors, planning policy, and operator scope.</p>
      </div>
      <div className="button-row">
        <button className="outline" onClick={refreshModels}>Refresh Models</button>
        <button className="outline" onClick={handleTest} disabled={testing}>{testing ? 'Testing...' : 'Test Connection'}</button>
        <button onClick={() => saveAiSettings(activeDraft)}>Save AI Settings</button>
      </div>
    </div>

    {connectionMessage && <div className={`status-strip ${statusTone}`}>{connectionMessage}</div>}
    {saveSettingsFeedback && <div className="status-strip ready">{saveSettingsFeedback}</div>}

    <section className="panel">
      <h2>Local API & Workspace</h2>
      <p className="muted">These values are stored locally in the browser and control how this admin UI connects to the local API.</p>
      <div className="settings-grid">
        <label>
          API Base URL
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <label>
          API Token
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        <label>
          Default Folder Path
          <input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} />
        </label>
        <label>
          Destination Folder / Planning Label
          <input value={destinationFolder} onChange={(event) => setDestinationFolder(event.target.value)} />
        </label>
      </div>
      <div className="button-row">
        <button className="outline" onClick={saveLocalSettings}>Save Local Settings</button>
        <span className="scope-pill">{sourcePaths.length} scoped path(s)</span>
      </div>
    </section>

    <ProviderSelectorPanel
      activeProvider={activeDraft.activeProvider}
      remoteProvidersEnabled={activeDraft.remoteProvidersEnabled}
      filter={filter}
      setFilter={setFilter}
      onSelectProvider={(provider) => update('activeProvider', provider)}
      onRemoteProvidersEnabledChange={(enabled) => update('remoteProvidersEnabled', enabled)}
    />

    <ProviderConfigurationPanel
      draft={activeDraft}
      providerModels={providerModels}
      update={update}
    />

    <AgentConnectorsPanel
      agentIntegrations={activeDraft.agentIntegrations || {}}
      bridgeStatus={agentBridgeStatus}
      detectionResults={agentDetectionResults}
      probeResults={agentProbeResults}
      updateAgentIntegration={updateAgentIntegration}
      refreshAgentBridgeStatus={refreshAgentBridgeStatus}
      detectAgent={detectAgent}
      detectAllAgents={detectAllAgents}
      probeAgent={probeAgent}
      busy={busy}
    />

    <PlanningPolicyPanel
      planning={activeDraft.planning}
      update={update}
    />
  </section>;
}

export default SettingsView;
