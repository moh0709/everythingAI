import { useState } from 'react';
import { Activity, AlertTriangle, BookOpen, Bot, CheckCircle2, ClipboardCheck, ShieldCheck, Terminal } from 'lucide-react';
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

const CONNECTOR_SETUP_NOTES: Record<string, Array<{ title: string; detail: string }>> = {
  codex: [
    {
      title: 'Recommended command',
      detail: 'Use the installed Codex CLI command only, for example codex. Keep the Command field simple and avoid chained commands.',
    },
    {
      title: 'External app session',
      detail: 'The connector expects Codex access to be handled by the external Codex app or CLI session. The connector card only stores setup metadata.',
    },
    {
      title: 'Troubleshooting path',
      detail: 'If Detect fails, confirm Codex is installed, restart the local API process so PATH is refreshed, then run Refresh Bridge and Detect again.',
    },
    {
      title: 'Ready-to-advance rule',
      detail: 'Treat Codex as ready only after safe command, PATH detection, enabled diagnostics, bridge flag, version probe, and chat-disabled checks are complete.',
    },
  ],
  claudeCode: [
    {
      title: 'Recommended command',
      detail: 'Use the installed Claude Code CLI command only, for example claude. Keep the Command field simple and avoid chained commands.',
    },
    {
      title: 'External app session',
      detail: 'The connector expects Claude Code access to be handled by the external Claude Code app or CLI session. The connector card only stores setup metadata.',
    },
    {
      title: 'Troubleshooting path',
      detail: 'If Detect fails, confirm Claude Code is installed and visible on PATH, restart the local API process, then run Refresh Bridge and Detect again.',
    },
    {
      title: 'Ready-to-advance rule',
      detail: 'Treat Claude Code as ready only after safe command, PATH detection, enabled diagnostics, bridge flag, version probe, and chat-disabled checks are complete.',
    },
  ],
};

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

function checklistItems({
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
  return [
    {
      label: 'Saved command is safe',
      done: Boolean(status?.commandSafe),
      detail: status?.commandSafe ? 'Command passed browser-side bridge safety inspection.' : 'Refresh bridge status and verify the saved command contains no shell metacharacters.',
    },
    {
      label: 'CLI detected on PATH',
      done: Boolean(detection?.found),
      detail: detection?.found ? (detection.commandPath || detection.message) : 'Run Detect to confirm the local CLI is installed and reachable.',
    },
    {
      label: 'Connector enabled only for controlled diagnostics',
      done: Boolean(config.enabled),
      detail: config.enabled ? 'Connector can be used for safe probe actions when bridge execution is locally enabled.' : 'Keep disabled until you are ready to run controlled local diagnostics.',
    },
    {
      label: 'Bridge execution flag verified locally',
      done: Boolean(bridgeStatus?.bridgeEnabled),
      detail: bridgeStatus?.bridgeEnabled ? 'Safe probe execution is locally enabled.' : 'Set EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true only for controlled local testing.',
    },
    {
      label: 'Version probe completed',
      done: Boolean(probe?.ok),
      detail: probe?.ok ? (probe.stdout || probe.message) : 'Run Probe Version after detect, enable, and bridge flag checks are complete.',
    },
    {
      label: 'Connector chat remains disabled',
      done: !bridgeStatus?.chatEnabled && !config.chatEnabled,
      detail: !bridgeStatus?.chatEnabled && !config.chatEnabled ? 'Chat execution remains off as required for Phase 8.3A.' : 'Disable connector chat and local chat execution unless explicitly approved.',
    },
  ];
}

function readinessText(items: Array<{ done: boolean }>) {
  const done = items.filter((item) => item.done).length;
  return `${done}/${items.length} setup checks complete`;
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

    <div className="settings-help-grid">
      <div>
        <strong><ClipboardCheck size={16} /> Controlled setup checklist</strong>
        <p>Use the checklist on each Codex and Claude Code card before treating a connector as ready. Detection and version probes are allowed; connector chat remains blocked until explicitly approved.</p>
      </div>
      <div>
        <strong><AlertTriangle size={16} /> Operator guardrails</strong>
        <p>Do not enable chat, workspace context, or bridge execution for general users. Client Workspace must stay provider-only and must never expose Agent Connectors.</p>
      </div>
    </div>

    <div className="settings-help-grid">
      <div>
        <strong><BookOpen size={16} /> Connector-specific setup notes</strong>
        <p>Codex and Claude Code cards now include command, external app session, troubleshooting, and ready-to-advance notes for controlled operator setup.</p>
      </div>
      <div>
        <strong><ShieldCheck size={16} /> Readiness rule</strong>
        <p>A connector is not considered ready until the checklist passes and chat remains disabled. Optional connectors remain documented as not installed until explicitly configured.</p>
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
        const setupChecklist = checklistItems({ agentId: agent.id, config, bridgeStatus, detection, probe });
        const setupNotes = CONNECTOR_SETUP_NOTES[agent.id] || [];
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

          {isPrimaryTarget && <div className="status-strip working">
            <ClipboardCheck size={14} /> Controlled setup readiness: {readinessText(setupChecklist)}. Complete detection, safe version probe, and chat-disabled checks before advancing this connector.
          </div>}

          {isExpanded && <div className="settings-grid">
            {isPrimaryTarget && <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <h3><ClipboardCheck size={16} /> Controlled setup checklist</h3>
              <p className="muted">Phase 8.3A allows controlled detection and version probing for Codex and Claude Code only. Chat remains disabled unless explicitly approved later.</p>
              <div className="settings-help-grid">
                {setupChecklist.map((item) => <div key={item.label}>
                  <strong>{item.done ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {item.label}</strong>
                  <p>{item.detail}</p>
                </div>)}
              </div>
            </div>}
            {setupNotes.length > 0 && <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <h3><BookOpen size={16} /> Connector-specific setup notes</h3>
              <p className="muted">These notes are operator guidance only. They do not enable execution, chat, or workspace context.</p>
              <div className="settings-help-grid">
                {setupNotes.map((item) => <div key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>)}
              </div>
            </div>}
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
