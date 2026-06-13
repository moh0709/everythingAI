import { useState } from 'react';
import { Activity, AlertTriangle, Bot, CheckCircle2, ShieldCheck, Terminal } from 'lucide-react';
import { agentCatalog } from '../../providerCatalog';
import type { AgentBridgeStatus, AgentDetectionResult, AgentIntegrationSettings } from '../../providerSettingsApi';

type AgentConnectorsPanelProps = {
  agentIntegrations: Record<string, AgentIntegrationSettings>;
  bridgeStatus: AgentBridgeStatus | null;
  detectionResults: Record<string, AgentDetectionResult>;
  probeResults?: Record<string, AgentProbeResult>;
  updateAgentIntegration: (agentId: string, patch: Partial<AgentIntegrationSettings>) => void;
  refreshAgentBridgeStatus: () => void;
  detectAgent: (agentId: string) => void;
  detectAllAgents: () => void;
  probeAgent: (agentId: string) => void;
  busy: boolean;
};

type AgentProbeResult = {
  agentId: string;
  action: string;
  command?: string;
  bridgeEnabled?: boolean;
  ok: boolean;
  stdout: string;
  stderr: string;
  message: string;
};

const PHASE_83A_TARGETS = new Set(['codex', 'claudeCode']);
const DOCUMENTED_NOT_INSTALLED = new Set(['openCode', 'kiloCode', 'cline', 'aider', 'continue']);

function formatArgs(args?: string[]) {
  return Array.isArray(args) ? args.join(' ') : '';
}

function parseArgs(value: string) {
  return value.split(' ').map((item) => item.trim()).filter(Boolean);
}

function connectorHealth({
  agentId,
  config,
  bridgeStatus,
  detection,
  probe,
}: {
  agentId: string;
  config: AgentIntegrationSettings;
  bridgeStatus: AgentBridgeStatus | null;
  detection?: AgentDetectionResult;
  probe?: AgentProbeResult;
}) {
  const status = bridgeStatus?.integrations?.[agentId];

  if (status && !status.commandSafe) {
    return {
      label: 'Unsafe command blocked',
      tone: 'error',
      detail: 'The saved command contains blocked shell characters and will not be detected or probed.',
      nextAction: 'Review the saved command before running diagnostics.',
    };
  }

  if (probe) {
    return {
      label: probe.ok ? 'Version probe passed' : 'Version probe blocked or failed',
      tone: probe.ok ? 'ready' : 'working',
      detail: probe.ok ? (probe.stdout || probe.message) : (probe.stderr || probe.message),
      nextAction: probe.ok ? 'Connector version is visible. Keep chat disabled until explicitly approved.' : 'Check bridge flag, connector enabled state, and PATH detection result.',
    };
  }

  if (detection) {
    if (detection.found) {
      return {
        label: 'Detected on PATH',
        tone: 'ready',
        detail: detection.commandPath || detection.message,
        nextAction: config.enabled ? 'Run Probe Version with bridge flag enabled locally.' : 'Enable the connector only when running controlled local diagnostics.',
      };
    }

    return {
      label: DOCUMENTED_NOT_INSTALLED.has(agentId) ? 'Documented as not installed' : 'Not detected on PATH',
      tone: 'working',
      detail: detection.message,
      nextAction: DOCUMENTED_NOT_INSTALLED.has(agentId)
        ? 'Keep documented as not installed / not on PATH until explicitly installed.'
        : 'Install the CLI or update the saved command path, then run Detect again.',
    };
  }

  if (!bridgeStatus) {
    return {
      label: 'Status not loaded',
      tone: 'working',
      detail: 'Refresh bridge status to inspect connector safety flags.',
      nextAction: 'Click Refresh Bridge, then Detect or Detect All.',
    };
  }

  return {
    label: PHASE_83A_TARGETS.has(agentId) ? 'Phase 8.3A target pending detection' : 'Pending detection',
    tone: 'working',
    detail: status?.commandSafe ? 'Command format is safe, but live PATH detection has not been run in this session.' : 'Command safety is unknown until status refresh completes.',
    nextAction: PHASE_83A_TARGETS.has(agentId) ? 'Run Detect for this Phase 8.3A connector.' : 'Run Detect All when reviewing optional connectors.',
  };
}

