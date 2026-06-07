import { useState } from 'react';
import { Bot, ShieldCheck, Terminal } from 'lucide-react';
import { agentCatalog } from '../../providerCatalog';
import type { AgentBridgeStatus, AgentDetectionResult, AgentIntegrationSettings } from '../../providerSettingsApi';

type AgentConnectorsPanelProps = {
  agentIntegrations: Record<string, AgentIntegrationSettings>;
  bridgeStatus: AgentBridgeStatus | null;
  detectionResults: Record<string, AgentDetectionResult>;
  updateAgentIntegration: (agentId: string, patch: Partial<AgentIntegrationSettings>) => void;
  refreshAgentBridgeStatus: () => void;
  detectAgent: (agentId: string) => void;
  detectAllAgents: () => void;
  probeAgent: (agentId: string) => void;
  busy: boolean;
};

function formatArgs(args?: string[]) {
  return Array.isArray(args) ? args.join(' ') : '';
}

function parseArgs(value: string) {
  return value.split(' ').map((item) => item.trim()).filter(Boolean);
}

export function AgentConnectorsPanel({
  agentIntegrations,
  bridgeStatus,
  detectionResults,
  updateAgentIntegration,
  refreshAgentBridgeStatus,
  detectAgent,
  detectAllAgents,
  probeAgent,
  busy,
}: AgentConnectorsPanelProps) {
  const [expanded, setExpanded] = useState<string | null>('codex');

  return <section className="panel">
    <div className="panel-title">
      <div>
        <h2><Bot /> Admin Agent Connectors</h2>
        <p>Configure local coding/agent tools for admin/operator workflows only. These connectors are not exposed in the Client Workspace.</p>
      </div>
      <div className="button-row">
        <button className="outline" onClick={refreshAgentBridgeStatus} disabled={busy}>Refresh Bridge</button>
        <button className="outline" onClick={detectAllAgents} disabled={busy}>Detect All</button>
      </div>
    </div>

    <div className="settings-help-grid">
      <div>
        <strong>Execution is disabled by default</strong>
        <p>Local agent probes require <code>EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true</code>. Agent chat also requires <code>EVERYTHINGAI_AGENT_CHAT_ENABLED=true</code>.</p>
      </div>
      <div>
        <strong>Safe bridge boundary</strong>
        <p>The browser cannot submit arbitrary shell commands. Only saved connector commands can be probed or used, and command arguments are constrained.</p>
      </div>
    </div>

    {bridgeStatus && <div className="status-strip ready">
      Bridge: {bridgeStatus.bridgeEnabled ? 'enabled' : 'disabled'} · Chat: {bridgeStatus.chatEnabled ? 'enabled' : 'disabled'} · Platform: {bridgeStatus.platform}
    </div>}

    <div className="provider-grid">
      {agentCatalog.map((agent) => {
        const config = agentIntegrations[agent.id] || {
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
        const status = bridgeStatus?.integrations?.[agent.id];
        const detection = detectionResults[agent.id];
        const isExpanded = expanded === agent.id;

        return <div key={agent.id} className="source-card">
          <div className="panel-title">
            <div>
              <strong><Terminal size={16} /> {agent.label}</strong>
              <p>{agent.description}</p>
              <div className="wiki-evidence-badges">
                <span>{config.enabled ? 'enabled' : 'disabled'}</span>
                <span>{config.command || 'no command'}</span>
                {status ? <span>{status.commandSafe ? 'safe command' : 'unsafe command'}</span> : null}
                {detection ? <span className={detection.found ? '' : 'warning'}>{detection.found ? 'found on PATH' : 'not found'}</span> : null}
              </div>
            </div>
            <button className="outline" onClick={() => setExpanded(isExpanded ? null : agent.id)}>{isExpanded ? 'Collapse' : 'Configure'}</button>
          </div>

          {isExpanded && <div className="settings-grid">
            <label className="setting-check">
              <input
                type="checkbox"
                checked={Boolean(config.enabled)}
                onChange={(event) => updateAgentIntegration(agent.id, { enabled: event.target.checked })}
              />
              Enable connector
            </label>
            <label className="setting-check">
              <input
                type="checkbox"
                checked={Boolean(config.chatEnabled)}
                onChange={(event) => updateAgentIntegration(agent.id, { chatEnabled: event.target.checked })}
              />
              Enable chat for this connector
            </label>
            <label className="setting-check">
              <input
                type="checkbox"
                checked={Boolean(config.allowWorkspaceContext)}
                onChange={(event) => updateAgentIntegration(agent.id, { allowWorkspaceContext: event.target.checked })}
              />
              Allow EverythingAI context
            </label>
            <label>
              Command
              <input value={config.command || ''} onChange={(event) => updateAgentIntegration(agent.id, { command: event.target.value })} />
            </label>
            <label>
              Mode
              <input value={config.mode || 'local-cli'} onChange={(event) => updateAgentIntegration(agent.id, { mode: event.target.value })} />
            </label>
            <label>
              Auth Strategy
              <input value={config.authStrategy || ''} onChange={(event) => updateAgentIntegration(agent.id, { authStrategy: event.target.value })} />
            </label>
            <label>
              Chat Mode
              <select value={config.chatMode || 'stdin'} onChange={(event) => updateAgentIntegration(agent.id, { chatMode: event.target.value })}>
                <option value="stdin">stdin</option>
                <option value="argv">argv</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <label>
              Chat Args
              <input value={formatArgs(config.chatArgs)} onChange={(event) => updateAgentIntegration(agent.id, { chatArgs: parseArgs(event.target.value) })} />
            </label>
            <label>
              Max Input Characters
              <input type="number" value={config.maxInputChars || 12000} onChange={(event) => updateAgentIntegration(agent.id, { maxInputChars: Number(event.target.value) })} />
            </label>
            <label>
              Timeout MS
              <input type="number" value={config.timeoutMs || 120000} onChange={(event) => updateAgentIntegration(agent.id, { timeoutMs: Number(event.target.value) })} />
            </label>
            <div className="button-row">
              <button className="outline" onClick={() => detectAgent(agent.id)} disabled={busy}>Detect</button>
              <button className="outline" onClick={() => probeAgent(agent.id)} disabled={busy || !config.enabled}>Probe Version</button>
            </div>
            {detection && <div className={`status-strip ${detection.found ? 'ready' : 'working'}`}>{detection.message}{detection.commandPath ? ` · ${detection.commandPath}` : ''}</div>}
          </div>}
        </div>;
      })}
    </div>

    <div className="status-strip working">
      <ShieldCheck size={14} /> Agent connectors are admin-only. Normal Client Workspace users continue to chat only through the AI provider selected in Admin Settings.
    </div>
  </section>;
}

export default AgentConnectorsPanel;
