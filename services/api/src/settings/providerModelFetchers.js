function asModel(id, name = id, extra = {}) {
  return { id, name: name || id, ...extra };
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/$/, '');
}

async function fetchJson(url, { token, headers = {}, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function fromOpenAiModelList(payload) {
  return (payload?.data || payload?.models || []).map((model) => asModel(model.id || model.name, model.name || model.id));
}

async function fetchOpenAiCompatibleModels(settings) {
  const headers = {};
  const token = settings.apiKey || undefined;
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/models`, { token, headers });
  if (!payload) return null;
  return fromOpenAiModelList(payload);
}

export async function fetchOllamaModels(settings) {
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/api/tags`);
  if (!payload) return null;
  return (payload.models || []).map((model) => asModel(model.name, model.name, {
    size: model.size,
    modified_at: model.modified_at,
  }));
}

export async function fetchOpenAIModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchAnthropicModels(settings) {
  if (!settings.apiKey) return null;
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/models`, {
    token: settings.apiKey,
    headers: { 'anthropic-version': '2023-06-01' },
  });
  if (!payload) return null;
  return (payload.data || []).map((model) => asModel(model.id, model.display_name || model.id));
}

export async function fetchOpenRouterModels(settings) {
  if (!settings.apiKey) return null;
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/models`, { token: settings.apiKey });
  if (!payload) return null;
  return (payload.data || []).map((model) => asModel(model.id, model.name || model.id, {
    context_length: model.context_length,
    pricing: model.pricing,
  }));
}

export async function fetchCerebrasModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchMistralModels(settings) {
  if (!settings.apiKey) return null;
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/models`, { token: settings.apiKey });
  if (!payload) return null;
  return (payload.data || []).map((model) => asModel(model.id, model.name || model.id, {
    capabilities: model.capabilities,
  }));
}

export async function fetchGoogleModels(settings) {
  if (!settings.apiKey) return null;
  const url = `${normalizeEndpoint(settings.endpoint)}/models?key=${encodeURIComponent(settings.apiKey)}`;
  const payload = await fetchJson(url);
  if (!payload) return null;
  return (payload.models || [])
    .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
    .map((model) => {
      const id = model.name?.replace(/^models\//, '') || model.name;
      return asModel(id, model.displayName || id, {
        version: model.version,
        supportedGenerationMethods: model.supportedGenerationMethods,
      });
    });
}

export async function fetchDeepSeekModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchGroqModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchXaiModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchMoonshotModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchTogetherModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchFireworksModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchPerplexityModels(settings) {
  if (!settings.apiKey) return null;
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchAzureOpenAIModels(settings) {
  if (!settings.apiKey || !settings.endpoint) return null;
  if (settings.deployment) return [asModel(settings.deployment, settings.deployment)];
  return null;
}

export async function fetchLmStudioModels(settings) {
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchCustomOpenAIModels(settings) {
  return fetchOpenAiCompatibleModels(settings);
}

export async function fetchProviderModels(provider, settings) {
  if (provider === 'ollama') return fetchOllamaModels(settings.ollama);
  if (provider === 'openai') return fetchOpenAIModels(settings.openai);
  if (provider === 'anthropic') return fetchAnthropicModels(settings.anthropic);
  if (provider === 'openrouter') return fetchOpenRouterModels(settings.openrouter);
  if (provider === 'cerebras') return fetchCerebrasModels(settings.cerebras);
  if (provider === 'mistral') return fetchMistralModels(settings.mistral);
  if (provider === 'google') return fetchGoogleModels(settings.google);
  if (provider === 'deepseek') return fetchDeepSeekModels(settings.deepseek);
  if (provider === 'groq') return fetchGroqModels(settings.groq);
  if (provider === 'xai') return fetchXaiModels(settings.xai);
  if (provider === 'moonshot') return fetchMoonshotModels(settings.moonshot);
  if (provider === 'together') return fetchTogetherModels(settings.together);
  if (provider === 'fireworks') return fetchFireworksModels(settings.fireworks);
  if (provider === 'perplexity') return fetchPerplexityModels(settings.perplexity);
  if (provider === 'azureOpenAI') return fetchAzureOpenAIModels(settings.azureOpenAI);
  if (provider === 'lmStudio') return fetchLmStudioModels(settings.lmStudio);
  if (provider === 'customOpenAI') return fetchCustomOpenAIModels(settings.customOpenAI);
  return null;
}