export function AgentConnectorsPanel({
  agentIntegrations,
  bridgeStatus,
  detectionResults,
  probeResults = {},
  updateAgentIntegration,
  refreshAgentBridgeStatus,
  detectAgent,
  detectAllAgents,
  probeAgent,
  busy,
}: AgentConnectorsPanelProps) {
  const [expanded, setExpanded] = useState<string | null>('codex');
  const detectedCount = Object.values(detectionResults).filter((result) => result.found).length;
  const missingCount = Object.values(detectionResults).filter((result) => !result.found).length;
  const probePassCount = Object.values(probeResults).filter((result) => result.ok).length;

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

    <div className="settings-help-grid">
      <div>
        <strong><Activity size={16} /> Connector Health Summary</strong>
        <p>{detectedCount} detected · {missingCount} missing after detection · {probePassCount} version probe(s) passed.</p>
      </div>
      <div>
        <strong><ShieldCheck size={16} /> Phase 8.3A scope</strong>
        <p>Primary setup targets are Codex and Claude Code. OpenCode, Kilo Code, Cline, Aider, and Continue stay documented as not installed until explicitly installed.</p>
      </div>
    </div>

    {bridgeStatus && <div className={`status-strip ${bridgeStatus.bridgeEnabled ? 'ready' : 'working'}`}>
      Bridge: {bridgeStatus.bridgeEnabled ? 'enabled' : 'disabled'} · Chat: {bridgeStatus.chatEnabled ? 'enabled' : 'disabled'} · Platform: {bridgeStatus.platform} · Probe timeout: {bridgeStatus.timeoutMs}ms
    </div>}

    {bridgeStatus?.chatEnabled && <div className="status-strip working">
      <AlertTriangle size={14} /> Agent chat is enabled in the local environment. Phase 8.3A diagnostics should keep chat disabled unless explicitly approved.
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
        const probe = probeResults[agent.id];
        const health = connectorHealth({ agentId: agent.id, config, bridgeStatus, detection, probe });
        const isExpanded = expanded === agent.id;
        const isPrimaryTarget = PHASE_83A_TARGETS.has(agent.id);
        const isDocumentedMissing = DOCUMENTED_NOT_INSTALLED.has(agent.id);

        return <div key={agent.id} className="source-card">
          <div className="panel-title">
            <div>
              <strong><Terminal size={16} /> {agent.label}</strong>
              <p>{agent.description}</p>
              <div className="wiki-evidence-badges">
                {isPrimaryTarget ? <span>Phase 8.3A target</span> : null}
                {isDocumentedMissing ? <span>not installed until configured</span> : null}
                <span>{config.enabled ? 'enabled' : 'disabled'}</span>
                <span>{config.command || 'no command'}</span>
                {status ? <span>{status.commandSafe ? 'safe command' : 'unsafe command'}</span> : null}
                {detection ? <span className={detection.found ? '' : 'warning'}>{detection.found ? 'found on PATH' : 'not found'}</span> : null}
                {probe ? <span className={probe.ok ? '' : 'warning'}>{probe.ok ? 'probe passed' : 'probe failed'}</span> : null}
              </div>
            </div>
            <button className="outline" onClick={() => setExpanded(isExpanded ? null : agent.id)}>{isExpanded ? 'Collapse' : 'Configure'}</button>
          </div>

          <div className={`status-strip ${health.tone}`}>
            {health.tone === 'ready' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {health.label}: {health.detail}
          </div>
          <p className="muted">Next action: {health.nextAction}</p>

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
            {probe && <div className={`status-strip ${probe.ok ? 'ready' : 'working'}`}>{probe.message}{probe.stdout ? ` · ${probe.stdout}` : ''}{probe.stderr ? ` · ${probe.stderr}` : ''}</div>}
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
