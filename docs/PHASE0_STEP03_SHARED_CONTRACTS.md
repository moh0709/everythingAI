# Phase 0 — Step 0.3 Shared Contracts & Canonical Models

## Status

```text
COMPLETE
```

## Objective

Define canonical shared contracts for EverythingAI so future modules use stable, predictable data shapes.

This document is part of **Improvement Project One**.

---

# Contract Design Principles

## Principle 1 — Stable internal models

Runtime modules should exchange canonical contracts instead of raw database rows whenever possible.

```text
Database row ≠ application contract
```

Database rows can evolve independently from service contracts.

---

## Principle 2 — Path is metadata, not identity

Files can move or be renamed.

Therefore a file must not be identified only by path.

Canonical identity should use:

```text
fileId
sourceRootId
contentHash
optional deviceId later
```

---

## Principle 3 — Search, Chat, and Wiki share references

All knowledge access surfaces must use the same source reference model.

```text
Search Result
Chat Answer
Wiki Page
  ↓
SourceReference[]
```

---

## Principle 4 — Planning is separate from execution

Planning contracts must never imply that an action has happened.

```text
PlanningSuggestion = proposed intent
ActionPreview = validated possible action
ActionExecution = actual completed/failed action
```

---

## Principle 5 — Contracts should support MVP and future production

Each contract must work with:

```text
SQLite local MVP
PostgreSQL future
pgvector/Qdrant future
client-agent future
multi-tenant future
```

---

# Canonical Contracts

## 1. IndexedFile

Represents a discovered/indexed file.

```ts
export type IndexedFile = {
  fileId: string;
  sourceRootId?: string | null;
  deviceId?: string | null;
  tenantId?: string | null;

  filename: string;
  absolutePath: string;
  relativePath: string;
  extension: string;
  mimeType?: string | null;
  sizeBytes?: number | null;

  createdAt?: string | null;
  modifiedAt?: string | null;
  discoveredAt?: string | null;
  lastIndexedAt: string;
  lastSeenAt?: string | null;

  contentHash?: string | null;
  partialHash?: string | null;

  indexStatus: 'indexed' | 'failed' | 'skipped';
  errorMessage?: string | null;
};
```

### Notes

Current MVP maps this primarily from:

```text
indexed_files
```

Future production may add:

```text
tenantId
deviceId
sourceRootId
partialHash
lastSeenAt
```

---

## 2. SourcePath

Represents a user-approved filesystem scope.

```ts
export type SourcePath = {
  sourceRootId: string;
  path: string;
  status: 'active' | 'paused' | 'stopped' | 'failed' | 'removed';
  watching: boolean;
  lastRun?: string | null;
  lastEventAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
};
```

### Notes

Current MVP maps this from:

```text
watch_roots
```

---

## 3. ExtractedContent

Represents extracted text and metadata for a file.

```ts
export type ExtractedContent = {
  fileId: string;
  text: string;
  status: 'extracted' | 'failed' | 'unsupported' | 'skipped';
  extractorName?: string | null;
  extractedAt: string;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;

  chunks?: ExtractedChunk[];
};
```

---

## 4. ExtractedChunk

