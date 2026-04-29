const providerBlock = ({ endpoint, apiKey = '', model, temperature = 0.2, maxTokens = 4096 }) => ({
  endpoint,
  apiKey,
  model,
  temperature,
  maxTokens,
});

const agentBlock = ({ command, authStrategy, mode = 'local-cli', chatMode = 'stdin', chatArgs = [], enabled = false, chatEnabled = false }) => ({
  enabled,
  mode,
  command,
  authStrategy,
  chatEnabled,
  chatMode,
  chatArgs,
  allowWorkspaceContext: false,
  maxInputChars: 12000,
  timeoutMs: 120000,
});

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
  openai: providerBlock({ endpoint: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-4o-mini' }),
  anthropic: providerBlock({ endpoint: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1', apiKey: process.env.ANTHROPIC_API_KEY || '', model: 'claude-3-5-sonnet-latest' }),
  openrouter: providerBlock({ endpoint: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY || '', model: 'anthropic/claude-3.5-sonnet' }),
  cerebras: providerBlock({ endpoint: process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY || '', model: 'llama3.1-8b' }),
  mistral: providerBlock({ endpoint: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1', apiKey: process.env.MISTRAL_API_KEY || '', model: 'mistral-large-latest' }),
  google: providerBlock({ endpoint: process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta', apiKey: process.env.GOOGLE_AI_API_KEY || '', model: 'gemini-1.5-flash' }),
  deepseek: providerBlock({ endpoint: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1', apiKey: process.env.DEEPSEEK_API_KEY || '', model: 'deepseek-chat' }),
  groq: providerBlock({ endpoint: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY || '', model: 'llama-3.3-70b-versatile' }),
  xai: providerBlock({ endpoint: process.env.XAI_BASE_URL || 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY || '', model: 'grok-2-latest' }),
  moonshot: providerBlock({ endpoint: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1', apiKey: process.env.MOONSHOT_API_KEY || '', model: 'moonshot-v1-8k' }),
  together: providerBlock({ endpoint: process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1', apiKey: process.env.TOGETHER_API_KEY || '', model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' }),
  fireworks: providerBlock({ endpoint: process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1', apiKey: process.env.FIREWORKS_API_KEY || '', model: 'accounts/fireworks/models/llama-v3p1-70b-instruct' }),
  perplexity: providerBlock({ endpoint: process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai', apiKey: process.env.PERPLEXITY_API_KEY || '', model: 'sonar' }),
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    model: process.env.AZURE_OPENAI_DEPLOYMENT || 'azure-deployment',
    temperature: 0.2,
    maxTokens: 4096,
  },
  lmStudio: providerBlock({ endpoint: process.env.LMSTUDIO_BASE_URL || 'http://127.0.0.1:1234/v1', apiKey: process.env.LMSTUDIO_API_KEY || '', model: 'local-model' }),
  customOpenAI: providerBlock({ endpoint: process.env.CUSTOM_OPENAI_BASE_URL || 'http://127.0.0.1:8000/v1', apiKey: process.env.CUSTOM_OPENAI_API_KEY || '', model: 'custom-model' }),
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
  agentIntegrations: {
    codex: agentBlock({ command: 'codex', authStrategy: 'codex-app', chatArgs: ['exec', '-'] }),
    kiloCode: agentBlock({ command: 'kilo', authStrategy: 'external-app', chatArgs: ['chat', '--stdin'] }),
    openCode: agentBlock({ command: 'opencode', authStrategy: 'external-app', chatArgs: ['run', '-'] }),
    claudeCode: agentBlock({ command: 'claude', authStrategy: 'external-app', chatArgs: ['-p'] }),
    aider: agentBlock({ command: 'aider', authStrategy: 'local-config', chatArgs: ['--message'] }),
    continue: agentBlock({ command: 'continue', authStrategy: 'local-config', mode: 'config-bridge', chatMode: 'disabled' }),
    cline: agentBlock({ command: 'cline', authStrategy: 'local-config', mode: 'config-bridge', chatMode: 'disabled' }),
  },
};

export const PROVIDERS = [
  'ollama', 'openai', 'anthropic', 'openrouter', 'cerebras', 'mistral', 'google', 'deepseek', 'groq', 'xai', 'moonshot', 'together', 'fireworks', 'perplexity', 'azureOpenAI', 'lmStudio', 'customOpenAI',
];

export const REMOTE_PROVIDERS = PROVIDERS.filter((provider) => provider !== 'ollama' && provider !== 'lmStudio' && provider !== 'customOpenAI');

export function getDefaultAiProviderSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

export function mergeAiProviderSettings(settings = {}) {
  const defaults = getDefaultAiProviderSettings();
  const merged = { ...defaults, ...settings };
  for (const provider of PROVIDERS) {
    merged[provider] = { ...defaults[provider], ...(settings[provider] || {}) };
  }
  merged.planning = { ...defaults.planning, ...(settings.planning || {}) };
  merged.agentIntegrations = Object.fromEntries(Object.entries(defaults.agentIntegrations).map(([key, value]) => [
    key,
    { ...value, ...((settings.agentIntegrations || {})[key] || {}) },
  ]));
  return merged;
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
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'o4-mini', name: 'o4-mini' },
    ],
    anthropic: [
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' },
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
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
    groq: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ],
    xai: [
      { id: 'grok-2-latest', name: 'Grok 2' },
      { id: 'grok-2-vision-latest', name: 'Grok 2 Vision' },
    ],
    moonshot: [
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K' },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K' },
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K' },
    ],
    together: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo' },
    ],
    fireworks: [
      { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B Instruct' },
      { id: 'accounts/fireworks/models/mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct' },
    ],
    perplexity: [
      { id: 'sonar', name: 'Sonar' },
      { id: 'sonar-pro', name: 'Sonar Pro' },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning' },
    ],
    azureOpenAI: [
      { id: 'azure-deployment', name: 'Azure OpenAI Deployment' },
    ],
    lmStudio: [
      { id: 'local-model', name: 'LM Studio Local Model' },
    ],
    customOpenAI: [
      { id: 'custom-model', name: 'Custom OpenAI-Compatible Model' },
    ],
  };
}
