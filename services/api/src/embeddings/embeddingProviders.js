const LOCAL_MODEL_NAME = 'everythingai-local-token-v1';
const LOCAL_DIMENSIONS = 256;

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
    id: 'local-token',
    model: LOCAL_MODEL_NAME,
    dimensions: LOCAL_DIMENSIONS,
    async embed(text) {
      const vector = new Array(LOCAL_DIMENSIONS).fill(0);
      const tokens = tokenizeForEmbedding(text);

      for (const token of tokens) {
        vector[hashToken(token)] += 1;
      }

      const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
      const normalized = magnitude ? vector.map((value) => value / magnitude) : vector;

      return {
        model: LOCAL_MODEL_NAME,
        vector: normalized,
        tokenCount: tokens.length,
      };
    },
  };
}

export function createEmbeddingProvider(provider = {}) {
  if (provider?.embed && provider?.model) {
    return provider;
  }

  return createLocalTokenEmbeddingProvider();
}

export const DEFAULT_EMBEDDING_MODEL = LOCAL_MODEL_NAME;
