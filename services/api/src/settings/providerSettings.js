const DEFAULT_PROVIDER = 'ollama';

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultSettings(env = process.env) {
  return {
    provider: DEFAULT_PROVIDER,
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      model: env.OLLAMA_MODEL || '',
      timeoutMs: positiveInteger(env.OLLAMA_TIMEOUT_MS, 120000),
      numPredict: positiveInteger(env.OLLAMA_NUM_PREDICT, 192),
    },
  };
}

let providerSettings = defaultSettings();

export function getProviderSettings() {
  return structuredClone(providerSettings);
}

export function updateProviderSettings(input = {}) {
  const nextProvider = input.provider === 'ollama' ? input.provider : DEFAULT_PROVIDER;
  const ollama = input.ollama || {};

  providerSettings = {
    provider: nextProvider,
    ollama: {
      baseUrl: typeof ollama.baseUrl === 'string' && ollama.baseUrl.trim()
        ? ollama.baseUrl.trim()
        : providerSettings.ollama.baseUrl,
      model: typeof ollama.model === 'string' ? ollama.model.trim() : providerSettings.ollama.model,
      timeoutMs: positiveInteger(ollama.timeoutMs, providerSettings.ollama.timeoutMs),
      numPredict: positiveInteger(ollama.numPredict, providerSettings.ollama.numPredict),
    },
  };

  return getProviderSettings();
}

export function resetProviderSettings(env = process.env) {
  providerSettings = defaultSettings(env);
  return getProviderSettings();
}
