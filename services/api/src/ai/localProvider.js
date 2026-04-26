export function buildPromptContext({ question, sources }) {
  const context = sources.map((source, index) => {
    const reference = `${index + 1}. ${source.filename} (${source.absolute_path})`;
    const snippet = source.snippet ? `\nSnippet: ${source.snippet}` : '';
    return `${reference}${snippet}`;
  }).join('\n\n');

  return [
    'Answer the user question using only the provided local file sources.',
    'Always cite source filenames and paths.',
    '',
    `Question: ${question}`,
    '',
    'Sources:',
    context || 'No sources found.',
  ].join('\n');
}

function getOllamaConfig(options = {}) {
  return {
    baseUrl: options.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    model: options.model || process.env.OLLAMA_MODEL || '',
    timeoutMs: Number.parseInt(options.timeoutMs || process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
    numPredict: Number.parseInt(options.numPredict || process.env.OLLAMA_NUM_PREDICT || '192', 10),
  };
}

function fallbackAnswer({ question, sources, prompt, reason, provider = 'ollama-unconfigured' }) {
  return {
    answer: 'Local LLM execution is not available. Retrieval is ready; configure OLLAMA_MODEL to generate an answer from these sources.',
    provider,
    provider_status: 'unavailable',
    provider_error: reason,
    prompt,
    sources,
  };
}

export async function createLocalChatAnswer({ question, sources, providerOptions = {} }) {
  const prompt = buildPromptContext({ question, sources });
  const config = getOllamaConfig(providerOptions);

  if (!config.model) {
    return fallbackAnswer({
      question,
      sources,
      prompt,
      reason: 'OLLAMA_MODEL is not configured.',
    });
  }

  const fetchImpl = providerOptions.fetchImpl || globalThis.fetch;

  if (!fetchImpl) {
    return fallbackAnswer({
      question,
      sources,
      prompt,
      reason: 'fetch is not available in this Node runtime.',
      provider: 'ollama',
    });
  }

  try {
    const response = await fetchImpl(`${config.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        think: false,
        messages: [
          {
            role: 'system',
            content: 'You are EverythingAI. Answer only from provided local file sources and cite filenames and paths.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        options: {
          temperature: 0.1,
          num_predict: config.numPredict,
        },
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const answer = payload.message?.content || payload.response || '';

    return {
      answer: answer || 'Ollama returned an empty answer.',
      provider: 'ollama',
      provider_status: 'ok',
      model: config.model,
      prompt,
      sources,
    };
  } catch (error) {
    return fallbackAnswer({
      question,
      sources,
      prompt,
      reason: error.message,
      provider: 'ollama',
    });
  }
}
