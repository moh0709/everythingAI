# Phase 0 — Step 0.7 Embedding Provider Abstraction

## Status

```text
COMPLETE
```

## Objective

Define the official embedding provider abstraction for EverythingAI so semantic search, retrieval, chat, and future vector storage can evolve without locking the project to one embedding method or database.

This document is part of **Improvement Project One**.

---

# Core Principle

Embeddings are not the knowledge base.

Embeddings are one retrieval layer inside the knowledge access system.

Correct architecture:

```text
Extracted Content / Chunks
  ↓
Embedding Provider
  ↓
Embedding Records
  ↓
Vector Storage / Similarity Search
  ↓
Hybrid Retrieval
```

The relational database remains the source of truth for files, metadata, planning, previews, execution, audit, and workflow.

---

# Why an Embedding Abstraction Is Required

The current MVP uses deterministic local vector-style embeddings.

That is acceptable for MVP, but future EverythingAI must support:

```text
- deterministic local embeddings
- Ollama embeddings
- local BGE/nomic models
- OpenAI-compatible embeddings
- pgvector storage
- Qdrant / Weaviate storage
- chunk-level embeddings
- re-embedding when models change
```

Without abstraction, each future change would require rewriting retrieval and knowledge logic.

---

# Embedding System Responsibilities

The Embedding system is responsible for:

```text
- selecting an embedding provider
- preparing text chunks
- generating vectors
- storing vector metadata
- detecting stale embeddings
- supporting re-embedding
- exposing vectors to semantic retrieval
```

The Embedding system is NOT responsible for:

```text
- deciding final search ranking alone
- generating chat answers
- generating planning suggestions directly
- executing file actions
- replacing relational metadata
```

---

# Main Components

## 1. Chunking Strategy

Splits extracted text into retrievable units.

Future module:

```text
services/api/src/embeddings/chunkingStrategy.js
```

## 2. Embedding Provider

Generates vectors from text.

Future module examples:

```text
services/api/src/embeddings/providers/deterministicEmbeddingProvider.js
services/api/src/embeddings/providers/ollamaEmbeddingProvider.js
services/api/src/embeddings/providers/openAiCompatibleEmbeddingProvider.js
```

## 3. Embedding Store

Persists vectors and metadata.

Future repository:

```text
services/api/src/repositories/embeddingsRepository.js
```

## 4. Semantic Retrieval Adapter

Uses stored vectors to retrieve similar content.

Future module:

```text
services/api/src/retrieval/adapters/semanticRetrievalAdapter.js
```

---

# Embedding Provider Interface

Canonical interface:

```ts
export type EmbeddingProvider = {
  providerId: string;
  providerType: 'deterministic-local' | 'ollama' | 'openai-compatible' | 'local-model' | 'custom';
  model: string;
  dimensions?: number | null;

  embedText(input: EmbedTextInput): Promise<EmbedTextResult>;
  embedBatch(input: EmbedBatchInput): Promise<EmbedBatchResult>;
  testConnection?(): Promise<ProviderConnectionResult>;
};
```

---

# EmbedTextInput

```ts
export type EmbedTextInput = {
  text: string;
  metadata?: Record<string, unknown>;
};
```

---

# EmbedTextResult

```ts
export type EmbedTextResult = {
  vector: number[];
  model: string;
  provider: string;
  dimensions: number;
  tokenCount?: number | null;
  usage?: Record<string, unknown>;
};
```

---

# EmbedBatchInput

```ts
export type EmbedBatchInput = {
  items: Array<{
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>;
};
```

---

# EmbedBatchResult

```ts
export type EmbedBatchResult = {
  results: Array<{
    id: string;
    vector: number[];
    model: string;
    provider: string;
    dimensions: number;
    tokenCount?: number | null;
    errorMessage?: string | null;
  }>;
};
```

---

# ProviderConnectionResult

```ts
export type ProviderConnectionResult = {
  ok: boolean;
  provider: string;
  model?: string | null;
  errorMessage?: string | null;
};
```

---

# Chunking Contract

## ExtractedChunk

```ts
export type ExtractedChunk = {
  chunkId: string;
  fileId: string;
  chunkIndex: number;
  text: string;
  tokenCount?: number | null;
  pageNumber?: number | null;
  sectionTitle?: string | null;
  extractionMethod?: string | null;
  contentHash?: string | null;
  createdAt: string;
};
```

---

# Chunking Rules

## Rule 1 — Chunks must preserve source identity

Each chunk must reference:

```text
fileId
chunkId
chunkIndex
```

## Rule 2 — Chunks must support source references

Each retrieval result should be able to point back to:

```text
file
chunk
snippet
page/section when available
```

## Rule 3 — Chunks must be stable where possible

Chunk IDs should be deterministic when possible using:

```text
fileId + chunkIndex + contentHash
```

This improves re-embedding and caching.

## Rule 4 — Full document text should not be passed blindly to embeddings

Long documents should be chunked before embedding.

## Rule 5 — Chunking strategy should be replaceable

Future strategies may include:

```text
fixed-size chunks
sentence-aware chunks
heading-aware chunks
page-aware chunks
semantic chunks
```

---

# Embedding Record Contract

```ts
export type EmbeddingRecord = {
  embeddingId: string;
  fileId: string;
  chunkId?: string | null;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
  tokenCount?: number | null;
  contentHash: string;
  status: 'embedded' | 'failed' | 'stale' | 'skipped';
  errorMessage?: string | null;
  generatedAt: string;
};
```

---

# Embedding Job Contract

