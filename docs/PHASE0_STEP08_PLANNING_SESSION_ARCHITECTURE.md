# Phase 0 — Step 0.8 Planning Session Architecture

## Status

```text
COMPLETE
```

## Objective

Define the official Planning Session architecture for EverythingAI so file organization becomes user-controlled, grouped, reviewable, explainable, auditable, and safe.

This document is part of **Improvement Project One**.

---

# Core Planning Principle

Planning is not execution.

Planning is the process of generating proposed organization actions.

Execution is the process of applying approved validated actions.

Correct flow:

```text
User starts planning
  ↓
Planning Session created
  ↓
Files analyzed
  ↓
Suggestions generated
  ↓
User reviews suggestions
  ↓
Previews are created
  ↓
User approves previews
  ↓
Execution layer applies approved actions
```

---

# Permanent Safety Rule

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

Planning must never be silently triggered by watcher activity or normal ingestion.

---

# Why Planning Sessions Are Required

The current MVP stores organization suggestions individually.

That works for a simple MVP, but it is not enough for a real planning workflow.

Planning sessions are required for:

```text
- grouping suggestions
- reviewing a full plan
- comparing plan versions
- tracking planning settings
- bulk approval
- rollback reasoning
- auditability
- planning history
- stale/invalidation handling
- provider vs deterministic comparison
```

---

# Main Planning Concepts

## 1. Planning Session

A user-controlled planning run.

Represents:

```text
- who started planning
- what source/folder/scope was planned
- what settings were used
- current status
- generated suggestions
- created previews
- execution history
```

---

## 2. Planning Batch

A subset of files inside a session.

Useful for:

```text
- large folder scans
- paginated planning
- async workers
- retries
- partial planning completion
```

---

## 3. Planning Snapshot

A frozen view of file metadata/content context used during planning.

Purpose:

```text
- prevent stale planning ambiguity
- explain why a suggestion was made
- compare old/new plans
- invalidate suggestions when files change
```

---

## 4. Planning Suggestion

A proposed organization action.

Examples:

```text
- tag file as invoice
- categorize file as financial
- rename file to supplier-invoice-2026.pdf
- move file to finance/
```

A suggestion does not mean the action is safe or executable.

---

## 5. Action Preview

A validated simulation of a suggested action.

Preview checks:

```text
- path safety
- target conflicts
- allowed action type
- confidence threshold
- policy rules
- approval requirements
```

---

## 6. Execution Batch

A group of approved previews executed together.

Useful for:

```text
- bulk execution
- progress tracking
- partial failure handling
- undo planning
```

---

# Planning Session Contract

```ts
export type PlanningSession = {
  planningSessionId: string;
  sourceRootId?: string | null;
  folderPath?: string | null;
  status: PlanningSessionStatus;
  createdBy?: string | null;
  provider?: string | null;
  mode: 'deterministic' | 'provider' | 'hybrid';
  settings: PlanningSettings;
  summary?: PlanningSessionSummary;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};
```

---

# Planning Session Status

```ts
export type PlanningSessionStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'ready'
  | 'partially_ready'
  | 'failed'
  | 'cancelled'
  | 'approved'
  | 'executed'
  | 'archived';
```

---

# Planning Settings Contract

```ts
export type PlanningSettings = {
  allowRename: boolean;
  allowMove: boolean;
  allowTag: boolean;
  allowCategory: boolean;
  dryRunOnly: boolean;
  requireApproval: boolean;
  confidenceThreshold: number;
  useProvider: boolean;
  provider?: string | null;
  includeContent: boolean;
  includeInsights: boolean;
  includeEntities: boolean;
  includeFolderStructure: boolean;
};
```

---

# Planning Session Summary Contract

```ts
export type PlanningSessionSummary = {
  totalFilesAnalyzed: number;
  totalSuggestions: number;
  totalRenameSuggestions: number;
  totalMoveSuggestions: number;
  totalTagSuggestions: number;
  totalCategorySuggestions: number;
  readyPreviews: number;
  blockedPreviews: number;
  averageConfidence?: number | null;
  highRiskSuggestions: number;
};
```

---

# Planning Batch Contract

```ts
export type PlanningBatch = {
  planningBatchId: string;
  planningSessionId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  fileIds: string[];
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};
```

---

# Planning Snapshot Contract

```ts
export type PlanningSnapshot = {
  planningSnapshotId: string;
  planningSessionId: string;
  fileId: string;
  filename: string;
  absolutePath: string;
  relativePath: string;
  extension: string;
  sizeBytes?: number | null;
  contentHash?: string | null;
  extractionStatus?: string | null;
  insightStatus?: string | null;
  summary?: string | null;
  classification?: string | null;
  entities?: Record<string, unknown>;
  textSample?: string | null;
  capturedAt: string;
};
```

---

# Planning Suggestion Contract

```ts
export type PlanningSuggestion = {
  suggestionId: string;
  planningSessionId: string;
  planningBatchId?: string | null;
  fileId: string;
  actionType: 'tag' | 'category' | 'rename' | 'move';
  currentValue?: string | null;
  suggestedValue: string;
  reason: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  source: 'deterministic' | 'provider' | 'hybrid' | 'manual';
  status: 'proposed' | 'accepted' | 'rejected' | 'converted_to_preview' | 'superseded' | 'invalidated';
  requiresApproval: boolean;
  createdAt: string;
};
```

---

# Execution Batch Contract

```ts
export type ExecutionBatch = {
  executionBatchId: string;
  planningSessionId: string;
  status: 'draft' | 'approved' | 'running' | 'completed' | 'partially_failed' | 'failed' | 'cancelled';
  previewIds: string[];
  totalActions: number;
  completedActions: number;
  failedActions: number;
  createdAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
};
```