Represents a searchable/retrievable chunk of text.

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
  createdAt: string;
};
```

### Notes

Current MVP mostly stores full extracted text.

Future vector architecture should move toward chunk-level retrieval.

---

## 5. EmbeddingRecord

Represents a vector embedding for a file or chunk.

```ts
export type EmbeddingRecord = {
  embeddingId?: string;
  fileId: string;
  chunkId?: string | null;
  model: string;
  provider: string;
  dimensions?: number | null;
  vector: number[];
  tokenCount?: number | null;
  generatedAt: string;
};
```

### Notes

Current MVP maps this from:

```text
file_embeddings
```

Future architecture should support chunk-level embeddings.

---

## 6. FileInsight

Represents generated understanding about a file.

```ts
export type FileInsight = {
  fileId: string;
  summary?: string | null;
  classification?: string | null;
  entities: Record<string, unknown>;
  provider: string;
  status: 'generated' | 'failed';
  errorMessage?: string | null;
  generatedAt: string;
};
```

---

## 7. KnowledgePage

Represents a generated Wikipedia-style knowledge page.

```ts
export type KnowledgePage = {
  pageId: string;
  pageType: 'topic' | 'entity' | 'document' | 'manual' | 'help' | 'technical';
  title: string;
  slug: string;
  summary?: string | null;
  body: string;
  sections: KnowledgeSection[];
  sourceReferences: SourceReference[];
  relatedPages?: RelatedKnowledgePage[];
  generatedAt: string;
  updatedAt: string;
};
```

---

## 8. KnowledgeSection

```ts
export type KnowledgeSection = {
  sectionId: string;
  title: string;
  body: string;
  order: number;
  sourceReferences?: SourceReference[];
};
```

---

## 9. RelatedKnowledgePage

```ts
export type RelatedKnowledgePage = {
  pageId: string;
  title: string;
  slug: string;
  relationType: 'same_topic' | 'same_entity' | 'source_overlap' | 'manual_related' | 'custom';
  confidence?: number | null;
};
```

---

## 10. SourceReference

Canonical reference to the origin of information.

```ts
export type SourceReference = {
  sourceId: string;
  sourceType: 'file' | 'chunk' | 'insight' | 'knowledge_page' | 'manual_page' | 'help_page';

  fileId?: string | null;
  chunkId?: string | null;
  pageId?: string | null;

  filename?: string | null;
  absolutePath?: string | null;
  relativePath?: string | null;

  snippet?: string | null;
  score?: number | null;
  rank?: number | null;

  metadata?: Record<string, unknown>;
};
```

### Rule

Any answer, search result, or wiki page should be explainable through source references.

---

## 11. SearchRequest

Canonical user search request.

```ts
export type SearchRequest = {
  query: string;
  mode?: SearchMode;
  limit?: number;
  filters?: SearchFilters;
  includeSources?: boolean;
};

export type SearchMode =
  | 'auto'
  | 'files'
  | 'content'
  | 'semantic'
  | 'entities'
  | 'wiki';
