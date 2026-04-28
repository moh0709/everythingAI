const DEFAULT_SETTINGS = {
  remoteProvidersEnabled: false,
  activeProvider: 'ollama',
  ollama: {
    endpoint: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'llama2',
    temperature: 0.2,
    maxTokens: Number.parseInt(process.env.OLLAMA_NUM_PREDICT || '192', 10),
    timeoutMs: Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
  },
  openrouter: {
    endpoint: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.2,
    maxTokens: 4096,
  },
  cerebras: {
    endpoint: process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1',
    apiKey: process.env.CEREBRAS_API_KEY || '',
    model: 'llama3.1-8b',
    temperature: 0.2,
    maxTokens: 4096,
  },
  mistral: {
    endpoint: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
    apiKey: process.env.MISTRAL_API_KEY || '',
    model: 'mistral-large-latest',
    temperature: 0.2,
    maxTokens: 4096,
  },
  google: {
    endpoint: process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    maxTokens: 4096,
  },
  planning: {
    strategy: 'content-first',
    confidenceThreshold: 0.65,
    allowRename: true,
    allowMove: true,
    allowTag: true,
    allowCategory: true,
    requireApproval: true,
    dryRunOnly: false,
  },
};

export function getDefaultAiProviderSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

export function mergeAiProviderSettings(settings = {}) {
  return {
    ...getDefaultAiProviderSettings(),
    ...settings,
    ollama: { ...DEFAULT_SETTINGS.ollama, ...(settings.ollama || {}) },
    openrouter: { ...DEFAULT_SETTINGS.openrouter, ...(settings.openrouter || {}) },
    cerebras: { ...DEFAULT_SETTINGS.cerebras, ...(settings.cerebras || {}) },
    mistral: { ...DEFAULT_SETTINGS.mistral, ...(settings.mistral || {}) },
    google: { ...DEFAULT_SETTINGS.google, ...(settings.google || {}) },
    planning: { ...DEFAULT_SETTINGS.planning, ...(settings.planning || {}) },
  };
}

export function listDefaultModels() {
  return {
    ollama: [
      { id: 'llama2', name: 'Llama 2' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'codellama', name: 'CodeLlama' },
      { id: 'qwen3.5:2b', name: 'Qwen 3.5 2B' },
      { id: 'nomic-embed-text', name: 'Nomic Embed Text' },
    ],
    openrouter: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct' },
    ],
    cerebras: [
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B' },
      { id: 'llama3.1-70b', name: 'Llama 3.1 70B' },
      { id: 'qwen-3-32b', name: 'Qwen 3 32B' },
    ],
    mistral: [
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium' },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
    ],
    google: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
    ],
  };
}
