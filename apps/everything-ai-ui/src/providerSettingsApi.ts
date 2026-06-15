import { apiRequest, ApiOptions } from './api';

export type ProviderName =
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'cerebras'
  | 'mistral'
  | 'google'
  | 'deepseek'
  | 'groq'
  | 'xai'
  | 'moonshot'
  | 'together'
  | 'fireworks'
  | 'perplexity'
  | 'azureOpenAI'
  | 'lmStudio'
  | 'customOpenAI';

export type ProviderSettings = {
  remoteProvidersEnabled: boolean;
  activeProvider: ProviderName;
  ollama: {
    endpoint: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
  };
  openai: ProviderBlock;
  anthropic: ProviderBlock;
  openrouter: ProviderBlock;
  cerebras: ProviderBlock;
  mistral: ProviderBlock;
  google: ProviderBlock;
  deepseek: ProviderBlock;
  groq: ProviderBlock;
  xai: ProviderBlock;
  moonshot: ProviderBlock;
  together: ProviderBlock;
  fireworks: ProviderBlock;
  perplexity: ProviderBlock;
  azureOpenAI: ProviderBlock & { deployment?: string; apiVersion?: string };
  lmStudio: ProviderBlock;
  customOpenAI: ProviderBlock;
  planning: {
    strategy: string;
    confidenceThreshold: number;
    allowRename: boolean;
    allowMove: boolean;
    allowTag: boolean;
    allowCategory: boolean;
    requireApproval: boolean;
    dryRunOnly: boolean;
  };
  agentIntegrations?: Record<string, AgentIntegrationSettings>;
};

export type ProviderBlock = {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type AgentIntegrationSettings = {
  enabled: boolean;
  mode: string;
  command: string;
  authStrategy: string;
  chatEnabled?: boolean;
  chatMode?: string;
  chatArgs?: string[];
  allowWorkspaceContext?: boolean;
  maxInputChars?: number;
  timeoutMs?: number;
};

export type AgentBridgeStatus = {
  bridgeEnabled: boolean;
  chatEnabled: boolean;
  platform: string;
  cwd: string;
  timeoutMs: number;
  chatTimeoutMs: number;
  supportedSafeActions: string[];
  integrations: Record<string, AgentIntegrationSettings & {
    commandSafe: boolean;
    executionEnabled: boolean;
    chatExecutionEnabled: boolean;
  }>;
  security?: {
    commandExecutionDefault: string;
    chatExecutionDefault: string;
    enableBridgeFlag: string;
    enableChatFlag: string;
    safeProbeActionsOnly: string[];
    arbitraryCommandExecution: boolean;
    notes: string[];
  };
};

export type AgentDetectionResult = {
  agentId: string;
  known: boolean;
  enabled?: boolean;
  command?: string;
  commandPath?: string | null;
  found: boolean;
  mode?: string;
  authStrategy?: string;
  chatEnabled?: boolean;
  message: string;
};

export type AgentProbeResult = {
  agentId: string;
  action: string;
  command?: string;
  bridgeEnabled?: boolean;
  ok: boolean;
  stdout: string;
  stderr: string;
  message: string;
};

export type ProviderModels = Record<ProviderName, Array<{ id: string; name: string }>>;

export async function getProviderSettings(options: ApiOptions) {
  return apiRequest<{ settings: ProviderSettings; providers: ProviderName[] }>(options, '/api/provider-settings');
}

export async function saveProviderSettings(options: ApiOptions, settings: ProviderSettings) {
  return apiRequest<{ settings: ProviderSettings; providers: ProviderName[] }>(options, '/api/provider-settings', settings, 'PUT');
}

export async function getProviderModels(options: ApiOptions) {
  return apiRequest<{ models: ProviderModels; remoteProvidersEnabled: boolean; providers: ProviderName[] }>(options, '/api/provider-settings/models');
}

export async function testProviderConnection(options: ApiOptions, provider: ProviderName) {
  return apiRequest<{ provider: ProviderName; connected: boolean; message: string }>(options, '/api/provider-settings/test', { provider }, 'POST');
}

export async function getAgentBridgeStatus(options: ApiOptions) {
  return apiRequest<AgentBridgeStatus>(options, '/api/agent-bridge/status');
}

export async function detectAgentIntegration(options: ApiOptions, agentId: string) {
  return apiRequest<AgentDetectionResult>(options, '/api/agent-bridge/detect', { agentId }, 'POST');
}

export async function detectAllAgentIntegrations(options: ApiOptions) {
  return apiRequest<{ results: AgentDetectionResult[] }>(options, '/api/agent-bridge/detect-all', {}, 'POST');
}

export async function runAgentProbe(options: ApiOptions, agentId: string, action = 'version') {
  return apiRequest<AgentProbeResult>(options, '/api/agent-bridge/probe', { agentId, action }, 'POST');
}

export async function getAgentIntegrations(options: ApiOptions) {
  return apiRequest<{ integrations: Record<string, AgentIntegrationSettings> }>(options, '/api/agent-bridge/integrations');
}

export async function saveAgentIntegrations(options: ApiOptions, agentIntegrations: Record<string, AgentIntegrationSettings>) {
  return apiRequest<{ integrations: Record<string, AgentIntegrationSettings> }>(options, '/api/agent-bridge/integrations', { agentIntegrations }, 'PUT');
}
