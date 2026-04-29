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

export async function getAgentIntegrations(options: ApiOptions) {
  return apiRequest<{ integrations: Record<string, AgentIntegrationSettings> }>(options, '/api/agent-integrations');
}

export async function saveAgentIntegrations(options: ApiOptions, agentIntegrations: Record<string, AgentIntegrationSettings>) {
  return apiRequest<{ integrations: Record<string, AgentIntegrationSettings> }>(options, '/api/agent-integrations', { agentIntegrations }, 'PUT');
}

export async function testAgentIntegration(options: ApiOptions, integration: string) {
  return apiRequest<{ integration: string; connected: boolean; message: string }>(options, '/api/agent-integrations/test', { integration }, 'POST');
}
