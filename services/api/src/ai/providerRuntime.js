import { openDatabase, getAppSetting } from '../db/client.js';
import { mergeAiProviderSettings, getDefaultAiProviderSettings, REMOTE_PROVIDERS } from '../settings/aiProviderSettings.js';
import { fetchOllamaModels } from '../settings/providerModelFetchers.js';
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

function isNodeTestRunner() {
  return Boolean(process.env.NODE_TEST_CONTEXT) || process.execArgv.includes('--test');
}

function loadAiProviderSettings(db) {
  if (db) {
    return mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
  }

  const defaultDb = openDatabase();
  const settings = mergeAiProviderSettings(getAppSetting(defaultDb, SETTINGS_KEY) || getDefaultAiProviderSettings());
  defaultDb.close();
  return settings;
}

function classifyProviderError(reason = '') {
  const text = String(reason || '');
  if (/remote providers are disabled/i.test(text)) {
    return {
      code: 'remote_policy_disabled',
      hint: 'Enable remote providers in Settings before using this provider.',
    };
  }
  if (/api key is missing/i.test(text)) {
    return {
      code: 'missing_api_key',
      hint: 'Add the provider credential in Settings and save the AI provider configuration.',
    };
  }
  if (/no model is selected|deployment is missing|no ollama model/i.test(text)) {
    return {
      code: 'missing_model',
      hint: 'Select a model for this provider or refresh the model list in Settings.',
    };
  }
  if (/endpoint is missing/i.test(text)) {
    return {
      code: 'missing_endpoint',
      hint: 'Add the provider endpoint URL in Settings.',
    };
  }
  if (/HTTP\s+401|HTTP\s+403/i.test(text)) {
    return {
      code: 'auth_failed',
      hint: 'Check that the provider credential is valid and has access to the selected model.',
    };
  }
  if (/HTTP\s+404/i.test(text)) {
    return {
      code: 'model_or_endpoint_not_found',
      hint: 'Check the endpoint URL and selected model name.',
    };
  }
  if (/HTTP\s+429/i.test(text)) {
    return {
      code: 'rate_limited',
      hint: 'The provider is rate-limiting requests. Wait or choose another provider/model.',
    };
  }
  if (/HTTP\s+5\d\d/i.test(text)) {
    return {
      code: 'provider_server_error',
      hint: 'The provider returned a server error. Retry later or choose another provider.',
    };
  }
  if (/abort|timeout|timed out/i.test(text)) {
    return {
      code: 'timeout',
      hint: 'The provider request timed out. Increase timeout or choose a faster/local model.',
    };
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(text)) {
    return {
      code: 'network_error',
      hint: 'Check that the provider endpoint is reachable from the backend machine.',
    };
  }
  return {
    code: 'provider_unavailable',
    hint: 'Review the provider settings, endpoint, credential, and selected model.',
  };
}

function unavailable({ provider, reason, prompt, sources }) {
  const classified = classifyProviderError(reason);
  return {
    answer: `${provider} execution is not available: ${reason}`,
    provider,
    provider_status: 'unavailable',
    provider_error: reason,
    provider_error_code: classified.code,
    provider_error_hint: classified.hint,
    prompt,
    sources,
  };
}

function isLikelyEmbeddingModel(modelId = '') {
  return /embed|embedding|nomic/i.test(modelId);
}

async function resolveOllamaModel(settings) {
  if (settings.model) return settings.model;

  if (isNodeTestRunner()) {
    return '';
  }

  const liveModels = await fetchOllamaModels({
    endpoint: settings.endpoint,
  });

  const firstChatModel = liveModels?.find((model) => !isLikelyEmbeddingModel(model.id || model.name));
  return firstChatModel?.id || liveModels?.[0]?.id || '';
}

async function callOllama({ settings, messages, prompt, sources }) {
  const provider = 'ollama';
  const model = await resolveOllamaModel(settings);

  if (!model) {
    return unavailable({
      provider: 'ollama-unconfigured',
      reason: 'No Ollama model is configured and no live Ollama models were found.',
      prompt,
      sources,
    });
  }

  try {
    const response = await fetch(`${normalizeEndpoint(settings.endpoint)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        messages,
        options: {
          temperature: settings.temperature,
          num_predict: settings.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(Number(settings.timeoutMs) || 120000),
    });

    if (!response.ok) throw new Error(`Ollama request failed with HTTP ${response.status}`);
    const payload = await response.json();
    return {
      answer: payload.message?.content || payload.response || 'Ollama returned an empty answer.',
      provider,
      provider_status: 'ok',
      model,
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

async function callConfiguredProvider({ settings, provider, messages, prompt, sources }) {
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

export async function createConfiguredChatAnswer({ db, question, sources, overrideProvider } = {}) {
  const settings = loadAiProviderSettings(db);
  const provider = overrideProvider || settings.activeProvider || 'ollama';
  const prompt = buildPromptContext({ question, sources });
  const messages = [
    {
      role: 'system',
      content: `You are EverythingAI, a helpful assistant that knows about the user's local files.

Behavior:
- Answer questions naturally and conversationally.
- Use the retrieved file context below ONLY when it is genuinely relevant to the question.
- If the user asks a general question (e.g. "how does X work?"), answer it directly without mentioning files.
- If the user asks about their files, documents, or content, draw from the context and mention specific filenames naturally in your answer.
- Do NOT dump a list of sources unless the user explicitly asks for a file list.
- Keep answers concise. Use bullet points only when listing truly distinct items.
- Never say "Based on the provided sources" or "According to the context" — just answer naturally.`,
    },
    { role: 'user', content: prompt },
  ];

  return callConfiguredProvider({ settings, provider, messages, prompt, sources });
}

export async function createConfiguredPlanningAnswer({ db, file, deterministicAnalysis, overrideProvider } = {}) {
  const settings = loadAiProviderSettings(db);
  const provider = overrideProvider || settings.activeProvider || 'ollama';
  const extractedText = (file.extracted_text || '').slice(0, 4000);
  const prompt = JSON.stringify({
    task: 'Create safe file organization suggestions for EverythingAI.',
    file: {
      id: file.id,
      filename: file.filename,
      relative_path: file.relative_path,
      extension: file.extension,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      extracted_text: extractedText,
    },
    deterministic_baseline: deterministicAnalysis,
    allowed_action_types: ['category', 'tag', 'move', 'rename'],
    output_contract: {
      suggestions: [
        {
          action_type: 'category | tag | move | rename',
          suggested_value: 'short safe value',
          reason: 'short factual explanation',
          confidence: 'number between 0 and 1',
          risk_level: 'low | medium | high',
        },
      ],
    },
  });
  const messages = [
    {
      role: 'system',
      content: `You generate safe, reviewable file organization suggestions for EverythingAI.

Rules:
- Return JSON only. No markdown. No prose outside JSON.
- Use only these action_type values: category, tag, move, rename.
- Do not suggest destructive actions.
- Move suggestions must be relative folder labels only, not absolute paths.
- Rename suggestions must be filenames only, not paths.
- Keep category, tag, and folder labels short and lowercase when possible.
- Every suggestion must require human approval downstream.
- Prefer practical suggestions that are grounded in filename, metadata, and extracted text.`,
    },
    { role: 'user', content: prompt },
  ];

  return callConfiguredProvider({
    settings,
    provider,
    messages,
    prompt,
    sources: [{
      id: file.id,
      filename: file.filename,
      absolute_path: file.absolute_path,
      snippet: extractedText.slice(0, 500),
    }],
  });
}