```ts
export type EmbeddingJob = {
  jobId: string;
  jobType: 'GENERATE_EMBEDDINGS' | 'REGENERATE_STALE_EMBEDDINGS';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  model: string;
  sourceRootId?: string | null;
  fileId?: string | null;
  totalItems?: number;
  completedItems?: number;
  failedItems?: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};
```

---

# Provider Types

## 1. deterministic-local

Current MVP style.

Best for:

```text
- offline MVP
- deterministic tests
- zero external dependency
```

Limitations:

```text
- not true neural semantic understanding
- lower quality for natural-language meaning
```

---

## 2. ollama

Local model provider.

Best for:

```text
- local-first semantic quality
- privacy-sensitive deployments
- no cloud dependency
```

Example models:

```text
nomic-embed-text
bge-m3
mxbai-embed-large
```

---

## 3. openai-compatible

Remote or local OpenAI-compatible embedding endpoint.

Best for:

```text
- hosted model providers
- LM Studio-compatible APIs
- OpenRouter-like future services if embeddings supported
```

---

## 4. local-model

Direct locally hosted embedding runtime.

Best for:

```text
- advanced local deployments
- custom embedding service
- GPU/CPU optimized local inference
```

---

## 5. custom

Reserved for user-defined providers.

---

# Vector Storage Strategy

## Current MVP

Current storage:

```text
SQLite file_embeddings.vector_json
```

This is acceptable for MVP.

## Future local/production options

```text
PostgreSQL + pgvector
Qdrant
Weaviate
SQLite vector extension if suitable
```

## Important rule

Vector storage must be abstracted from retrieval logic.

Retrieval should ask:

```text
semanticRetrievalAdapter.search(query)
```

not directly query a specific vector database.

---

# Re-Embedding Strategy

Embeddings become stale when:

```text
- extracted text changes
- chunking strategy changes
- embedding provider changes
- embedding model changes
- embedding dimensions change
- file content hash changes
```

When stale:

```text
EmbeddingRecord.status = stale
```

Then a re-embedding job can be queued:

```text
REGENERATE_STALE_EMBEDDINGS
```

---

# Embedding Versioning

Every embedding must store:

```text
provider
model
dimensions
contentHash
generatedAt
```

Recommended future addition:

```text
chunkingStrategyVersion
embeddingPipelineVersion
```

This allows safe model migrations.

---

# Semantic Retrieval Rules

## Rule 1 — Semantic retrieval must degrade gracefully

If embeddings are unavailable:

```text
fallback to keyword + metadata retrieval
```

## Rule 2 — Semantic retrieval must return source references

Every semantic result must trace back to:

```text
fileId
chunkId when available
snippet
score
```

## Rule 3 — Semantic retrieval does not answer questions directly

It retrieves context.

Chat or UI layers decide how to present it.

## Rule 4 — Semantic score is not final score

Hybrid ranker decides final score using:

```text
semantic score
keyword score
metadata match
freshness
source confidence
manual/wiki boost
```

---

# Privacy Rules

Embedding providers must not send text to remote providers unless remote provider use is explicitly enabled.

For production:

```text
workspace/provider policy must control remote embedding use
```

Current MVP should remain local-first by default.

---

# MVP Mapping

Current MVP module:

```text
services/api/src/embeddings/embeddingService.js
```

Current MVP table:

```text
file_embeddings
```

Current semantic search:

```text
services/api/src/search/semanticSearch.js
```

Future target:

```text
EmbeddingProvider interface
chunk-level embedding records
semanticRetrievalAdapter
vector store abstraction
```

---

# Known MVP Gaps

## Gap 1 — File-level embeddings only

Current MVP embeds at file level.

Future fix:

```text
chunk-level embeddings
```

---

## Gap 2 — No provider abstraction yet

Current embedding logic is tied to deterministic generation.

Future fix:

```text
EmbeddingProvider interface
```

---

## Gap 3 — No embedding model selection UI/policy yet

Future fix:

```text
embedding provider settings
```

separate from chat provider settings where needed.

---

## Gap 4 — No stale/re-embedding lifecycle yet

Future fix:

```text
stale detection + re-embedding jobs
```

---

## Gap 5 — Vector storage not abstracted yet

Future fix:

```text
VectorStoreAdapter
```

for pgvector/Qdrant/other systems.

---

# Recommended Future Module Structure

```text
services/api/src/embeddings/embeddingProviderRegistry.js
services/api/src/embeddings/chunkingStrategy.js
services/api/src/embeddings/embeddingPipeline.js
services/api/src/embeddings/providers/deterministicEmbeddingProvider.js
services/api/src/embeddings/providers/ollamaEmbeddingProvider.js
services/api/src/embeddings/providers/openAiCompatibleEmbeddingProvider.js
services/api/src/vector/vectorStoreAdapter.js
services/api/src/retrieval/adapters/semanticRetrievalAdapter.js
```

Recommended future contracts:

```text
services/api/src/contracts/embeddings.contracts.js
services/api/src/contracts/vector.contracts.js
```

Recommended future tests:

```text
services/api/test/embeddingProvider.test.js
services/api/test/chunkingStrategy.test.js
services/api/test/semanticRetrievalAdapter.test.js
services/api/test/reEmbedding.test.js
```

---

# Step 0.7 Due Diligence

## Architecture consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Local-first compatibility

```text
PASS
```

## Future vector migration compatibility

```text
PASS
```

## Retrieval compatibility

```text
PASS
```

## Runtime regression risk

```text
LOW
```

This step is documentation and architecture-contract only. It does not change runtime behavior.

---

# Result

```text
Step 0.7 passes due diligence.
```

The project can proceed to:

```text
Step 0.8 — Define Planning Session Architecture
```