```

---

## 12. SearchFilters

```ts
export type SearchFilters = {
  sourceRootId?: string;
  extension?: string[];
  mimeType?: string[];
  dateFrom?: string;
  dateTo?: string;
  minSizeBytes?: number;
  maxSizeBytes?: number;
  tags?: string[];
  category?: string;
  status?: string[];
};
```

---

## 13. SearchIntent

Represents the system's interpretation of the query.

```ts
export type SearchIntent = {
  primaryIntent:
    | 'find_file'
    | 'find_content'
    | 'semantic_question'
    | 'explore_topic'
    | 'find_entity'
    | 'manual_help'
    | 'unknown';

  confidence: number;
  reasons: string[];
  retrievalPlan: RetrievalPlan;
};
```

---

## 14. RetrievalPlan

```ts
export type RetrievalPlan = {
  useMetadataSearch: boolean;
  useKeywordSearch: boolean;
  useSemanticSearch: boolean;
  useKnowledgePages: boolean;
  useManualPages: boolean;
  usePlanningData: boolean;
  rankingStrategy: 'exact_first' | 'semantic_first' | 'hybrid' | 'manual_first';
};
```

---

## 15. RetrievalResult

Unified result from the retrieval layer.

```ts
export type RetrievalResult = {
  resultId: string;
  resultType:
    | 'file'
    | 'content_match'
    | 'semantic_match'
    | 'knowledge_page'
    | 'manual_page'
    | 'entity'
    | 'planning_record';

  title: string;
  description?: string | null;
  snippet?: string | null;

  score: number;
  rank: number;
  sourceReferences: SourceReference[];

  file?: IndexedFile;
  knowledgePage?: KnowledgePage;
  metadata?: Record<string, unknown>;
};
```

---

## 16. SearchResponse

```ts
export type SearchResponse = {
  query: string;
  mode: SearchMode;
  intent: SearchIntent;
  results: RetrievalResult[];
  totals: {
    total: number;
    files: number;
    content: number;
    semantic: number;
    wiki: number;
    entities: number;
  };
};
```

---

## 17. ChatRequest

```ts
export type ChatRequest = {
  question: string;
  mode?: 'auto' | 'knowledge' | 'manual' | 'technical' | 'help';
  provider?: string;
  limit?: number;
  filters?: SearchFilters;
};
```

---

## 18. ChatAnswer

```ts
export type ChatAnswer = {
  question: string;
  answer: string;
  provider: string;
  providerStatus: 'ok' | 'unavailable' | 'failed' | 'fallback';
  model?: string | null;
  sourceReferences: SourceReference[];
  retrievalResults: RetrievalResult[];
  confidence?: number | null;
  errorMessage?: string | null;
};
```

---

## 19. PlanningSession

Groups planning work into a user-controlled session.

```ts
export type PlanningSession = {
  planningSessionId: string;
  sourceRootId?: string | null;
  status: 'draft' | 'running' | 'ready' | 'approved' | 'executed' | 'failed' | 'cancelled';
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  settings: PlanningSettings;
  summary?: PlanningSessionSummary;
};
```

---

## 20. PlanningSettings

```ts
export type PlanningSettings = {
  allowRename: boolean;
  allowMove: boolean;
  allowTag: boolean;
  allowCategory: boolean;
  dryRunOnly: boolean;
  requireApproval: boolean;
  confidenceThreshold: number;
  provider?: string | null;
  useProvider: boolean;
};
```

---

## 21. PlanningSessionSummary

```ts
export type PlanningSessionSummary = {
  totalFilesAnalyzed: number;
  totalSuggestions: number;
  readyPreviews: number;
  blockedPreviews: number;
  averageConfidence?: number | null;
};
```

---

## 22. PlanningSuggestion

```ts
export type PlanningSuggestion = {
  suggestionId: string;
  planningSessionId?: string | null;
  fileId: string;
  actionType: 'tag' | 'category' | 'rename' | 'move';
  currentValue?: string | null;
  suggestedValue: string;
  reason: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  createdAt: string;
  source: 'deterministic' | 'provider' | 'manual' | 'hybrid';
};
```

---

## 23. ActionPreview

Validated preview of a possible action.

```ts
export type ActionPreview = {
  previewId: string;
  suggestionId: string;
  planningSessionId?: string | null;
  fileId: string;
  actionType: 'tag' | 'category' | 'rename' | 'move';
  sourcePath?: string | null;
  targetPath?: string | null;
  currentValue?: string | null;
  suggestedValue: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  canExecute: boolean;
  blockedReason?: string | null;
  previewStatus: 'ready' | 'blocked';
  createdAt: string;
};
```

---

## 24. ActionExecution

Actual attempted or completed execution.

```ts
export type ActionExecution = {
  executionId: string;
  previewId: string;
  planningSessionId?: string | null;
  fileId: string;
  actionType: 'tag' | 'category' | 'rename' | 'move';
  status: 'executed' | 'undone' | 'failed';
  sourcePath?: string | null;
  targetPath?: string | null;
  undoSourcePath?: string | null;
  undoTargetPath?: string | null;
  errorMessage?: string | null;
  executedAt: string;
  undoneAt?: string | null;
};
```

---

## 25. JobRecord

Canonical job abstraction for future async execution.

```ts
export type JobRecord = {
  jobId: string;
  jobType:
    | 'INDEX_SOURCE'
    | 'EXTRACT_FILES'
    | 'GENERATE_EMBEDDINGS'
    | 'BUILD_KNOWLEDGE'
    | 'RUN_PLANNING'
    | 'CREATE_PREVIEWS'
    | 'EXECUTE_ACTIONS'
    | 'SYNC_INTEGRATION';

  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progressPercent?: number | null;
  currentStep?: string | null;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};
