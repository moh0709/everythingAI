import { openDatabase, getAppSetting } from '../db/client.js';
import { mergeAiProviderSettings, getDefaultAiProviderSettings, REMOTE_PROVIDERS } from '../settings/aiProviderSettings.js';
import { buildPromptContext } from './localProvider.js';

const SETTINGS_KEY = 'ai_provider_settings';
const OPENAI_COMPATIBLE_PROVIDERS = [
  'openai',
  'openrouter',
  'cerebras',
  'mistral',
  'deepseek',
  'groq',
  'xai',
  'moonshot',
  'together',
  'fireworks',
  'perplexity',
  'lmStudio',
  'customOpenAI',
];

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/$/, '');
}

function loadAiProviderSettings() {
  const db = openDatabase();
  const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
  db.close();
  return settings;
}

function unavailable({ provider, reason, prompt, sources }) {
  return {
    answer: `${provider} execution is not available: ${reason}`,
    provider,
    provider_status: 'unavailable',
    provider_error: reason,
    prompt,
    sources,
  };
}

async function callOllama({ settings, messages, prompt, sources }) {
  const provider = 'ollama';
  if (!settings.model) return unavailable({ provider, reason: 'No Ollama model is selected.', prompt, sources });

  try {
    const response = await fetch(`${normalizeEndpoint(settings.endpoint)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        think: false,
        messages,
        options: {
          temperature: settings.temperature,
          num_predict: settings.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(settings.timeoutMs || 120000),
    });

    if (!response.ok) throw new Error(`Ollama request failed with HTTP ${response.status}`);
    const payload = await response.json();
    return {
      answer: payload.message?.content || payload.response || 'Ollama returned an empty answer.',
      provider,
      provider_status: 'ok',
      model: settings.model,
      prompt,
      sources,
    };
  } catch (error) {
    return unavailable({ provider, reason: error.message, prompt, sources });
  }
}

async function callOpenAiCompatible({ provider, settings, messages, prompt, sources }) {
  if (provider !== 'lmStudio' && provider !== 'customOpenAI' && !settings.apiKey) return unavailable({ provider, reason: 'API key is missing.', prompt, sources });
  if (!settings.model) return unavailable({ provider, reason: 'No model is selected.', prompt, sources });

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

    const response = await fetch(`${normalizeEndpoint(settings.endpoint)}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) throw new Error(`${provider} request failed with HTTP ${response.status}`);
    const payload = await response.json();
    return {
      answer: payload.choices?.[0]?.message?.content || `${provider} returned an empty answer.`,
      provider,
      provider_status: 'ok',
      model: settings.model,
      prompt,
      sources,
    };
  } catch (error) {
    return unavailable({ provider, reason: error.message, prompt, sources });
  }
}

async function callAnthropic({ settings, messages, prompt, sources }) {
  const provider = 'anthropic';
  if (!settings.apiKey) return unavailable({ provider, reason: 'API key is missing.', prompt, sources });
  if (!settings.model) return unavailable({ provider, reason: 'No model is selected.', prompt, sources });

  try {
    const response = await fetch(`${normalizeEndpoint(settings.endpoint)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        system: messages.find((message) => message.role === 'system')?.content || '',
        messages: messages.filter((message) => message.role !== 'system'),
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) throw new Error(`Anthropic request failed with HTTP ${response.status}`);
    const payload = await response.json();
    const answer = payload.content?.map((item) => item.text).join('') || 'Anthropic returned an empty answer.';
    return { answer, provider, provider_status: 'ok', model: settings.model, prompt, sources };
  } catch (error) {
    return unavailable({ provider, reason: error.message, prompt, sources });
  }
}

async function callGoogle({ settings, messages, prompt, sources }) {
  const provider = 'google';
  if (!settings.apiKey) return unavailable({ provider, reason: 'API key is missing.', prompt, sources });
  if (!settings.model) return unavailable({ provider, reason: 'No model is selected.', prompt, sources });

  const combined = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');

  try {
    const url = `${normalizeEndpoint(settings.endpoint)}/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: combined }] }],
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) throw new Error(`Google AI request failed with HTTP ${response.status}`);
    const payload = await response.json();
    const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || 'Google AI returned an empty answer.';
    return { answer, provider, provider_status: 'ok', model: settings.model, prompt, sources };
  } catch (error) {
    return unavailable({ provider, reason: error.message, prompt, sources });
  }
}

async function callAzureOpenAI({ settings, messages, prompt, sources }) {
  const provider = 'azureOpenAI';
  const deployment = settings.deployment || settings.model;
  if (!settings.apiKey) return unavailable({ provider, reason: 'API key is missing.', prompt, sources });
  if (!settings.endpoint) return unavailable({ provider, reason: 'Azure endpoint is missing.', prompt, sources });
  if (!deployment) return unavailable({ provider, reason: 'Azure deployment is missing.', prompt, sources });

  try {
    const url = `${normalizeEndpoint(settings.endpoint)}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(settings.apiVersion || '2024-02-15-preview')}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': settings.apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) throw new Error(`Azure OpenAI request failed with HTTP ${response.status}`);
    const payload = await response.json();
    return {
      answer: payload.choices?.[0]?.message?.content || 'Azure OpenAI returned an empty answer.',
      provider,
      provider_status: 'ok',
      model: deployment,
      prompt,
      sources,
    };
  } catch (error) {
    return unavailable({ provider, reason: error.message, prompt, sources });
  }
}

export async function createConfiguredChatAnswer({ question, sources, overrideProvider } = {}) {
  const settings = loadAiProviderSettings();
  const provider = overrideProvider || settings.activeProvider || 'ollama';
  const prompt = buildPromptContext({ question, sources });
  const messages = [
    {
      role: 'system',
      content: 'You are EverythingAI. Answer only from provided local file sources and cite filenames and paths.',
    },
    { role: 'user', content: prompt },
  ];

  if (REMOTE_PROVIDERS.includes(provider) && !settings.remoteProvidersEnabled) {
    return unavailable({ provider, reason: 'Remote providers are disabled by policy.', prompt, sources });
  }

  if (provider === 'ollama') return callOllama({ settings: settings.ollama, messages, prompt, sources });
  if (provider === 'google') return callGoogle({ settings: settings.google, messages, prompt, sources });
  if (provider === 'anthropic') return callAnthropic({ settings: settings.anthropic, messages, prompt, sources });
  if (provider === 'azureOpenAI') return callAzureOpenAI({ settings: settings.azureOpenAI, messages, prompt, sources });
  if (OPENAI_COMPATIBLE_PROVIDERS.includes(provider)) return callOpenAiCompatible({ provider, settings: settings[provider], messages, prompt, sources });

  return unavailable({ provider, reason: 'Unknown provider.', prompt, sources });
}
