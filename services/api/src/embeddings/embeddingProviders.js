const LOCAL_MODEL_NAME = 'everythingai-local-token-v1';
const LOCAL_DIMENSIONS = 256;
const LOCAL_PROVIDER_ID = 'deterministic-local-mvp';

export function tokenizeForEmbedding(text) {
  return (text || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2) || [];
}

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % LOCAL_DIMENSIONS;
}

export function createLocalTokenEmbeddingProvider() {
  return {
    id: LOCAL_PROVIDER_ID,
    providerId: LOCAL_PROVIDER_ID,
    providerType: 'deterministic-local',
    model: LOCAL_MODEL_NAME,
    dimensions: LOCAL_DIMENSIONS,
    embed(text) {
      const vector = new Array(LOCAL_DIMENSIONS).fill(0);
      const tokens = tokenizeForEmbedding(text);

      for (const token of tokens) {
        vector[hashToken(token)] += 1;
      }

      const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
      const normalized = magnitude ? vector.map((value) => value / magnitude) : vector;

      return {
        model: LOCAL_MODEL_NAME,
        provider: LOCAL_PROVIDER_ID,
        dimensions: LOCAL_DIMENSIONS,
        vector: normalized,
        tokenCount: tokens.length,
      };
    },
    async embedText({ text }) {
      return this.embed(text);
    },
    async embedBatch({ items }) {
      return {
        results: items.map((item) => ({
          id: item.id,
          ...this.embed(item.text),
        })),
      };
    },
  };
}

export function createEmbeddingProvider(provider = {}) {
  if (provider?.embed && provider?.model) {
    return {
      id: provider.id || provider.providerId || 'custom',
      providerId: provider.providerId || provider.id || 'custom',
      providerType: provider.providerType || 'custom',
      dimensions: provider.dimensions ?? null,
      ...provider,
    };
  }

  if ((provider?.embedText || provider?.embedBatch) && provider?.model) {
    const providerId = provider.providerId || provider.id || 'custom';

    return {
      id: providerId,
      providerId,
      providerType: provider.providerType || 'custom',
      model: provider.model,
      dimensions: provider.dimensions ?? null,
      async embed(text, metadata = {}) {
        if (!provider.embedText) {
          const batch = await provider.embedBatch({
            items: [{ id: 'single', text, metadata }],
          });
          return batch.results?.[0];
        }
        return provider.embedText({ text, metadata });
      },
      async embedText(input) {
        if (provider.embedText) return provider.embedText(input);
        const batch = await provider.embedBatch({
          items: [{ id: 'single', text: input.text, metadata: input.metadata }],
        });
        return batch.results?.[0];
      },
      async embedBatch(input) {
        if (provider.embedBatch) return provider.embedBatch(input);
        return {
          results: await Promise.all(input.items.map(async (item) => ({
            id: item.id,
            ...(await provider.embedText({ text: item.text, metadata: item.metadata })),
          }))),
        };
      },
      testConnection: provider.testConnection,
    };
  }

  return createLocalTokenEmbeddingProvider();
}

export const DEFAULT_EMBEDDING_MODEL = LOCAL_MODEL_NAME;