```

---

## 26. PipelineEvent

Canonical lifecycle event.

```ts
export type PipelineEvent = {
  eventId: string;
  eventType:
    | 'FILE_DISCOVERED'
    | 'FILE_INDEXED'
    | 'EXTRACTION_COMPLETED'
    | 'EMBEDDING_GENERATED'
    | 'KNOWLEDGE_UPDATED'
    | 'PLANNING_STARTED'
    | 'PREVIEW_CREATED'
    | 'ACTION_APPROVED'
    | 'ACTION_EXECUTED'
    | 'ACTION_UNDONE'
    | 'JOB_STARTED'
    | 'JOB_COMPLETED'
    | 'JOB_FAILED';

  entityType: 'file' | 'source_path' | 'job' | 'planning_session' | 'preview' | 'execution' | 'knowledge_page';
  entityId: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};
```

---

## 27. ApiResponse

Standard API response envelope.

```ts
export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

### Note

The current MVP does not consistently use this envelope yet.

This should be introduced gradually to avoid frontend regressions.

---

# Mapping Current MVP Tables to Contracts

| Current table | Canonical contract |
|---|---|
| indexed_files | IndexedFile |
| watch_roots | SourcePath |
| file_extractions | ExtractedContent |
| file_embeddings | EmbeddingRecord |
| file_insights | FileInsight |
| organization_suggestions | PlanningSuggestion |
| action_previews | ActionPreview |
| action_executions | ActionExecution |
| audit_log | PipelineEvent / AuditEvent |
| file_labels | FileLabel / IndexedFile metadata |
| app_settings | AppSetting |

---

# Required Future Contract Files

When implementation begins, these contracts should eventually become real code under a shared location such as:

```text
services/api/src/contracts/*
```

or later:

```text
packages/shared/contracts/*
```

Recommended future files:

```text
services/api/src/contracts/files.contracts.js
services/api/src/contracts/knowledge.contracts.js
services/api/src/contracts/retrieval.contracts.js
services/api/src/contracts/chat.contracts.js
services/api/src/contracts/planning.contracts.js
services/api/src/contracts/actions.contracts.js
services/api/src/contracts/jobs.contracts.js
services/api/src/contracts/events.contracts.js
services/api/src/contracts/api.contracts.js
```

For the current Phase 0 step, this document is the canonical specification.

---

# Known MVP Gaps Against These Contracts

## Gap 1 — No planning sessions yet

Current suggestions are individual records.

Future fix:

```text
PlanningSession
PlanningSnapshot
PlanningBatch
```

---

## Gap 2 — Embeddings are file-level, not chunk-level

Current MVP stores one vector per file.

Future fix:

```text
ExtractedChunk
chunk-level embeddings
```

---

## Gap 3 — Unified search has no formal intent object

Current unified search aggregates results manually.

Future fix:

```text
SearchIntent
RetrievalPlan
Knowledge Access Router
```

---

## Gap 4 — API response envelope is not standardized

Current routes return different response shapes.

Future fix:

```text
ApiResponse<T>
```

introduced carefully after frontend impact review.

---

## Gap 5 — Source references are not fully standardized

Current search/chat results may expose source-like data differently.

Future fix:

```text
SourceReference[]
```

used everywhere.

---

# Step 0.3 Due Diligence

## Architecture consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Future production compatibility

```text
PASS
```

## Runtime regression risk

```text
LOW
```

This step is contract/documentation only and does not change runtime behavior.

## Implementation readiness

```text
PASS
```

---

# Result

```text
Step 0.3 passes due diligence.
```

The project can proceed to:

```text
Step 0.4 — Define Lifecycle Event System
```
