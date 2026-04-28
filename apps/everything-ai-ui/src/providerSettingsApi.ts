import { apiRequest, ApiOptions } from './api';

export type ProviderName = 'ollama' | 'openrouter' | 'cerebras' | 'mistral' | 'google';

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
  openrouter: ProviderBlock;
  cerebras: ProviderBlock;
  mistral: ProviderBlock;
  google: ProviderBlock;
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
};

export type ProviderBlock = {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type ProviderModels = Record<ProviderName, Array<{ id: string; name: string }>>;

export async function getProviderSettings(options: ApiOptions) {
  return apiRequest<{ settings: ProviderSettings }>(options, '/api/provider-settings');
}

export async function saveProviderSettings(options: ApiOptions, settings: ProviderSettings) {
  return apiRequest<{ settings: ProviderSettings }>(options, '/api/provider-settings', settings, 'PUT');
}

export async function getProviderModels(options: ApiOptions) {
  return apiRequest<{ models: ProviderModels; remoteProvidersEnabled: boolean }>(options, '/api/provider-settings/models');
}

export async function testProviderConnection(options: ApiOptions, provider: ProviderName) {
  return apiRequest<{ provider: ProviderName; connected: boolean; message: string }>(options, '/api/provider-settings/test', { provider }, 'POST');
}