---

# Planning Inputs

Planning may use:

```text
- filename
- extension
- absolute path
- relative path
- folder structure
- file metadata
- content hash
- extracted text
- text sample
- summary
- classification
- entities
- labels/categories
- duplicate groups
```

Planning should prefer high-confidence context but degrade gracefully when content is unavailable.

---

# Planning Modes

## deterministic

Uses local rules only.

Best for:

```text
- offline use
- fast planning
- predictable results
- testability
```

## provider

Uses configured AI provider.

Best for:

```text
- deeper content understanding
- better naming suggestions
- relationship-aware planning
```

## hybrid

Uses deterministic rules and provider assistance.

Recommended default long-term.

---

# Planning Flow

## Step 1 — User starts planning

```text
POST /api/planning/sessions
```

Creates a planning session.

---

## Step 2 — System captures planning snapshot

The system freezes relevant context for each selected file.

---

## Step 3 — Planning engine generates suggestions

Suggestions are generated based on session settings.

---

## Step 4 — User reviews suggestions

User can accept/reject/edit suggestions.

---

## Step 5 — Previews are created

Only accepted suggestions are converted into previews.

---

## Step 6 — User approves previews

Approval is explicit.

---

## Step 7 — Execution layer executes approved previews

Planning does not execute anything directly.

---

# Planning API Target

Future target endpoints:

```text
POST /api/planning/sessions
GET /api/planning/sessions
GET /api/planning/sessions/:sessionId
POST /api/planning/sessions/:sessionId/run
POST /api/planning/suggestions/:suggestionId/accept
POST /api/planning/suggestions/:suggestionId/reject
POST /api/planning/sessions/:sessionId/previews
POST /api/planning/sessions/:sessionId/execution-batches
```

Existing MVP endpoints may remain as compatibility wrappers:

```text
POST /api/suggestions
POST /api/action-previews
POST /api/action-executions
```

---

# Planning Safety Rules

## Rule 1 — Planning is user initiated

Planning starts only after explicit user action.

---

## Rule 2 — Planning does not modify files

Planning can only generate suggestions.

---

## Rule 3 — Planning must honor settings

If `allowMove = false`, planning must not create move suggestions.

If `allowRename = false`, planning must not create rename suggestions.

If confidence is below threshold, suggestion should be blocked or omitted according to settings.

---

## Rule 4 — Provider failure must not break planning

If provider planning fails, deterministic fallback may be used when allowed.

---

## Rule 5 — Planning context must be explainable

Each suggestion must include a clear reason.

---

## Rule 6 — Stale planning must be invalidated

If file content/path changes after planning snapshot:

```text
suggestion → invalidated
preview → invalidated
```

---

# Planning and Retrieval Relationship

Planning should use retrieval context but must not own retrieval.

Correct dependency:

```text
Planning Service
  ↓
Retrieval Service / Knowledge Access Router
```

Incorrect dependency:

```text
Planning directly queries vector DB
Planning directly performs custom document search
```

---

# Planning and Execution Relationship

Planning never executes.

Correct dependency:

```text
PlanningSuggestion
  ↓
ActionPreview
  ↓
ActionExecution
```

Forbidden:

```text
PlanningSuggestion
  ↓
Filesystem rename/move
```

---

# MVP Mapping

Current MVP table:

```text
organization_suggestions
```

Current MVP routes:

```text
POST /api/suggestions
GET /api/suggestions
POST /api/action-previews
POST /api/action-executions
```

Current MVP planning engine:

```text
services/api/src/suggestions/suggestionService.js
services/api/src/integrations/organizor/organizationRules.js
```

Future target:

```text
planning_sessions
planning_batches
planning_snapshots
organization_suggestions linked to session
execution_batches
```

---

# Known MVP Gaps

## Gap 1 — No PlanningSession table yet

Suggestions are not grouped into sessions.

Future fix:

```text
planning_sessions
```

---

## Gap 2 — No PlanningSnapshot yet

The system cannot fully explain which file context was used at planning time.

Future fix:

```text
planning_snapshots
```

---

## Gap 3 — Planning can be indirectly triggered by automation pipeline

Current local automation pipeline may generate suggestions.

Future fix:

```text
separate ingestion pipeline from planning pipeline
```

---

## Gap 4 — Backend planning settings are not fully enforced

Future fix:

```text
PlanningSettings enforcement
```

---

## Gap 5 — No batch approval/execution model yet

Future fix:

```text
ExecutionBatch
```

---

# Recommended Future Module Structure

```text
services/api/src/planning/planningSessionService.js
services/api/src/planning/planningEngine.js
services/api/src/planning/planningSnapshotService.js
services/api/src/planning/planningSettingsPolicy.js
services/api/src/planning/planningFallbackService.js
services/api/src/routes/planning.routes.js
services/api/src/repositories/planningRepository.js
```

Recommended future contracts:

```text
services/api/src/contracts/planning.contracts.js
services/api/src/contracts/executionBatch.contracts.js
```

Recommended future tests:

```text
services/api/test/planningSession.test.js
services/api/test/planningSettingsPolicy.test.js
services/api/test/planningInvalidation.test.js
services/api/test/planningFallback.test.js
```

---

# Step 0.8 Due Diligence

## Architecture consistency

```text
PASS
```

## Planning/execution separation

```text
PASS
```

## Safety consistency

```text
PASS
```

## Modularity consistency

```text
PASS
```

## Future phase compatibility

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
Step 0.8 passes due diligence.
```

The project can proceed to:

```text
Step 0.9 — Define Job Layer Abstraction
```
