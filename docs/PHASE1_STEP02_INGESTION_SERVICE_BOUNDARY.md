# Phase 1 — Step 1.2 Target Ingestion Service Boundary

## Status

```text
COMPLETE
```

## Objective

Define the target runtime boundary for the EverythingAI ingestion service before making implementation changes.

This step prepares the first safe runtime refactor in Phase 1.

---

# Why This Boundary Is Needed

The current MVP has ingestion orchestration spread across:

```text
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/watcher/watchService.js
services/api/src/automation/localPipeline.js
```

This makes it too easy for ingestion to trigger unrelated behavior such as planning suggestions.

The target architecture requires:

```text
Routes → Ingestion Service → Scanner / Repositories / Knowledge Pipeline
```

and must prevent:

```text
Ingestion → Planning Suggestions
```

---

# Current Runtime Problem

Current pipeline:

```text
scanFolder()
  ↓
runLocalAutomationPipeline()
  ↓
extractIndexedFiles()
  ↓
generateEmbeddings()
  ↓
generateFileInsights()
  ↓
buildKnowledgeIndex()
  ↓
generatePreviewSuggestions()
```

The final `generatePreviewSuggestions()` step is planning behavior and should not run automatically during ingestion.

---

# Target Runtime Boundary

## New module target

```text
services/api/src/ingestion/ingestionService.js
```

## Responsibility

The ingestion service owns the orchestration of automatic knowledge ingestion.

It may call:

```text
scanFolder()
extractIndexedFiles()
generateEmbeddings()
generateFileInsights()
buildKnowledgeIndex()
```

It must not call:

```text
generatePreviewSuggestions()
createActionPreview()
executeActionPreview()
```

---

# Target Service Methods

## indexSourcePath()

```ts
export async function indexSourcePath(db, options): Promise<IngestionResult>
```

### Options

```ts
type IndexSourcePathOptions = {
  folderPath: string;
  limit?: number;
  autoKnowledge?: boolean;
  useOllama?: boolean;
  logger?: Console;
};
```

### Responsibility

```text
- scan folder
- upsert indexed files
- optionally run knowledge ingestion pipeline
- return normalized ingestion result
```

---

## runKnowledgeIngestionPipeline()

```ts
export async function runKnowledgeIngestionPipeline(db, options): Promise<KnowledgeIngestionResult>
```

### Responsibility

```text
- run extraction
- run embeddings
- run insights
- build knowledge index
- return normalized result
```

### Must not do

```text
- generate planning suggestions
- create previews
- execute actions
```

---

## rescanSourcePath()

```ts
export async function rescanSourcePath(db, options): Promise<IngestionResult>
```

### Responsibility

Same as `indexSourcePath`, but intended for existing source paths/watch roots.

---

# Target Result Contracts

## IngestionResult

```ts
type IngestionResult = {
  sourcePath: string;
  scan: ScanResult;
  knowledge?: KnowledgeIngestionResult | null;
  warnings: string[];
  errors: Array<{ message: string; path?: string }>;
};
```

---

## ScanResult

```ts
type ScanResult = {
  rootPath: string;
  maxFileSizeBytes: number;
  scanned: number;
  indexed: number;
  failed: number;
  skipped: number;
  skipped_unchanged: number;
  skipped_large: number;
  skipped_excluded: number;
  skippedReasons: Array<{ reason: string; path: string }>;
};
```

This maps closely to the current `scanFolder()` result.

---

## KnowledgeIngestionResult

```ts
type KnowledgeIngestionResult = {
  extraction: object | null;
  embeddings: object | null;
  insights: object | null;
  knowledge: object | null;
};
```

Important:

```text
No suggestions field.
```

Planning suggestions belong to a separate future planning service.

---

# Compatibility Strategy

Existing routes should keep working while delegating orchestration to the service.

## Existing route compatibility

```text
POST /api/index
POST /api/source-paths
POST /api/watch
```

should continue returning useful response data.

## Response compatibility rule

Avoid removing existing top-level response fields unless required.

When changing `automation`, prefer mapping to:

```text
automation.knowledge
```

or keeping `automation` but removing planning-side effects.

---

# Watcher Integration Target

Current watcher directly runs:

```text
runLocalAutomationPipeline()
```

Target watcher behavior:

```text
watcher cycle
  ↓
scanFolder()
  ↓
runKnowledgeIngestionPipeline()
```

Watcher must not generate suggestions.

---

# Planning Integration Target

Planning remains available through explicit user-triggered routes.

Current explicit route:

```text
POST /api/suggestions
```

Future target:

```text
POST /api/planning/sessions/:sessionId/run
```

For Phase 1, keep explicit suggestion generation working.

---

# First Runtime Change Recommendation

The safest implementation step is to modify:

```text
services/api/src/automation/localPipeline.js
```

by adding a new function:

```text
runKnowledgeIngestionPipeline()
```

and preserving the old function temporarily if needed for compatibility.

Recommended safe structure:

```js
export async function runKnowledgeIngestionPipeline(...) {
  extraction
  embeddings
  insights
  knowledge
}

export async function runPlanningPipeline(...) {
  suggestions
}

export async function runLocalAutomationPipeline(...) {
  // compatibility wrapper if needed
}
```

Then update ingestion/watcher routes to use:

```text
runKnowledgeIngestionPipeline()
```

instead of:

```text
runLocalAutomationPipeline()
```

---

# Files Likely Affected in Step 1.3

```text
services/api/src/automation/localPipeline.js
services/api/src/routes/files.routes.js
services/api/src/routes/sourcePaths.routes.js
services/api/src/watcher/watchService.js
services/api/test/localMvp.test.js
```

Potentially:

```text
services/api/src/routes/watch.routes.js
```

if it calls watcher behavior that assumes automatic suggestions.

---

# Implementation Safety Rules for Step 1.3

## Rule 1

Do not remove explicit suggestion functionality.

## Rule 2

Do not change action preview or execution behavior.

## Rule 3

Keep old pipeline function if tests or compatibility need it, but stop using it from ingestion paths.

## Rule 4

Update tests to reflect new intended behavior.

## Rule 5

If frontend expects `automation.suggestions`, return `0` or omit only after compatibility review.

---

# Step 1.2 Due Diligence

## Architecture consistency

```text
PASS
```

The boundary follows Phase 0 module rules.

## Runtime compatibility

```text
PASS WITH WATCHPOINT
```

Compatibility risk exists around response fields and tests expecting suggestions.

## Safety consistency

```text
PASS
```

No execution behavior is changed.

## Implementation readiness

```text
PASS
```

The project can proceed to Step 1.3.

---

# Result

```text
Step 1.2 passes due diligence.
```

The project can proceed to:

```text
Step 1.3 — Split Knowledge Pipeline from Planning Pipeline
```

This will be the first meaningful Phase 1 runtime code change.
