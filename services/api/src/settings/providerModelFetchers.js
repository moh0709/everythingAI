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

export async function fetchOllamaModels(settings) {
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/api/tags`);
  if (!payload) return null;
  return (payload.models || []).map((model) => asModel(model.name, model.name, {
    size: model.size,
    modified_at: model.modified_at,
  }));
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
  const payload = await fetchJson(`${normalizeEndpoint(settings.endpoint)}/models`, { token: settings.apiKey });
  if (!payload) return null;
  return (payload.data || payload.models || []).map((model) => asModel(model.id || model.name, model.name || model.id));
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

export async function fetchProviderModels(provider, settings) {
  if (provider === 'ollama') return fetchOllamaModels(settings.ollama);
  if (provider === 'openrouter') return fetchOpenRouterModels(settings.openrouter);
  if (provider === 'cerebras') return fetchCerebrasModels(settings.cerebras);
  if (provider === 'mistral') return fetchMistralModels(settings.mistral);
  if (provider === 'google') return fetchGoogleModels(settings.google);
  return null;
}
